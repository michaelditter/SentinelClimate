// Deterministic risk-scoring and resource-allocation core.
// Pure functions of their inputs: no I/O, no clock reads, no randomness —
// unit-testable and identical in "ai" and "rules" modes. The AI agents inform;
// this engine allocates.

import type {
  AllocationLine,
  AllocationPlan,
  CountyRef,
  HazardSignal,
  HazardType,
  OsintSnapshot,
  ResourceKind,
  UnmetNeed,
} from "../../shared/intelligence";
import { getInventory } from "./inventory";

const SEVERITY_WEIGHT: Record<HazardSignal["severity"], number> = {
  extreme: 40,
  severe: 30,
  moderate: 18,
  minor: 8,
};

const URGENCY_BONUS: Record<HazardSignal["urgency"], number> = {
  immediate: 15,
  expected: 8,
  future: 0,
  past: 0,
};

const URGENCY_RANK: Record<HazardSignal["urgency"], number> = {
  immediate: 3,
  expected: 2,
  future: 1,
  past: 0,
};

const FLOOD_DISCHARGE_CFS = 10_000;
const FLOOD_GAGE_HEIGHT_FT = 20;

function worstActiveHazard(snapshot: OsintSnapshot): HazardSignal | undefined {
  let worst: HazardSignal | undefined;
  for (const hazard of snapshot.hazards) {
    if (hazard.urgency === "past") continue;
    if (!worst) {
      worst = hazard;
      continue;
    }
    const delta =
      SEVERITY_WEIGHT[hazard.severity] - SEVERITY_WEIGHT[worst.severity];
    if (
      delta > 0 ||
      (delta === 0 && URGENCY_RANK[hazard.urgency] > URGENCY_RANK[worst.urgency])
    ) {
      worst = hazard;
    }
  }
  return worst;
}

