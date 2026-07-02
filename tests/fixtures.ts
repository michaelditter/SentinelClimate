// Synthetic OsintSnapshot fixtures for the allocation-engine and rules-engine
// suites. Deliberately hand-built (no network) so the tests are deterministic.

import type {
  CountyRef,
  OsintSnapshot,
  SourceStatus,
} from "@shared/intelligence";

export const HARRIS: CountyRef = {
  fips: "48201",
  name: "Harris",
  state: "TX",
  population: 4_731_145,
  vulnerablePopulation: 830_000,
  lat: 29.76,
  lon: -95.37,
};

export const JEFFERSON: CountyRef = {
  fips: "48245",
  name: "Jefferson",
  state: "TX",
  population: 256_526,
  vulnerablePopulation: 52_000,
  lat: 29.85,
  lon: -94.15,
};

const COLLECTED_AT = "2026-07-01T18:00:00.000Z";

const SOURCE_NAMES = ["NWS", "USGS", "OpenFEMA", "EIA", "AirNow", "CDC"];

/** First `liveCount` sources report live, the rest unavailable. */
export function makeSources(liveCount: number, total = 6): SourceStatus[] {
  return SOURCE_NAMES.slice(0, total).map((source, i) => ({
    source,
    state: i < liveCount ? ("live" as const) : ("unavailable" as const),
    fetchedAt: COLLECTED_AT,
    detail: i < liveCount ? undefined : "no API key configured",
  }));
}

/** No hazards, healthy grid, clean air, every source live. */
export function quietSnapshot(county: CountyRef = HARRIS): OsintSnapshot {
  return {
    county,
    collectedAt: COLLECTED_AT,
    sources: makeSources(6),
    hazards: [],
    weather: {
      temperatureF: 78,
      heatIndexF: 80,
      conditions: "Partly cloudy",
      forecastHighsF: [81, 82, 80],
    },
    grid: {
      demandMW: 52_000,
      capacityMW: 82_000,
      reserveMarginPct: 18.2,
      stress: "normal",
    },
    airQuality: { aqi: 42, category: "Good", pollutant: "O3" },
    floodGauges: [],
    activeDeclarations: [],
  };
}

/** Harris under an extreme, immediate Excessive Heat Warning; heat index 109F. */
export function severeHeatSnapshot(): OsintSnapshot {
  return {
    ...quietSnapshot(HARRIS),
    hazards: [
      {
        type: "extreme_heat",
        headline: "Excessive Heat Warning",
        severity: "extreme",
        urgency: "immediate",
        certainty: "Observed",
        areas: ["Harris County"],
        onset: "2026-07-01T12:00:00.000Z",
        expires: "2026-07-03T00:00:00.000Z",
        source: "NWS",
      },
    ],
    weather: {
      temperatureF: 104,
      heatIndexF: 109,
      conditions: "Sunny and dangerously hot",
      forecastHighsF: [105, 106, 104],
    },
    grid: {
      demandMW: 78_500,
      capacityMW: 82_000,
      reserveMarginPct: 4.3,
      stress: "elevated",
    },
  };
}

/** Jefferson under a severe Flash Flood Warning with a gauge at 25,000 cfs. */
export function floodSnapshot(): OsintSnapshot {
  return {
    ...quietSnapshot(JEFFERSON),
    hazards: [
      {
        type: "flood",
        headline: "Flash Flood Warning",
        severity: "severe",
        urgency: "immediate",
        certainty: "Likely",
        areas: ["Jefferson County"],
        onset: "2026-07-01T15:00:00.000Z",
        expires: "2026-07-02T06:00:00.000Z",
        source: "NWS",
      },
    ],
    weather: {
      temperatureF: 82,
      heatIndexF: 88,
      conditions: "Heavy rain",
      forecastHighsF: [84, 85, 83],
    },
    floodGauges: [
      {
        siteId: "08041000",
        siteName: "Neches River at Beaumont",
        gageHeightFt: 21.4,
        dischargeCfs: 25_000,
      },
    ],
  };
}

/** Every signal maxed at once — used to prove the risk score clamps at 100. */
export function absurdSnapshot(): OsintSnapshot {
  return {
    county: HARRIS,
    collectedAt: COLLECTED_AT,
    sources: makeSources(6),
    hazards: [
      {
        type: "extreme_heat",
        headline: "Excessive Heat Warning",
        severity: "extreme",
        urgency: "immediate",
        certainty: "Observed",
        areas: ["Harris County"],
        source: "NWS",
      },
      {
        type: "flood",
        headline: "Flash Flood Emergency",
        severity: "extreme",
        urgency: "immediate",
        certainty: "Observed",
        areas: ["Harris County"],
        source: "NWS",
      },
      {
        type: "hurricane",
        headline: "Hurricane Warning",
        severity: "extreme",
        urgency: "immediate",
        certainty: "Observed",
        areas: ["Harris County"],
        source: "NWS",
      },
      {
        type: "grid_emergency",
        headline: "Energy Emergency Alert 3",
        severity: "extreme",
        urgency: "immediate",
        certainty: "Observed",
        areas: ["Harris County"],
        source: "EIA",
      },
    ],
    weather: {
      temperatureF: 121,
      heatIndexF: 135,
      conditions: "Extreme heat",
      forecastHighsF: [130, 131, 132],
    },
    grid: {
      demandMW: 90_000,
      capacityMW: 90_500,
      reserveMarginPct: 0.5,
      stress: "critical",
    },
    airQuality: { aqi: 480, category: "Hazardous", pollutant: "PM2.5" },
    floodGauges: [
      {
        siteId: "08074000",
        siteName: "Buffalo Bayou at Houston",
        gageHeightFt: 45.0,
        dischargeCfs: 250_000,
      },
    ],
    activeDeclarations: [
      {
        id: "DR-9999-TX",
        declarationType: "DR",
        incidentType: "Hurricane",
        title: "Texas Hurricane and Flooding",
        state: "TX",
        declaredAt: COLLECTED_AT,
        designatedArea: "Harris (County)",
      },
    ],
  };
}
