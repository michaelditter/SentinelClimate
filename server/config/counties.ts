// County registry for the OSINT → agents → allocation pipeline.
// Static reference data: FIPS, coordinates, population, vulnerable-population
// planning estimates, and USGS gauge site ids. Where a profile exists in
// countyProfiles.ts we reuse its name/state/population rather than restating.

import type { CountyRef } from "../../shared/intelligence";
import { countyProfiles } from "./countyProfiles";
import { nationalCounty, searchCounties } from "./nationalCounties";

const harris = countyProfiles["48201"];
const maricopa = countyProfiles["04013"];
const miamiDade = countyProfiles["12086"];
const clark = countyProfiles["32003"];

export const COUNTIES: CountyRef[] = [
  {
    fips: harris.fips,
    name: harris.name,
    state: harris.state,
    population: harris.population,
    // Seniors + chronic-condition + no-AC household overlap, planning estimate.
    vulnerablePopulation: 456000,
    lat: 29.7863,
    lon: -95.3889,
    // Buffalo Bayou gauges (Houston).
    usgsSiteIds: ["08074000", "08075000", "08074500"],
  },
  {
    fips: "48245",
    name: "Jefferson County",
    state: "TX",
    population: 256526,
    vulnerablePopulation: 52000,
    lat: 30.0802,
    lon: -94.1266,
    // Neches River near Beaumont — the East Texas flooding scenario.
    usgsSiteIds: ["08041780"],
    // Beaumont/Port Arthur is Entergy Texas territory — MISO, not ERCOT.
    gridRespondent: "MISO",
  },
  {
    fips: maricopa.fips,
    name: maricopa.name,
    state: maricopa.state,
    population: maricopa.population,
    vulnerablePopulation: 571000,
    lat: 33.4484,
    lon: -112.074,
  },
  {
    fips: "17031",
    name: "Cook County",
    state: "IL",
    population: 5275541,
    vulnerablePopulation: 750000,
    lat: 41.8781,
    lon: -87.6298,
  },
  {
    fips: miamiDade.fips,
    name: miamiDade.name,
    state: miamiDade.state,
    population: miamiDade.population,
    vulnerablePopulation: 486000,
    lat: 25.7617,
    lon: -80.1918,
  },
  {
    fips: clark.fips,
    name: clark.name,
    state: clark.state,
    population: clark.population,
    // Senior-population share from the county profile as a proxy until SVI data lands.
    vulnerablePopulation: Math.round(
      clark.population * clark.vulnerabilityFactors.seniorPopulation,
    ),
    lat: 36.1699,
    lon: -115.1398,
  },
];

// Full state names for the states in the registry, so "Harris County, Texas"
// resolves and "Jefferson County, Alabama" does not claim the TX county.
const STATE_NAMES: Record<string, string> = {
  TX: "texas",
  AZ: "arizona",
  IL: "illinois",
  FL: "florida",
  NV: "nevada",
};

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Look up a county by exact FIPS code or by its distinctive name.
 *
 * Resolution order:
 *   1. Curated FIPS (hand-tuned entries win for their codes).
 *   2. Curated name match (the six demo counties resolve without a FIPS).
 *   3. National FIPS (any of ~3,144 US counties).
 *   4. National name search (best single match, state-suffix aware).
 */
export function resolveCounty(idOrFips: string): CountyRef | undefined {
  const query = (idOrFips ?? "").trim().toLowerCase();
  if (!query) return undefined;

  const curatedByFips = COUNTIES.find((c) => c.fips === query);
  if (curatedByFips) return curatedByFips;

  // Match the distinctive part of the name ("harris", "miami-dade") as a
  // whole word, so "harris", "Harris County", and "Harris County, TX" all
  // resolve — but the generic word "county" or a sentence that merely
  // mentions one does not silently pick the first registry entry.
  const curatedByName = COUNTIES.find((c) => {
    const base = c.name.toLowerCase().replace(/\s+county$/, "");
    if (!new RegExp(`(^|[^a-z])${escapeRe(base)}([^a-z]|$)`).test(query)) return false;

    // If the query carries a ", <state>" suffix, it must be this county's state.
    const suffix = query.split(",").slice(1).join(",").trim();
    if (suffix) {
      const st = c.state.toLowerCase();
      const full = STATE_NAMES[c.state] ?? "";
      if (!(suffix === st || suffix.startsWith(st) || (full && suffix.startsWith(full)))) {
        return false;
      }
    }
    return true;
  });
  if (curatedByName) return curatedByName;

  // Fall through to the national registry: exact FIPS first, then the top
  // ranked name match.
  const nat = nationalCounty(query);
  if (nat) return nat;

  return searchCounties(query, 1)[0];
}
