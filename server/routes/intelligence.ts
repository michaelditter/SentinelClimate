// Intelligence-pipeline routes. Registered from server/routes.ts via
// registerIntelligenceRoutes(app). Errors return {error} JSON only — never a
// stack trace.

import type { Express, Response } from "express";
import { COUNTIES, resolveCounty } from "../config/counties";
import { collectOsintSnapshot } from "../osint/collector";
import { computeRiskScore, planAllocation } from "../allocation/engine";
import { runCrisisAnalysis } from "../agents/orchestrator";

function errorStatus(err: unknown): number {
  if (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    typeof (err as { status: unknown }).status === "number"
  ) {
    return (err as { status: number }).status;
  }
  return 500;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Internal server error";
}

// Minimal in-memory per-IP throttle for the expensive analysis endpoints —
// they hit five external APIs and (in AI mode) four Claude calls per run.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 10;
const requestLog = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX_REQUESTS) {
    requestLog.set(ip, recent);
    return true;
  }
  recent.push(now);
  requestLog.set(ip, recent);
  // Bound the map so a scanner can't grow it without limit.
  if (requestLog.size > 10_000) requestLog.clear();
  return false;
}

export function registerIntelligenceRoutes(app: Express): void {
  app.get("/api/system/health", (_req, res) => {
    // Deliberately no per-key configuration breakdown: this is an
    // unauthenticated endpoint and the key inventory is reconnaissance data.
    res.json({
      status: "ok",
      mode: process.env.ANTHROPIC_API_KEY ? "ai" : "rules",
      uptime: process.uptime(),
    });
  });

  app.get("/api/counties/registry", (_req, res) => {
    res.json(COUNTIES);
  });

  app.get("/api/osint/snapshot/:county", async (req, res) => {
    const county = resolveCounty(req.params.county);
    if (!county) {
      res.status(404).json({ error: `Unknown county: "${req.params.county}"` });
      return;
    }
    try {
      res.json(await collectOsintSnapshot(county));
    } catch (err) {
      res.status(500).json({ error: errorMessage(err) });
    }
  });

  async function analyze(
    countyId: unknown,
    res: Response,
    ip: string,
    forceRefresh = false,
  ): Promise<void> {
    if (rateLimited(ip)) {
      res.status(429).json({ error: "Too many analysis requests — try again in a minute" });
      return;
    }
    if (typeof countyId !== "string" || countyId.trim() === "") {
      res.status(400).json({ error: "Request must include a county name or FIPS code" });
      return;
    }
    try {
      res.json(await runCrisisAnalysis(countyId, forceRefresh));
    } catch (err) {
      res.status(errorStatus(err)).json({ error: errorMessage(err) });
    }
  }

  // The POST (the UI's Run button) is a deliberate user action — bypass the
  // 5-minute cache; concurrent runs still coalesce in the orchestrator.
  app.post("/api/agents/analyze", async (req, res) => {
    await analyze(req.body?.county, res, req.ip ?? "unknown", true);
  });

  // GET variant for easy manual testing (curl / browser) — served from cache.
  app.get("/api/agents/analyze/:county", async (req, res) => {
    await analyze(req.params.county, res, req.ip ?? "unknown");
  });

  // Fast path: snapshot + deterministic scoring/allocation, no LLM step.
  app.get("/api/allocation/plan/:county", async (req, res) => {
    const county = resolveCounty(req.params.county);
    if (!county) {
      res.status(404).json({ error: `Unknown county: "${req.params.county}"` });
      return;
    }
    try {
      const snapshot = await collectOsintSnapshot(county);
      const { riskScore, hazardType, drivers } = computeRiskScore(snapshot);
      const allocation = planAllocation(snapshot, riskScore, hazardType);
      res.json({ county, snapshot, riskScore, hazardType, drivers, allocation });
    } catch (err) {
      res.status(500).json({ error: errorMessage(err) });
    }
  });
}
