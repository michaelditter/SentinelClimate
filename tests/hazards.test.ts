// New-hazard-feed risk scoring (earthquakes, wildfires, tropical, hospital
// strain). Per-feed parser tests are impractical without recorded payloads, so
// this suite exercises the engine tiers and the rules-engine narratives with
// synthetic signals built by the fixture factories.

import { describe, expect, it } from "vitest";
import type { OsintSnapshot } from "@shared/intelligence";
import { computeRiskScore } from "../server/allocation/engine";
import { runRulesAnalysis } from "../server/agents/rulesEngine";
import {
  absurdSnapshot,
  floodSnapshot,
  makeHospitalCapacity,
  makeQuake,
  makeTropicalSystem,
  makeWildfire,
  quietSnapshot,
  severeHeatSnapshot,
} from "./fixtures";

describe("backwards compatibility — snapshots without the new optional fields", () => {
  // Baseline scores captured by running computeRiskScore BEFORE the
  // hazard-feed drivers were added (2026-07-02). Old snapshots that lack the
  // optional earthquakes/wildfires/tropical/hospitalCapacity fields must keep
  // scoring exactly what they scored then.
  it("quiet snapshot still scores 0 / other", () => {
    const { riskScore, hazardType, drivers } = computeRiskScore(quietSnapshot());
    expect(riskScore).toBe(0);
    expect(hazardType).toBe("other");
    expect(drivers).toEqual([]);
  });

  it("severe heat snapshot still scores 95 / extreme_heat", () => {
    const { riskScore, hazardType } = computeRiskScore(severeHeatSnapshot());
    expect(riskScore).toBe(95);
    expect(hazardType).toBe("extreme_heat");
  });

  it("flood snapshot still scores 60 / flood", () => {
    const { riskScore, hazardType } = computeRiskScore(floodSnapshot());
    expect(riskScore).toBe(60);
    expect(hazardType).toBe("flood");
  });

  it("maxed-out snapshot still clamps to 100", () => {
    expect(computeRiskScore(absurdSnapshot()).riskScore).toBe(100);
  });

  it("explicit empty extension fields behave identically to absent ones", () => {
    const withEmpty: OsintSnapshot = {
      ...severeHeatSnapshot(),
      earthquakes: [],
      wildfires: [],
      tropical: [],
      hospitalCapacity: null,
    };
    expect(computeRiskScore(withEmpty)).toEqual(computeRiskScore(severeHeatSnapshot()));
  });
});

describe("earthquake driver tiers (within 100 km)", () => {
  const withQuakes = (...quakes: Parameters<typeof makeQuake>[0][]): OsintSnapshot => ({
    ...quietSnapshot(),
    earthquakes: quakes.map((q) => makeQuake(q)),
  });

  it("M>=6 within 100 km adds 25", () => {
    const { riskScore, drivers } = computeRiskScore(withQuakes({ magnitude: 6.2, distanceKm: 40 }));
    expect(riskScore).toBe(25);
    expect(drivers.some((d) => d.includes("M6.2 earthquake") && d.includes("(+25)"))).toBe(true);
  });

  it("M>=5 within 100 km adds 15", () => {
    expect(computeRiskScore(withQuakes({ magnitude: 5.4, distanceKm: 90 })).riskScore).toBe(15);
  });

  it("M>=4.5 within 100 km adds 8", () => {
    expect(computeRiskScore(withQuakes({ magnitude: 4.7, distanceKm: 99 })).riskScore).toBe(8);
  });

  it("M<4.5 contributes nothing even when close", () => {
    expect(computeRiskScore(withQuakes({ magnitude: 4.4, distanceKm: 10 })).riskScore).toBe(0);
  });

  it("a strong quake beyond 100 km contributes nothing", () => {
    expect(computeRiskScore(withQuakes({ magnitude: 6.5, distanceKm: 120 })).riskScore).toBe(0);
  });

  it("null magnitude or null distance contributes nothing (data honesty)", () => {
    expect(
      computeRiskScore(
        withQuakes({ magnitude: null, distanceKm: 10 }, { magnitude: 6.0, distanceKm: null }),
      ).riskScore,
    ).toBe(0);
  });

  it("only the largest qualifying quake scores — aftershocks do not stack", () => {
    const { riskScore } = computeRiskScore(
      withQuakes({ magnitude: 6.2, distanceKm: 40 }, { magnitude: 5.1, distanceKm: 20 }),
    );
    expect(riskScore).toBe(25); // not 40
  });

  it("a dominant quake resolves hazardType to 'other' but keeps the driver string", () => {
    // Documented choice: the HazardType enum has no earthquake member, so the
    // quake candidate competes as "other" (generic demand rates). The driver
    // string preserves the seismic specifics for narratives and audit.
    const { hazardType, drivers } = computeRiskScore(withQuakes({ magnitude: 6.2, distanceKm: 40 }));
    expect(hazardType).toBe("other");
    expect(drivers.some((d) => /M6\.2 earthquake 40 km away .*\(\+25\)/.test(d))).toBe(true);
  });
});

