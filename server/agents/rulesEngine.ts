// Deterministic four-agent analysis (mode "rules") — the no-LLM fallback and
// the per-agent safety net for AI mode. Every finding is computed straight
// from snapshot data; confidence is data completeness, never invented.

import type {
  AgentReport,
  CrisisDecision,
  HazardType,
  OsintSnapshot,
  RiskLevel,
} from "../../shared/intelligence";
import { computeRiskScore } from "../allocation/engine";

// Aligned with the CrisisDecision ladder (<40 MONITOR, 40–69 DEPLOY,
// ≥70 EMERGENCY); "elevated" is the 25–39 approaching-threshold band.
export function riskLevelFor(riskScore: number): RiskLevel {
  if (riskScore < 25) return "monitor";
  if (riskScore < 40) return "elevated";
  if (riskScore < 70) return "deploy";
  return "emergency";
}

/** Fraction of OSINT sources reporting live (e.g. 3 of 6 live → 0.5). */
export function dataCompleteness(snapshot: OsintSnapshot): number {
  const total = snapshot.sources.length;
  if (total === 0) return 0;
  const live = snapshot.sources.filter((s) => s.state === "live").length;
  return Math.round((live / total) * 100) / 100;
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

const HAZARD_RESOURCE_HINTS: Record<HazardType, string> = {
  extreme_heat: "cooling centers, outreach teams, medical strike teams, and EMS surge",
  flood: "shelters, high-water vehicles, potable water, and EMS surge",
  hurricane: "shelters, high-water vehicles, generators, potable water, and medical teams",
  tornado: "shelters, EMS surge, medical teams, and hospital surge beds",
  winter_storm: "warming shelters, generators, outreach teams, and potable water",
  wildfire: "shelters, EMS surge, hospital surge beds (respiratory), and potable water",
  grid_emergency: "generators, cooling centers, and wellness-check outreach teams",
  air_quality: "clean-air centers, outreach teams, and hospital surge beds (respiratory)",
  other: "shelters, EMS surge, medical teams, and outreach teams",
};

function sentinelReport(
  snapshot: OsintSnapshot,
  riskScore: number,
  drivers: string[],
  riskLevel: RiskLevel,
  confidence: number,
): AgentReport {
  const county = snapshot.county;
  const keyFindings: string[] = [];

  for (const h of snapshot.hazards) {
    keyFindings.push(
      `${h.headline} (${h.severity} severity, ${h.urgency} urgency; source ${h.source})`,
    );
  }
  if (snapshot.weather) {
    const w = snapshot.weather;
    const bits: string[] = [];
    if (w.temperatureF !== null) bits.push(`temperature ${Math.round(w.temperatureF)}°F`);
    if (w.heatIndexF !== null) bits.push(`heat index ${Math.round(w.heatIndexF)}°F`);
    if (w.conditions) bits.push(w.conditions);
    if (bits.length > 0) keyFindings.push(`Current weather: ${bits.join(", ")}`);
    if (w.forecastHighsF.length > 0) {
      keyFindings.push(
        `Forecast highs next ${w.forecastHighsF.length} periods: ${w.forecastHighsF.map((t) => Math.round(t)).join("/")}°F`,
      );
    }
  }
  for (const g of snapshot.floodGauges) {
    const readings: string[] = [];
    if (g.gageHeightFt !== null) readings.push(`gage height ${g.gageHeightFt.toFixed(1)} ft`);
    if (g.dischargeCfs !== null) readings.push(`discharge ${fmt(g.dischargeCfs)} cfs`);
    if (readings.length > 0) {
      keyFindings.push(`USGS ${g.siteId} (${g.siteName}): ${readings.join(", ")}`);
    }
  }
  if (snapshot.grid) {
    const grid = snapshot.grid;
    const bits: string[] = [];
    if (grid.demandMW !== null && grid.capacityMW !== null) {
      bits.push(`demand ${fmt(grid.demandMW)} MW of ${fmt(grid.capacityMW)} MW capacity`);
    }
    if (grid.reserveMarginPct !== null) bits.push(`reserve margin ${grid.reserveMarginPct.toFixed(1)}%`);
    keyFindings.push(`Grid stress ${grid.stress}${bits.length > 0 ? ` (${bits.join(", ")})` : ""}`);
  }
  if (snapshot.airQuality?.aqi !== null && snapshot.airQuality?.aqi !== undefined) {
    const a = snapshot.airQuality;
    keyFindings.push(
      `AQI ${a.aqi}${a.category ? ` — ${a.category}` : ""}${a.pollutant ? ` (${a.pollutant})` : ""}`,
    );
  }
  if (snapshot.activeDeclarations.length > 0) {
    keyFindings.push(
      `${snapshot.activeDeclarations.length} active federal declaration(s): ${snapshot.activeDeclarations
        .map((d) => `${d.id} ${d.incidentType}`)
        .join("; ")}`,
    );
  }
  // Data honesty: surface every degraded/unavailable feed explicitly.
  for (const s of snapshot.sources) {
    if (s.state !== "live") {
      keyFindings.push(`Data gap: ${s.source} is ${s.state}${s.detail ? ` — ${s.detail}` : ""}`);
    }
  }
  if (keyFindings.length === 0) {
    keyFindings.push("No hazard, weather, gauge, grid, or air-quality signals in this snapshot.");
  }

  const recommendations =
    riskScore >= 50
      ? [
          "Increase OSINT polling cadence for the drivers above and watch for escalation.",
          "Verify degraded feeds through backup channels before relying on their absence of signal.",
          "Push threat picture to MEDIC and DISPATCHER for demand planning.",
        ]
      : [
          "Continue routine monitoring of all feeds.",
          "Re-run analysis if any driver escalates or a new NWS product is issued.",
        ];

  return {
    agent: "SENTINEL",
    mode: "rules",
    summary: `${county.name}, ${county.state}: composite risk ${riskScore}/100 (${riskLevel}). ${
      drivers.length > 0 ? `Drivers: ${drivers.join("; ")}` : "No contributing risk drivers detected."
    }`,
    riskLevel,
    confidence,
    keyFindings,
    recommendations,
  };
}

function medicReport(
  snapshot: OsintSnapshot,
  riskScore: number,
  hazardType: HazardType,
  riskLevel: RiskLevel,
  confidence: number,
): AgentReport {
  const county = snapshot.county;
  const keyFindings: string[] = [];
  const recommendations: string[] = [];
  const heatIndexF = snapshot.weather?.heatIndexF ?? null;

  if (heatIndexF !== null && heatIndexF > 103) {
    const surgePct = Math.round((heatIndexF - 103) * 8);
    keyFindings.push(
      `Estimated ED volume surge +${surgePct}% (planning heuristic: +8%/°F above 103°F heat index; current ${Math.round(heatIndexF)}°F).`,
    );
    keyFindings.push(
      "Heat-event multipliers: cardiovascular presentations ~2× baseline, renal/dialysis-dependent presentations ~1.5× baseline (planning heuristics).",
    );
    recommendations.push(
      "Alert hospital EDs to the projected surge and confirm dialysis centers have continuity plans.",
    );
    recommendations.push("Prioritize wellness checks on residents without air conditioning.");
  } else if (heatIndexF !== null && heatIndexF >= 95) {
    keyFindings.push(
      `Heat index ${Math.round(heatIndexF)}°F — below the 103°F ED-surge threshold; expect elevated but manageable heat-related volume.`,
    );
  }

  const stressedGauges = snapshot.floodGauges.filter(
    (g) =>
      (g.dischargeCfs !== null && g.dischargeCfs > 10_000) ||
      (g.gageHeightFt !== null && g.gageHeightFt > 20),
  );
  if (stressedGauges.length > 0 || hazardType === "flood" || hazardType === "hurricane") {
    for (const g of stressedGauges) {
      keyFindings.push(
        `Flood exposure: USGS ${g.siteId} (${g.siteName})${
          g.dischargeCfs !== null ? ` at ${fmt(g.dischargeCfs)} cfs` : ""
        }${g.gageHeightFt !== null ? `, gage height ${g.gageHeightFt.toFixed(1)} ft` : ""}.`,
      );
    }
    keyFindings.push(
      "Flood health risks: wound injuries during evacuation/cleanup, waterborne illness from contaminated floodwater, and carbon-monoxide poisoning from improvised generator use.",
    );
    recommendations.push(
      "Pre-stage tetanus boosters and wound-care supplies at shelters; issue CO-safety messaging with any generator distribution.",
    );
  }

  if (snapshot.grid?.stress === "critical" || snapshot.grid?.stress === "elevated") {
    keyFindings.push(
      `Grid stress ${snapshot.grid.stress}: power-dependent patients (home oxygen, dialysis, refrigerated medication) at elevated risk.`,
    );
    recommendations.push("Cross-reference utility medical-baseline registries for outage-priority restoration.");
  }

  const aqi = snapshot.airQuality?.aqi ?? null;
  if (aqi !== null && aqi > 150) {
    keyFindings.push(
      `AQI ${aqi}${snapshot.airQuality?.category ? ` (${snapshot.airQuality.category})` : ""}: expect elevated respiratory presentations (asthma, COPD).`,
    );
  }

  keyFindings.push(
    `Vulnerable population at risk: ${fmt(county.vulnerablePopulation)} of ${fmt(county.population)} residents (seniors, chronic conditions, housing without AC).`,
  );

  if (recommendations.length === 0) {
    recommendations.push("Maintain routine syndromic surveillance; no acute health-demand signal in this snapshot.");
  }

  return {
    agent: "MEDIC",
    mode: "rules",
    summary: `Health-demand outlook for ${county.name}: risk ${riskScore}/100 (${riskLevel}), primary hazard ${hazardType}. ${
      heatIndexF !== null && heatIndexF > 103
        ? `ED surge estimate +${Math.round((heatIndexF - 103) * 8)}% from heat index ${Math.round(heatIndexF)}°F.`
        : "No heat-driven ED surge threshold crossed."
    }`,
    riskLevel,
    confidence,
    keyFindings,
    recommendations,
  };
}

function dispatcherReport(
  snapshot: OsintSnapshot,
  riskScore: number,
  hazardType: HazardType,
  riskLevel: RiskLevel,
  confidence: number,
): AgentReport {
  const county = snapshot.county;
  const implied = HAZARD_RESOURCE_HINTS[hazardType];

  const keyFindings = [
    `Hazard type "${hazardType}" at risk ${riskScore}/100 implies demand for ${implied}.`,
    `Demand scale is set by ${fmt(county.vulnerablePopulation)} vulnerable residents (county population ${fmt(county.population)}).`,
    "Binding resource quantities come from the deterministic allocation engine (see the allocation block of this assessment / GET /api/allocation/plan/:county) — this desk summarizes what the risk level implies.",
  ];

  const recommendations =
    riskScore >= 40
      ? [
          `Stage ${implied} ahead of formal activation.`,
          "Confirm mutual-aid channels (state EOC, EMAC, Red Cross) are reachable for any shortfall in the allocation plan.",
          "Re-run the allocation plan after each new snapshot; demand scales with the risk score.",
        ]
      : [
          "No staging required at current risk; keep the resource inventory current.",
          "Re-run the allocation plan if the risk score approaches 40 (DEPLOY threshold).",
        ];

  return {
    agent: "DISPATCHER",
    mode: "rules",
    summary: `Resource implication for ${county.name}: ${riskLevel} posture — ${implied} at risk ${riskScore}/100. Deterministic engine output is the binding plan.`,
    riskLevel,
    confidence,
    keyFindings,
    recommendations,
  };
}

function commanderDecision(riskScore: number, drivers: string[]): CrisisDecision {
  const action: CrisisDecision["action"] =
    riskScore < 40 ? "MONITOR" : riskScore < 70 ? "DEPLOY" : "EMERGENCY";
  return {
    action,
    rationale: `Risk ${riskScore}/100 → ${action} (thresholds: <40 MONITOR, 40–69 DEPLOY, ≥70 EMERGENCY). ${
      drivers.length > 0 ? `Drivers: ${drivers.join("; ")}. ` : "No contributing risk drivers. "
    }A qualified emergency manager must review before any resource is deployed.`,
    reviewRequired: true,
  };
}

function commanderReport(
  snapshot: OsintSnapshot,
  riskScore: number,
  drivers: string[],
  decision: CrisisDecision,
  riskLevel: RiskLevel,
  confidence: number,
): AgentReport {
  return {
    agent: "COMMANDER",
    mode: "rules",
    summary: `${decision.action} posture for ${snapshot.county.name}, ${snapshot.county.state} at risk ${riskScore}/100. ${decision.rationale}`,
    riskLevel,
    confidence,
    keyFindings: [
      `Decision thresholds: <40 MONITOR, 40–69 DEPLOY, ≥70 EMERGENCY; current score ${riskScore}/100.`,
      ...(drivers.length > 0 ? drivers.map((d) => `Driver: ${d}`) : ["No contributing risk drivers detected."]),
      `Data completeness ${Math.round(confidence * 100)}% of sources live — treat missing feeds as unknowns, not all-clear.`,
    ],
    recommendations: [
      decision.action === "MONITOR"
        ? "Hold at monitoring posture; re-assess on the next snapshot."
        : `Convene the emergency-management review to approve or reject the ${decision.action} recommendation.`,
      "Human review is required before any deployment (reviewRequired is always true).",
    ],
  };
}

export function runRulesAnalysis(snapshot: OsintSnapshot): {
  agents: AgentReport[];
  decision: CrisisDecision;
  riskScore: number;
  hazardType: HazardType;
} {
  const { riskScore, hazardType, drivers } = computeRiskScore(snapshot);
  const riskLevel = riskLevelFor(riskScore);
  const confidence = dataCompleteness(snapshot);
  const decision = commanderDecision(riskScore, drivers);

  const agents: AgentReport[] = [
    sentinelReport(snapshot, riskScore, drivers, riskLevel, confidence),
    medicReport(snapshot, riskScore, hazardType, riskLevel, confidence),
    dispatcherReport(snapshot, riskScore, hazardType, riskLevel, confidence),
    commanderReport(snapshot, riskScore, drivers, decision, riskLevel, confidence),
  ];

  return { agents, decision, riskScore, hazardType };
}
