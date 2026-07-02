// Orchestrates a full crisis assessment for one county:
// resolve county → collect OSINT snapshot → analyze (Claude agents when
// ANTHROPIC_API_KEY is set, deterministic rules otherwise) → allocate.
// The allocation is ALWAYS the deterministic engine, in both modes — the AI
// agents inform, the engine allocates.

import Anthropic from "@anthropic-ai/sdk";
import type {
  AgentName,
  AgentReport,
  AnalysisMode,
  CountyRef,
  CrisisAssessment,
  CrisisDecision,
  RiskLevel,
} from "../../shared/intelligence";
import { DECISION_DISCLAIMER } from "../../shared/intelligence";
import { resolveCounty } from "../config/counties";
import { collectOsintSnapshot } from "../osint/collector";
import { computeRiskScore, planAllocation } from "../allocation/engine";
import { getInventory } from "../allocation/inventory";
import { dataCompleteness, runRulesAnalysis } from "./rulesEngine";
import { AGENT_PROMPTS } from "./prompts";

export class CountyNotFoundError extends Error {
  status = 404;
  constructor(idOrFips: string) {
    super(`Unknown county: "${idOrFips}". Use a registered FIPS code or county name (see /api/counties/registry).`);
    this.name = "CountyNotFoundError";
  }
}

const AGENT_ORDER: AgentName[] = ["SENTINEL", "MEDIC", "DISPATCHER", "COMMANDER"];
const AGENT_TIMEOUT_MS = 60_000;
const CACHE_TTL_MS = 5 * 60 * 1000;

// Completed assessments cached per county so UI polling can't burn tokens.
const assessmentCache = new Map<string, { at: number; assessment: CrisisAssessment }>();

// Concurrent cache-miss requests for the same county share one pipeline run —
// otherwise a burst each launches its own full 4-agent Claude chain.
const inFlight = new Map<string, Promise<CrisisAssessment>>();

const RISK_LEVELS: RiskLevel[] = ["monitor", "elevated", "deploy", "emergency"];

interface ParsedAgentOutput {
  summary: string;
  riskLevel: RiskLevel;
  keyFindings: string[];
  recommendations: string[];
}

/** Defensive JSON extraction: strip markdown fences, slice first '{' to last '}'. */
function parseAgentJson(raw: string): ParsedAgentOutput {
  const text = raw.replace(/```(?:json)?/gi, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("No JSON object found in agent response");
  }
  const parsed = JSON.parse(text.slice(start, end + 1));
  if (
    typeof parsed.summary !== "string" ||
    !RISK_LEVELS.includes(parsed.riskLevel) ||
    !Array.isArray(parsed.keyFindings) ||
    !Array.isArray(parsed.recommendations)
  ) {
    throw new Error("Agent response missing required fields");
  }
  return {
    summary: parsed.summary,
    riskLevel: parsed.riskLevel as RiskLevel,
    keyFindings: parsed.keyFindings.map((f: unknown) => String(f)),
    recommendations: parsed.recommendations.map((r: unknown) => String(r)),
  };
}

async function runAiAgent(
  client: Anthropic,
  model: string,
  agent: AgentName,
  payload: unknown,
  confidence: number,
): Promise<AgentReport> {
  // No temperature/thinking params — keeps the call compatible across models.
  const response = await client.messages.create(
    {
      model,
      max_tokens: 1500,
      system: AGENT_PROMPTS[agent],
      messages: [{ role: "user", content: JSON.stringify(payload) }],
    },
    { timeout: AGENT_TIMEOUT_MS },
  );

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Agent response contained no text block");
  }
  const parsed = parseAgentJson(block.text);

  return {
    agent,
    mode: "ai",
    summary: parsed.summary,
    riskLevel: parsed.riskLevel,
    // Data completeness, same basis as rules mode — never an invented number.
    confidence,
    keyFindings: parsed.keyFindings,
    recommendations: parsed.recommendations,
  };
}

export async function runCrisisAnalysis(
  countyIdOrFips: string,
  forceRefresh = false,
): Promise<CrisisAssessment> {
  const county = resolveCounty(countyIdOrFips);
  if (!county) throw new CountyNotFoundError(countyIdOrFips);

  const cached = assessmentCache.get(county.fips);
  if (!forceRefresh && cached && Date.now() - cached.at < CACHE_TTL_MS) {
    // Honestly labeled: the UI can tell a cache hit from a fresh run.
    return { ...cached.assessment, cached: true };
  }

  const pending = inFlight.get(county.fips);
  if (pending) return pending;

  const run = executeAnalysis(county).finally(() => inFlight.delete(county.fips));
  inFlight.set(county.fips, run);
  return run;
}

async function executeAnalysis(county: CountyRef): Promise<CrisisAssessment> {
  const snapshot = await collectOsintSnapshot(county);
  const { riskScore, hazardType, drivers } = computeRiskScore(snapshot);
  const allocation = planAllocation(snapshot, riskScore, hazardType);
  const rules = runRulesAnalysis(snapshot);

  let agents: AgentReport[] = rules.agents;
  let decision: CrisisDecision = rules.decision;
  let mode: AnalysisMode = "rules";
  let model: string | undefined;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    model = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";
    // Client constructed lazily per analysis, never at module scope.
    // maxRetries: 0 — the per-agent catch already falls back to the rules
    // report, so SDK retries only triple the worst-case latency.
    const client = new Anthropic({ apiKey, maxRetries: 0 });
    const confidence = dataCompleteness(snapshot);
    const inventory = getInventory(county);

    const completed: AgentReport[] = [];
    for (const name of AGENT_ORDER) {
      const payload: Record<string, unknown> = {
        county,
        snapshot,
        riskScore,
        hazardType,
        riskDrivers: drivers,
        priorAgentReports: completed,
      };
      if (name === "DISPATCHER") {
        payload.inventory = inventory;
        payload.allocationPlan = allocation;
      }
      try {
        completed.push(await runAiAgent(client, model, name, payload, confidence));
      } catch (err) {
        // A partial AI failure (API error, bad JSON, timeout) must never fail
        // the request — substitute that agent's deterministic report. But a
        // silent swallow hides a misconfigured key forever, so log it.
        console.error(`[orchestrator] AI agent ${name} failed, falling back to rules:`, err);
        const fallback = rules.agents.find((a) => a.agent === name);
        if (fallback) completed.push(fallback);
      }
    }

    agents = completed;
    mode = completed.some((a) => a.mode === "ai") ? "ai" : "rules";

    // The go/no-go thresholds stay deterministic; COMMANDER's AI analysis
    // informs the rationale but never overrides the engine's action.
    const commander = completed.find((a) => a.agent === "COMMANDER");
    if (commander && commander.mode === "ai") {
      decision = {
        action: rules.decision.action,
        rationale: `${commander.summary} [Deterministic threshold check: risk ${riskScore}/100 → ${rules.decision.action}]`,
        reviewRequired: true,
      };
    }
  }

  const assessment: CrisisAssessment = {
    id: `ca-${Date.now().toString(36)}`,
    generatedAt: new Date().toISOString(),
    mode,
    county,
    snapshot,
    agents,
    allocation,
    decision: { ...decision, reviewRequired: true },
    disclaimer: DECISION_DISCLAIMER,
  };
  if (mode === "ai" && model) assessment.model = model;

  assessmentCache.set(county.fips, { at: Date.now(), assessment });
  return assessment;
}
