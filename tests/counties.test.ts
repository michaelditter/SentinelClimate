import { describe, expect, it } from "vitest";
import { COUNTIES, resolveCounty } from "../server/config/counties";

describe("resolveCounty", () => {
  it("resolves Harris by FIPS code", () => {
    const county = resolveCounty("48201");
    expect(county).toBeDefined();
    expect(county!.fips).toBe("48201");
    expect(county!.name).toMatch(/harris/i);
  });

  it("resolves Harris by name id", () => {
    const county = resolveCounty("harris");
    expect(county).toBeDefined();
    expect(county!.fips).toBe("48201");
  });

  it("returns undefined for unknown ids", () => {
    expect(resolveCounty("atlantis")).toBeUndefined();
    expect(resolveCounty("00000")).toBeUndefined();
  });
});

describe("COUNTIES registry", () => {
  it("is non-empty", () => {
    expect(COUNTIES.length).toBeGreaterThan(0);
  });

  it("has unique 5-digit FIPS codes", () => {
    for (const county of COUNTIES) {
      expect(county.fips).toMatch(/^\d{5}$/);
    }
    expect(new Set(COUNTIES.map((c) => c.fips)).size).toBe(COUNTIES.length);
  });

  it("has valid coordinates and populations on every entry", () => {
    for (const county of COUNTIES) {
      expect(county.lat, `${county.name} lat`).toBeGreaterThan(-90);
      expect(county.lat, `${county.name} lat`).toBeLessThan(90);
      expect(county.lon, `${county.name} lon`).toBeGreaterThan(-180);
      expect(county.lon, `${county.name} lon`).toBeLessThan(180);
      // US counties: northern hemisphere, western longitudes
      expect(county.lat, `${county.name} lat`).toBeGreaterThan(0);
      expect(county.lon, `${county.name} lon`).toBeLessThan(0);
      expect(county.population, `${county.name} population`).toBeGreaterThan(0);
      expect(
        county.vulnerablePopulation,
        `${county.name} vulnerablePopulation`,
      ).toBeGreaterThanOrEqual(0);
      expect(
        county.vulnerablePopulation,
        `${county.name} vulnerablePopulation vs population`,
      ).toBeLessThanOrEqual(county.population);
    }
  });

  it("resolves every registry entry by its own FIPS", () => {
    for (const county of COUNTIES) {
      expect(resolveCounty(county.fips)?.fips).toBe(county.fips);
    }
  });
});
