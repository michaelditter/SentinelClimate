// Shared contracts for the OSINT → multi-agent → allocation pipeline.
// Server modules and client components both import from here so the data
// shapes cannot drift apart.

// ---------------------------------------------------------------------------
// Data-source provenance — every snapshot says exactly which feeds were live.
// ---------------------------------------------------------------------------

export type SourceState = "live" | "degraded" | "unavailable";

export interface SourceStatus {
  source: string;
  state: SourceState;
  fetchedAt: string;
  detail?: string;
}

// ---------------------------------------------------------------------------
// Hazards and observations
// ---------------------------------------------------------------------------

export type HazardType =
  | "extreme_heat"
  | "flood"
  | "hurricane"
  | "tornado"
  | "winter_storm"
  | "wildfire"
  | "grid_emergency"
  | "air_quality"
  | "other";

export interface HazardSignal {
  type: HazardType;
  headline: string;
  severity: "minor" | "moderate" | "severe" | "extreme";
  urgency: "past" | "future" | "expected" | "immediate";
  certainty: string;
  areas: string[];
  onset?: string;
  expires?: string;
  source: string;
}

export interface WeatherSummary {
  temperatureF: number | null;
  heatIndexF: number | null;
  conditions: string | null;
  forecastHighsF: number[];
}

export interface GridSummary {
  demandMW: number | null;
  capacityMW: number | null;
  reserveMarginPct: number | null;
  stress: "normal" | "elevated" | "critical" | "unknown";
}

export interface AirQualitySummary {
  aqi: number | null;
  category: string | null;
  pollutant: string | null;
}

export interface FloodGaugeReading {
  siteId: string;
  siteName: string;
  gageHeightFt: number | null;
  dischargeCfs: number | null;
}

export interface DisasterDeclaration {
  id: string;
  declarationType: string;
  incidentType: string;
  title: string;
  state: string;
  declaredAt: string;
  designatedArea?: string;
}

export interface CountyRef {
  fips: string;
  name: string;
  state: string;
  population: number;
  vulnerablePopulation: number;
  lat: number;
  lon: number;
  nwsZone?: string;
  usgsSiteIds?: string[];
  /** EIA-930 respondent code for hourly grid demand (e.g. "TEX", "MISO"). Overrides the state-based default. */
  gridRespondent?: string;
}

export interface OsintSnapshot {
  county: CountyRef;
  collectedAt: string;
  sources: SourceStatus[];
  hazards: HazardSignal[];
  weather: WeatherSummary | null;
  grid: GridSummary | null;
  airQuality: AirQualitySummary | null;
  floodGauges: FloodGaugeReading[];
  activeDeclarations: DisasterDeclaration[];
}

// ---------------------------------------------------------------------------
// Multi-agent analysis
// ---------------------------------------------------------------------------

export type AgentName = "SENTINEL" | "MEDIC" | "DISPATCHER" | "COMMANDER";

/** "ai" = Claude-generated analysis; "rules" = deterministic fallback engine. */
export type AnalysisMode = "ai" | "rules";

export type RiskLevel = "monitor" | "elevated" | "deploy" | "emergency";

export interface AgentReport {
  agent: AgentName;
  mode: AnalysisMode;
  summary: string;
  riskLevel: RiskLevel;
  /** 0–1. In rules mode this is derived from data completeness, not invented. */
  confidence: number;
  keyFindings: string[];
  recommendations: string[];
}

// ---------------------------------------------------------------------------
// Resource allocation
// ---------------------------------------------------------------------------

export type ResourceKind =
  | "cooling_center"
  | "shelter"
  | "ambulance"
  | "high_water_vehicle"
  | "medical_team"
  | "hospital_beds"
  | "generator"
  | "water_supply"
  | "outreach_team";

export interface ResourceInventoryItem {
  kind: ResourceKind;
  label: string;
  available: number;
  unit: string;
}

export interface AllocationLine {
  resource: ResourceKind;
  label: string;
  allocated: number;
  unit: string;
  targetArea: string;
  rationale: string;
}

export interface UnmetNeed {
  resource: ResourceKind;
  shortfall: number;
  unit: string;
  mitigation: string;
}

export interface AllocationPlan {
  hazardType: HazardType;
  /** 0–100 composite risk score the demand model was driven by. */
  riskScore: number;
  demand: Partial<Record<ResourceKind, number>>;
  allocations: AllocationLine[];
  unmetNeed: UnmetNeed[];
  assumptions: string[];
}

// ---------------------------------------------------------------------------
// Final assessment returned by POST /api/agents/analyze
// ---------------------------------------------------------------------------

export interface CrisisDecision {
  action: "MONITOR" | "DEPLOY" | "EMERGENCY";
  rationale: string;
  /** Always true — a human emergency manager must approve any deployment. */
  reviewRequired: boolean;
}

export interface CrisisAssessment {
  id: string;
  generatedAt: string;
  mode: AnalysisMode;
  /** Model id when mode === "ai". */
  model?: string;
  /** True when served from the per-county cache rather than a fresh pipeline run. */
  cached?: boolean;
  county: CountyRef;
  snapshot: OsintSnapshot;
  agents: AgentReport[];
  allocation: AllocationPlan;
  decision: CrisisDecision;
  disclaimer: string;
}

export const DECISION_DISCLAIMER =
  "Decision-support output generated from public OSINT feeds. It does not " +
  "replace official emergency management judgment; a qualified human must " +
  "review before any resource is deployed.";
