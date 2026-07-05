// National county registry — every US county (~3,144) + territories, generated
// from the Census 2023 Gazetteer (geography) and ACS 5-year profile
// (population + 65-and-over count). See scripts/generateCounties.mjs to
// regenerate. The curated entries in counties.ts carry hand-tuned data (gauge
// sites, grid respondents, better vulnerability estimates) and always win for
// their FIPS codes; this registry backs everything else.

import type { CountyRef } from "../../shared/intelligence";
import rawCounties from "./nationalCounties.json";

interface RawCounty {
  fips: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
  population: number;
  seniors: number;
}

function toCountyRef(row: RawCounty): CountyRef {
  return {
    fips: row.fips,
    name: row.name,
    state: row.state,
    population: row.population,
    // 65-and-over count as the vulnerability proxy until SVI (Social
    // Vulnerability Index) data is integrated. Curated counties override this
    // with better estimates; national rows use the age-based floor.
    vulnerablePopulation: row.seniors,
    lat: row.lat,
    lon: row.lon,
  };
}

// Parse once, cache. The JSON import is bundled inline by esbuild/vite, so
// there is no filesystem read at runtime (works in the Vercel function).
const rows = rawCounties as RawCounty[];

let byFips: Map<string, CountyRef> | null = null;
let searchIndex: Array<{ ref: CountyRef; base: string }> | null = null;

function ensureIndexes(): void {
  if (byFips && searchIndex) return;
  byFips = new Map();
  searchIndex = [];
  for (const row of rows) {
    const ref = toCountyRef(row);
    byFips.set(ref.fips, ref);
    searchIndex.push({
      ref,
      base: ref.name.toLowerCase().replace(/\s+county$/, ""),
    });
  }
}

/** Look up a national county by exact FIPS code. */
export function nationalCounty(fips: string): CountyRef | undefined {
  ensureIndexes();
  return byFips!.get((fips ?? "").trim());
}

/**
 * Rank-ordered name search across all US counties. Handles "name" and
 * "name, ST" queries. Ranking: exact base-name match > prefix > substring,
 * population descending as a tiebreak.
 */
export function searchCounties(query: string, limit = 12): CountyRef[] {
  ensureIndexes();
  const q = (query ?? "").trim().toLowerCase();
  if (q.length < 2) return [];

  // Split an optional ", ST" (or ", state name") suffix off the query, then
  // strip a "county" suffix from the name part so "harris county" matches the
  // "harris" base. A bare "county" has no name to match and returns nothing.
  const parts = q.split(",");
  const nameBase = parts[0].trim().replace(/\s+county$/, "").trim();
  const statePart = parts.length > 1 ? parts.slice(1).join(",").trim() : "";
  if (nameBase.length < 2) return [];

  const scored: Array<{ ref: CountyRef; rank: number }> = [];
  for (const entry of searchIndex!) {
    if (statePart && isKnownState(statePart)) {
      const st = entry.ref.state.toLowerCase();
      const matchesState =
        st === statePart || statePart.startsWith(st) || STATE_FULL[st] === statePart;
      if (!matchesState) continue;
    }

    let rank = -1;
    if (entry.base === nameBase) rank = 0;
    else if (entry.base.startsWith(nameBase)) rank = 1;
    else if (entry.base.includes(nameBase)) rank = 2;

    if (rank >= 0) scored.push({ ref: entry.ref, rank });
  }

  scored.sort((a, b) => a.rank - b.rank || b.ref.population - a.ref.population);
  return scored.slice(0, Math.max(0, limit)).map((s) => s.ref);
}

// Minimal state lookup so a "county, <state>" query with a real state name is
// honored, while a garbage suffix still matches on the name alone.
const STATE_FULL: Record<string, string> = {
  al: "alabama", ak: "alaska", az: "arizona", ar: "arkansas", ca: "california",
  co: "colorado", ct: "connecticut", de: "delaware", fl: "florida", ga: "georgia",
  hi: "hawaii", id: "idaho", il: "illinois", in: "indiana", ia: "iowa",
  ks: "kansas", ky: "kentucky", la: "louisiana", me: "maine", md: "maryland",
  ma: "massachusetts", mi: "michigan", mn: "minnesota", ms: "mississippi",
  mo: "missouri", mt: "montana", ne: "nebraska", nv: "nevada", nh: "new hampshire",
  nj: "new jersey", nm: "new mexico", ny: "new york", nc: "north carolina",
  nd: "north dakota", oh: "ohio", ok: "oklahoma", or: "oregon", pa: "pennsylvania",
  ri: "rhode island", sc: "south carolina", sd: "south dakota", tn: "tennessee",
  tx: "texas", ut: "utah", vt: "vermont", va: "virginia", wa: "washington",
  wv: "west virginia", wi: "wisconsin", wy: "wyoming", dc: "district of columbia",
  pr: "puerto rico",
};

function isKnownState(s: string): boolean {
  return s.length === 2 ? s in STATE_FULL : Object.values(STATE_FULL).includes(s);
}
