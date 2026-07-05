import { describe, expect, it } from "vitest";
import { nationalCounty, searchCounties } from "../server/config/nationalCounties";
import { resolveCounty } from "../server/config/counties";

describe("national county dataset", () => {
  it("covers every US county", () => {
    // ~3,144 counties + DC + territories.
    const harris = nationalCounty("48201");
    expect(harris).toBeDefined();
    expect(harris!.name).toMatch(/harris/i);
    expect(harris!.state).toBe("TX");
    // Harris County population is ~4.8M.
    expect(harris!.population).toBeGreaterThan(4_600_000);
    expect(harris!.population).toBeLessThan(5_100_000);
  });

  it("has the largest counties with correct scale", () => {
    const la = nationalCounty("06037");
    expect(la).toBeDefined();
    expect(la!.name).toMatch(/los angeles/i);
    expect(la!.population).toBeGreaterThan(9_000_000);

    const cook = nationalCounty("17031");
    expect(cook).toBeDefined();
    expect(cook!.name).toMatch(/cook/i);
    expect(cook!.population).toBeGreaterThan(4_000_000);
  });

  it("returns undefined for a nonexistent FIPS", () => {
    expect(nationalCounty("99999")).toBeUndefined();
    expect(nationalCounty("")).toBeUndefined();
  });

  it("uses the 65-and-over count as the vulnerability proxy", () => {
    const harris = nationalCounty("48201")!;
    expect(harris.vulnerablePopulation).toBeGreaterThan(0);
    expect(harris.vulnerablePopulation).toBeLessThan(harris.population);
    // Seniors are a minority of the population everywhere.
    expect(harris.vulnerablePopulation / harris.population).toBeLessThan(0.5);
  });
});

describe("searchCounties", () => {
  it("ranks an exact base-name match first", () => {
    const results = searchCounties("travis");
    expect(results.length).toBeGreaterThan(0);
    const travisTx = results.find((c) => c.fips === "48453");
    expect(travisTx).toBeDefined();
    // Travis County, TX (Austin) is the most populous "Travis" — appears at top.
    expect(results[0].fips).toBe("48453");
  });

  it("honors a ', ST' state suffix", () => {
    const results = searchCounties("harris, tx");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].fips).toBe("48201");
    // Every result must be in Texas.
    expect(results.every((c) => c.state === "TX")).toBe(true);
  });

  it("matches on a prefix", () => {
    const results = searchCounties("san franc");
    expect(results.some((c) => c.fips === "06075")).toBe(true);
  });

  it("returns nothing for a too-short or bare-'county' query", () => {
    expect(searchCounties("a")).toEqual([]);
    expect(searchCounties("county")).toEqual([]);
  });

  it("respects the limit", () => {
    expect(searchCounties("a", 5)).toEqual([]);
    const many = searchCounties("san", 3);
    expect(many.length).toBeLessThanOrEqual(3);
  });
});

describe("resolveCounty fallthrough to national data", () => {
  it("keeps curated data winning for curated FIPS", () => {
    const harris = resolveCounty("48201");
    expect(harris).toBeDefined();
    // The curated Harris carries hand-tuned gauge sites; the national row does not.
    expect(harris!.usgsSiteIds).toBeDefined();
    expect(harris!.usgsSiteIds!.length).toBeGreaterThan(0);
  });

  it("resolves a non-curated county from the national registry", () => {
    const la = resolveCounty("06037");
    expect(la).toBeDefined();
    expect(la!.name).toMatch(/los angeles/i);
    // Not a curated entry, so no gauge sites.
    expect(la!.usgsSiteIds).toBeUndefined();
  });

  it("resolves a non-curated county by name", () => {
    const travis = resolveCounty("travis, tx");
    expect(travis?.fips).toBe("48453");
  });
});

describe("searchCounties performance", () => {
  it("returns quickly when warm", () => {
    searchCounties("harris"); // warm the index
    const start = performance.now();
    for (let i = 0; i < 20; i++) searchCounties("san");
    const perCall = (performance.now() - start) / 20;
    expect(perCall).toBeLessThan(50);
  });
});