describe("wildfire driver tiers (within 150 km)", () => {
  const withFires = (...fires: Parameters<typeof makeWildfire>[0][]): OsintSnapshot => ({
    ...quietSnapshot(),
    wildfires: fires.map((f) => makeWildfire(f)),
  });

  it("under-50%-contained fire of 10,000+ acres adds 18 and sets hazardType wildfire", () => {
    const { riskScore, hazardType, drivers } = computeRiskScore(
      withFires({ acres: 12_000, containmentPct: 30, distanceKm: 100 }),
    );
    expect(riskScore).toBe(18);
    expect(hazardType).toBe("wildfire");
    expect(drivers.some((d) => d.includes("Sam Houston Complex") && d.includes("(+18)"))).toBe(true);
  });

  it("1,000+ acre fire adds 10 regardless of containment", () => {
    expect(
      computeRiskScore(withFires({ acres: 5_000, containmentPct: 80, distanceKm: 100 })).riskScore,
    ).toBe(10);
  });

  it("any active fire under 25 km adds 8", () => {
    expect(
      computeRiskScore(withFires({ acres: 200, containmentPct: 90, distanceKm: 10 })).riskScore,
    ).toBe(8);
  });

  it("null containment is unknown, not <50% — a 12,000-acre fire scores the acreage tier (10)", () => {
    // Data honesty: we never assume an unreported containment is low.
    expect(
      computeRiskScore(withFires({ acres: 12_000, containmentPct: null, distanceKm: 100 })).riskScore,
    ).toBe(10);
  });

  it("a small, distant, mostly-contained fire contributes nothing", () => {
    expect(
      computeRiskScore(withFires({ acres: 500, containmentPct: 90, distanceKm: 60 })).riskScore,
    ).toBe(0);
  });

  it("fires beyond 150 km contribute nothing", () => {
    expect(
      computeRiskScore(withFires({ acres: 50_000, containmentPct: 5, distanceKm: 200 })).riskScore,
    ).toBe(0);
  });

  it("only the strongest fire scores — multiple incidents do not stack", () => {
    const { riskScore } = computeRiskScore(
      withFires(
        { acres: 12_000, containmentPct: 30, distanceKm: 100 },
        { acres: 200, containmentPct: 90, distanceKm: 10 },
      ),
    );
    expect(riskScore).toBe(18); // not 26
  });
});

describe("tropical system driver tiers", () => {
  const withStorms = (
    ...storms: Parameters<typeof makeTropicalSystem>[0][]
  ): OsintSnapshot => ({
    ...quietSnapshot(),
    tropical: storms.map((t) => makeTropicalSystem(t)),
  });

  it("system within 500 km adds 20 and sets hazardType hurricane", () => {
    const { riskScore, hazardType, drivers } = computeRiskScore(withStorms({ distanceKm: 400 }));
    expect(riskScore).toBe(20);
    expect(hazardType).toBe("hurricane");
    expect(drivers.some((d) => d.includes("Hurricane Ophelia") && d.includes("(+20)"))).toBe(true);
  });

  it("system within 1,000 km adds 10", () => {
    expect(computeRiskScore(withStorms({ distanceKm: 800 })).riskScore).toBe(10);
  });

  it("system beyond 1,000 km (basin-rule inclusion) contributes nothing", () => {
    expect(computeRiskScore(withStorms({ distanceKm: 1_500 })).riskScore).toBe(0);
  });

  it("only the strongest system scores", () => {
    const { riskScore } = computeRiskScore(
      withStorms({ distanceKm: 400 }, { id: "al062026", name: "Philippe", distanceKm: 800 }),
    );
    expect(riskScore).toBe(20); // not 30
  });
});