function triggeringFloodGauge(snapshot: OsintSnapshot) {
  return snapshot.floodGauges.find(
    (g) =>
      (g.dischargeCfs !== null && g.dischargeCfs > FLOOD_DISCHARGE_CFS) ||
      (g.gageHeightFt !== null && g.gageHeightFt > FLOOD_GAGE_HEIGHT_FT),
  );
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

export function computeRiskScore(snapshot: OsintSnapshot): {
  riskScore: number;
  hazardType: HazardType;
  drivers: string[];
} {
  const drivers: string[] = [];
  let score = 0;

  const worst = worstActiveHazard(snapshot);
  if (worst) {
    const severityPts = SEVERITY_WEIGHT[worst.severity];
    score += severityPts;
    drivers.push(`${worst.headline} — ${worst.severity} severity (+${severityPts})`);

    const urgencyPts = URGENCY_BONUS[worst.urgency];
    if (urgencyPts > 0) {
      score += urgencyPts;
      drivers.push(`Hazard urgency "${worst.urgency}" (+${urgencyPts})`);
    }
  }

  const heatIndexF = snapshot.weather?.heatIndexF ?? null;
  let heatPts = 0;
  if (heatIndexF !== null) {
    if (heatIndexF >= 108) heatPts = 20;
    else if (heatIndexF >= 103) heatPts = 14;
    else if (heatIndexF >= 95) heatPts = 8;
  }
  if (heatPts > 0 && heatIndexF !== null) {
    score += heatPts;
    drivers.push(`Heat index ${Math.round(heatIndexF)}°F (+${heatPts})`);
  }

  // Forecast heat: the mission is pre-positioning resources before a
  // disruption peaks, so upcoming highs contribute even when current
  // conditions are calm (smaller weight than an observed heat index).
  const maxForecastHighF = snapshot.weather?.forecastHighsF?.length
    ? Math.max(...snapshot.weather.forecastHighsF)
    : null;
  let forecastHeatPts = 0;
  if (maxForecastHighF !== null) {
    if (maxForecastHighF >= 105) forecastHeatPts = 12;
    else if (maxForecastHighF >= 100) forecastHeatPts = 6;
    else if (maxForecastHighF >= 95) forecastHeatPts = 3;
  }
  if (forecastHeatPts > 0 && maxForecastHighF !== null) {
    score += forecastHeatPts;
    drivers.push(`Forecast high ${Math.round(maxForecastHighF)}°F within 5 days (+${forecastHeatPts})`);
  }

  const gauge = triggeringFloodGauge(snapshot);
  if (gauge) {
    score += 15;
    const readings: string[] = [];
    if (gauge.dischargeCfs !== null) readings.push(`discharge ${fmt(gauge.dischargeCfs)} cfs`);
    if (gauge.gageHeightFt !== null) readings.push(`gage height ${gauge.gageHeightFt.toFixed(1)} ft`);
    drivers.push(`USGS ${gauge.siteId} (${gauge.siteName}): ${readings.join(", ")} (+15)`);
  }

  const stress = snapshot.grid?.stress;
  let gridPts = 0;
  if (stress === "critical") gridPts = 15;
  else if (stress === "elevated") gridPts = 8;
  if (gridPts > 0) {
    score += gridPts;
    const margin = snapshot.grid?.reserveMarginPct;
    drivers.push(
      `Grid stress ${stress}${margin !== null && margin !== undefined ? ` — reserve margin ${margin.toFixed(1)}%` : ""} (+${gridPts})`,
    );
  }

  const aqi = snapshot.airQuality?.aqi ?? null;
  let aqiPts = 0;
  if (aqi !== null) {
    if (aqi > 200) aqiPts = 10;
    else if (aqi > 150) aqiPts = 6;
  }
  if (aqiPts > 0 && aqi !== null) {
    score += aqiPts;
    const category = snapshot.airQuality?.category;
    drivers.push(`AQI ${aqi}${category ? ` (${category})` : ""} (+${aqiPts})`);
  }

  if (snapshot.activeDeclarations.length > 0) {
    score += 10;
    const decl = snapshot.activeDeclarations[0];
    drivers.push(`Active federal declaration ${decl.id}: ${decl.title} (+10)`);
  }

  const riskScore = Math.max(0, Math.min(100, Math.round(score)));

  // Pick the hazard type by strongest signal. An active alert competes with
  // the observation-derived drivers on points — a minor unrelated advisory
  // (e.g. a Rip Current Statement mapped to "other") must not override a
  // 109°F heat index and zero out the cooling-center demand table.
  const worstPts = worst
    ? SEVERITY_WEIGHT[worst.severity] + URGENCY_BONUS[worst.urgency]
    : 0;
  const candidates: Array<[number, HazardType]> = [
    [worstPts, worst?.type ?? "other"],
    [Math.max(heatPts, forecastHeatPts), "extreme_heat"],
    [gauge ? 15 : 0, "flood"],
    [gridPts, "grid_emergency"],
    [aqiPts, "air_quality"],
  ];
  // Prefer a typed hazard over "other" on ties; otherwise highest points win.
  candidates.sort(
    (a, b) => b[0] - a[0] || (a[1] === "other" ? 1 : 0) - (b[1] === "other" ? 1 : 0),
  );
  const hazardType: HazardType = candidates[0][0] > 0 ? candidates[0][1] : "other";

  return { riskScore, hazardType, drivers };
}

// ---------------------------------------------------------------------------
// Demand model
// ---------------------------------------------------------------------------

// Units needed per 1,000 vulnerable residents at riskScore 100, by hazard.
// Anchors: 1 cooling center serves ~25k vulnerable residents at peak;
// flood shelter rate ≈ 10% displacement into 200-bed units (0.5 units/1k);
// 1 high-water vehicle per ~4k vulnerable residents in a peak flood.
const DEMAND_RATES: Record<HazardType, Partial<Record<ResourceKind, number>>> = {
  extreme_heat: {
    cooling_center: 0.04,
    outreach_team: 0.06,
    medical_team: 0.02,
    ambulance: 0.12,
    hospital_beds: 1.2,
    water_supply: 0.15,
    generator: 0.01,
  },
  flood: {
    shelter: 0.5,
    high_water_vehicle: 0.25,
    water_supply: 0.25,
    ambulance: 0.08,
    medical_team: 0.015,
    hospital_beds: 0.6,
    outreach_team: 0.02,
  },
  hurricane: {
    shelter: 0.6,
    high_water_vehicle: 0.25,
    water_supply: 0.3,
    generator: 0.05,
    ambulance: 0.1,
    medical_team: 0.02,
    hospital_beds: 0.8,
    outreach_team: 0.03,
  },
  tornado: {
    shelter: 0.2,
    ambulance: 0.15,
    medical_team: 0.03,
    hospital_beds: 1.0,
    generator: 0.03,
    outreach_team: 0.02,
  },
  winter_storm: {
    shelter: 0.15,
    generator: 0.06,
    outreach_team: 0.05,
    water_supply: 0.1,
    ambulance: 0.08,
    hospital_beds: 0.5,
    medical_team: 0.01,
  },
  wildfire: {
    shelter: 0.3,
    ambulance: 0.1,
    medical_team: 0.02,
    hospital_beds: 0.8,
    water_supply: 0.2,
    outreach_team: 0.03,
  },
  grid_emergency: {
    generator: 0.08,
    cooling_center: 0.03,
    outreach_team: 0.05,
    medical_team: 0.015,
    hospital_beds: 0.4,
    water_supply: 0.1,
  },
  air_quality: {
    cooling_center: 0.02, // cooling centers double as clean-air shelters
    outreach_team: 0.04,
    medical_team: 0.015,
    hospital_beds: 0.6,
    ambulance: 0.06,
  },
  other: {
    shelter: 0.05,
    ambulance: 0.05,
    medical_team: 0.01,
    outreach_team: 0.02,
    water_supply: 0.05,
  },
};

const LINE_PURPOSE: Record<ResourceKind, string> = {
  cooling_center: "Open cooling/clean-air sites for exposed residents",
  shelter: "Shelter displaced residents (200 beds per unit)",
  ambulance: "EMS surge coverage for excess 911 medical calls",
  high_water_vehicle: "High-water evacuation and swift-water rescue",
  medical_team: "Field medical strike teams for shelters and hotspots",
  hospital_beds: "Hospital surge beds for excess ED admissions",
  generator: "Backup power for critical facilities and power-dependent residents",
  water_supply: "Potable water distribution",
  outreach_team: "Door-to-door wellness checks on vulnerable residents",
};

const STATE_EM_CHANNEL: Record<string, string> = {
  TX: "TDEM State Operations Center",
  FL: "Florida SERT State EOC",
  AZ: "Arizona DEMA State EOC",
  IL: "Illinois IEMA State EOC",
  NV: "Nevada DEM State EOC",
};

function emChannel(county: CountyRef): string {
  return (
    STATE_EM_CHANNEL[county.state] ??
    `${county.state} state emergency management via EMAC`
  );
}

function mitigationFor(
  kind: ResourceKind,
  shortfall: number,
  county: CountyRef,
): string {
  const em = emChannel(county);
  switch (kind) {
    case "high_water_vehicle":
      return `Request ${shortfall} additional high-water vehicles via ${
        county.state === "TX" ? "STAR mutual aid / " : ""
      }${em}`;
    case "shelter":
      return `Request ${shortfall} additional shelter units (200 beds each) via American Red Cross and ${em}`;
    case "hospital_beds":
      return `Load-balance ${shortfall} beds of excess demand through regional healthcare-coalition patient transfers; escalate to ${em} if transfers saturate`;
    case "generator":
      return `Request ${shortfall} industrial generators via FEMA/USACE Emergency Power (ESF-3) through ${em}`;
    case "ambulance":
      return `Request ${shortfall} EMAC ambulance strike-team vehicles via ${em}`;
    case "medical_team":
      return `Request ${shortfall} medical teams (DMAT/state strike teams) via ${em}`;
    case "water_supply":
      return `Request ${shortfall} pallets/day of potable water via FEMA ESF-6 commodities through ${em}`;
    case "cooling_center":
      return `Open ${shortfall} supplemental cooling sites in schools/libraries through county OEM facility agreements`;
    case "outreach_team":
      return `Stand up ${shortfall} additional outreach teams from CERT volunteers and mutual-aid jurisdictions via county OEM`;
  }
}

/** Human-readable description of the live conditions driving demand. */
function describeConditions(snapshot: OsintSnapshot, riskScore: number): string {
  const worst = worstActiveHazard(snapshot);
  const quant: string[] = [];

  const heatIndexF = snapshot.weather?.heatIndexF;
  if (heatIndexF !== null && heatIndexF !== undefined && heatIndexF >= 95) {
    quant.push(`Heat index ${Math.round(heatIndexF)}°F`);
  }
  const gauge = triggeringFloodGauge(snapshot);
  if (gauge) {
    const reading =
      gauge.dischargeCfs !== null
        ? `${fmt(gauge.dischargeCfs)} cfs`
        : `${gauge.gageHeightFt?.toFixed(1)} ft`;
    quant.push(`${gauge.siteName} at ${reading}`);
  }
  const stress = snapshot.grid?.stress;
  if (stress === "critical" || stress === "elevated") {
    quant.push(`grid stress ${stress}`);
  }
  const aqi = snapshot.airQuality?.aqi;
  if (aqi !== null && aqi !== undefined && aqi > 150) {
    quant.push(`AQI ${aqi}`);
  }

  if (quant.length > 0 && worst) return `${quant.join(", ")} with ${worst.headline}`;
  if (worst) return worst.headline;
  if (quant.length > 0) return quant.join(", ");
  return `composite risk indicators (score ${riskScore}/100), no single acute signal`;
}

export function planAllocation(
  snapshot: OsintSnapshot,
  riskScore: number,
  hazardType: HazardType,
): AllocationPlan {
  const county = snapshot.county;
  const inventory = getInventory(county);
  const availableByKind = new Map(inventory.map((i) => [i.kind, i]));

  const rates = DEMAND_RATES[hazardType];
  const scale = riskScore / 100;
  const conditions = describeConditions(snapshot, riskScore);
  const vulnerable = fmt(county.vulnerablePopulation);
  const targetArea = `${county.name}, ${county.state} (county-wide)`;

  const demand: Partial<Record<ResourceKind, number>> = {};
  const allocations: AllocationLine[] = [];
  const unmetNeed: UnmetNeed[] = [];

  for (const [kind, rate] of Object.entries(rates) as Array<[ResourceKind, number]>) {
    const needed = Math.ceil((county.vulnerablePopulation / 1000) * rate * scale);
    if (needed <= 0) continue;
    demand[kind] = needed;

    const item = availableByKind.get(kind);
    const available = item?.available ?? 0;
    const allocated = Math.min(needed, available);

    if (allocated > 0 && item) {
      allocations.push({
        resource: kind,
        label: item.label,
        allocated,
        unit: item.unit,
        targetArea,
        rationale: `${LINE_PURPOSE[kind]} — ${conditions}; ${vulnerable} vulnerable residents; risk ${riskScore}/100`,
      });
    }
    if (needed > allocated && item) {
      unmetNeed.push({
        resource: kind,
        shortfall: needed - allocated,
        unit: item.unit,
        mitigation: mitigationFor(kind, needed - allocated, county),
      });
    }
  }

  const assumptions = [
    `Demand model: hazard-specific base rates for "${hazardType}" × risk ${riskScore}/100, applied to ${vulnerable} vulnerable residents (county population ${fmt(county.population)}).`,
    "Inventory is a planning-grade estimate scaled from county population; live EMS/hospital availability feeds are not yet connected.",
    "Shelter units are counted at 200 beds per unit; hospital availability counts only the 15% surge headroom over staffed beds.",
    "Allocations never exceed estimated available inventory; every shortfall is routed to a named mutual-aid channel in unmetNeed.",
    "Decision-support output only — a qualified emergency manager must approve any deployment.",
  ];

  return { hazardType, riskScore, demand, allocations, unmetNeed, assumptions };
}