describe("hospital strain amplifier", () => {
  const withHospital = (
    overrides: Parameters<typeof makeHospitalCapacity>[0],
  ): OsintSnapshot => ({
    ...quietSnapshot(),
    hospitalCapacity: makeHospitalCapacity(overrides),
  });

  it("inpatient >=90% adds 12", () => {
    const { riskScore, drivers } = computeRiskScore(
      withHospital({ inpatientOccupancyPct: 92.1, icuOccupancyPct: 70 }),
    );
    expect(riskScore).toBe(12);
    expect(drivers.some((d) => d.includes("92.1%") && d.includes("(+12)"))).toBe(true);
  });

  it("ICU >=85% adds 12 even with moderate inpatient occupancy", () => {
    expect(
      computeRiskScore(withHospital({ inpatientOccupancyPct: 70, icuOccupancyPct: 87.4 })).riskScore,
    ).toBe(12);
  });

  it("inpatient >=80% adds 6", () => {
    expect(
      computeRiskScore(withHospital({ inpatientOccupancyPct: 82, icuOccupancyPct: 60 })).riskScore,
    ).toBe(6);
  });

  it("ICU >=75% adds 6", () => {
    expect(
      computeRiskScore(withHospital({ inpatientOccupancyPct: 60, icuOccupancyPct: 76 })).riskScore,
    ).toBe(6);
  });

  it("occupancy below both thresholds contributes nothing", () => {
    expect(
      computeRiskScore(withHospital({ inpatientOccupancyPct: 79, icuOccupancyPct: 74 })).riskScore,
    ).toBe(0);
  });

  it("null occupancy values contribute nothing (data honesty)", () => {
    expect(
      computeRiskScore(withHospital({ inpatientOccupancyPct: null, icuOccupancyPct: null })).riskScore,
    ).toBe(0);
  });

  it("never sets hazardType even when it is the only nonzero driver", () => {
    const { riskScore, hazardType } = computeRiskScore(
      withHospital({ inpatientOccupancyPct: 95, icuOccupancyPct: 90 }),
    );
    expect(riskScore).toBe(12);
    expect(hazardType).toBe("other");
  });

  it("never outcompetes a real hazard for hazardType despite contributing more points", () => {
    // Forecast high of 96°F contributes just 3 points as an extreme_heat
    // candidate; hospital strain contributes 12 as an amplifier. hazardType
    // must still be extreme_heat.
    const snapshot: OsintSnapshot = {
      ...quietSnapshot(),
      weather: {
        temperatureF: 88,
        heatIndexF: 90,
        conditions: "Hot",
        forecastHighsF: [96, 94, 93],
      },
      hospitalCapacity: makeHospitalCapacity({ inpatientOccupancyPct: 95, icuOccupancyPct: 90 }),
    };
    const { riskScore, hazardType } = computeRiskScore(snapshot);
    expect(riskScore).toBe(15); // 3 forecast heat + 12 hospital
    expect(hazardType).toBe("extreme_heat");
  });
});

describe("hazardType competition with the new drivers", () => {
  it("an established flood signal beats a qualifying earthquake on points", () => {
    // Flood snapshot: alert 30+15 pts (flood candidate 45) + gauge 15;
    // quake adds 25 but 45 > 25, so hazardType stays flood.
    const snapshot: OsintSnapshot = {
      ...floodSnapshot(),
      earthquakes: [makeQuake({ magnitude: 6.2, distanceKm: 40 })],
    };
    const { riskScore, hazardType } = computeRiskScore(snapshot);
    expect(riskScore).toBe(85); // 60 baseline + 25 quake
    expect(hazardType).toBe("flood");
  });

  it("a close tropical system beats a nearby small fire", () => {
    const snapshot: OsintSnapshot = {
      ...quietSnapshot(),
      tropical: [makeTropicalSystem({ distanceKm: 400 })],
      wildfires: [makeWildfire({ acres: 200, containmentPct: 90, distanceKm: 10 })],
    };
    const { riskScore, hazardType } = computeRiskScore(snapshot);
    expect(riskScore).toBe(28); // 20 tropical + 8 fire
    expect(hazardType).toBe("hurricane");
  });

  it("all new drivers stack in the total while the clamp holds at 100", () => {
    const snapshot: OsintSnapshot = {
      ...absurdSnapshot(),
      earthquakes: [makeQuake({ magnitude: 7.0, distanceKm: 20 })],
      wildfires: [makeWildfire({ acres: 100_000, containmentPct: 5, distanceKm: 30 })],
      tropical: [makeTropicalSystem({ distanceKm: 100 })],
      hospitalCapacity: makeHospitalCapacity({ inpatientOccupancyPct: 99, icuOccupancyPct: 99 }),
    };
    const { riskScore } = computeRiskScore(snapshot);
    expect(riskScore).toBe(100);
  });
});

describe("rules-engine narratives for the new signals", () => {
  const loadedSnapshot = (): OsintSnapshot => ({
    ...quietSnapshot(),
    earthquakes: [makeQuake({ magnitude: 6.2, distanceKm: 40 })],
    wildfires: [makeWildfire({ acres: 12_000, containmentPct: 30, distanceKm: 100 })],
    tropical: [makeTropicalSystem({ distanceKm: 400 })],
    hospitalCapacity: makeHospitalCapacity({ inpatientOccupancyPct: 92.1, icuOccupancyPct: 87.4 }),
  });

  it("SENTINEL keyFindings mention every new signal with real numbers", () => {
    const result = runRulesAnalysis(loadedSnapshot());
    const sentinel = result.agents.find((a) => a.agent === "SENTINEL")!;
    const text = sentinel.keyFindings.join(" | ");
    expect(text).toMatch(/M6\.2/);
    expect(text).toMatch(/Sam Houston Complex/);
    expect(text).toMatch(/12,000 acres/);
    expect(text).toMatch(/Hurricane Ophelia/);
    expect(text).toMatch(/92\.1%/);
    expect(text).toMatch(/87\.4%/);
  });

  it("MEDIC folds hospital strain into its narrative with the actual occupancy", () => {
    const result = runRulesAnalysis(loadedSnapshot());
    const medic = result.agents.find((a) => a.agent === "MEDIC")!;
    const text = [medic.summary, ...medic.keyFindings].join(" | ");
    expect(text).toMatch(/92\.1%/);
    expect(text).toMatch(/87\.4%/);
    expect(text).toMatch(/strain/i);
  });

  it("MEDIC reports normal occupancy without a strain warning", () => {
    const snapshot: OsintSnapshot = {
      ...quietSnapshot(),
      hospitalCapacity: makeHospitalCapacity({
        inpatientOccupancyPct: 65.2,
        icuOccupancyPct: 58.9,
      }),
    };
    const medic = runRulesAnalysis(snapshot).agents.find((a) => a.agent === "MEDIC")!;
    const text = medic.keyFindings.join(" | ");
    expect(text).toMatch(/65\.2%/);
    expect(text).not.toMatch(/strained/i);
  });

  it("DISPATCHER notes earthquake, wildfire, and tropical resource implications", () => {
    const result = runRulesAnalysis(loadedSnapshot());
    const dispatcher = result.agents.find((a) => a.agent === "DISPATCHER")!;
    const text = dispatcher.keyFindings.join(" | ");
    expect(text).toMatch(/M6\.2/);
    expect(text).toMatch(/search-and-rescue/);
    expect(text).toMatch(/Sam Houston Complex/);
    expect(text).toMatch(/respiratory/);
    expect(text).toMatch(/Hurricane Ophelia/);
    expect(text).toMatch(/shelter/i);
  });

  it("narratives stay silent about signals that are absent", () => {
    const result = runRulesAnalysis(quietSnapshot());
    const allText = result.agents
      .map((a) => [a.summary, ...a.keyFindings, ...a.recommendations].join(" "))
      .join(" ");
    expect(allText).not.toMatch(/earthquake/i);
    expect(allText).not.toMatch(/wildfire/i);
    expect(allText).not.toMatch(/tropical/i);
  });
});
