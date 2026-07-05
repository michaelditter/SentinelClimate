// National risk-board sweep — rules-engine screening across many counties.
// Deliberately NO LLM step: collectOsintSnapshot + computeRiskScore only, so a
// 30-county sweep costs zero Claude tokens and never touches the per-county
// assessment cache in the orchestrator. Data honesty carries through: every
// entry reports its live-source fraction and the top scoring driver verbatim.

import type {
  CountyRef,
  CrisisDecision,
  OsintSnapshot,
  RiskBoardEntry,
} from "../../shared/intelligence";
import { COUNTIES, resolveCounty } from "../config/counties";
import { collectOsintSnapshot } from "../osint/collector";
import { computeRiskScore } from "../allocation/engine";
import { riskLevelFor } from "../agents/rulesEngine";

/**
 * Decision-ladder action for a risk score. Built on rulesEngine.riskLevelFor
 * so the <40 MONITOR / 40–69 DEPLOY / ≥70 EMERGENCY thresholds live in exactly
 * one place ("monitor" and "elevated" are both below the DEPLOY line).
 */
export function actionForRisk(riskScore: number): CrisisDecision["action"] {
  const level = riskLevelFor(riskScore);
  if (level === "emergency") return "EMERGENCY";
  if (level === "deploy") return "DEPLOY";
  return "MONITOR";
}

// Major-metro FIPS codes screened alongside the curated registry. Resolution
// goes through resolveCounty — backed by the national county registry once it
// lands — and unresolvable codes are skipped, never invented.
const METRO_FIPS: string[] = [
  "06037", // Los Angeles, CA
  "06073", // San Diego, CA
  "06075", // San Francisco, CA
  "53033", // King, WA
  "41051", // Multnomah, OR
  "04019", // Pima, AZ
  "08031", // Denver, CO
  "48113", // Dallas, TX
  "48029", // Bexar, TX
  "48453", // Travis, TX
  "22071", // Orleans, LA
  "12057", // Hillsborough, FL
  "12011", // Broward, FL
  "13121", // Fulton, GA
  "37119", // Mecklenburg, NC
  "11001", // District of Columbia
  "36061", // New York, NY
  "42101", // Philadelphia, PA
  "25025", // Suffolk, MA
  "26163", // Wayne, MI
  "27053", // Hennepin, MN
  "29189", // St. Louis, MO
  "40109", // Oklahoma, OK
  "31055", // Douglas, NE
  "15003", // Honolulu, HI
];

function buildDefaultBoard(): CountyRef[] {
  const byFips = new Map<string, CountyRef>(COUNTIES.map((c) => [c.fips, c]));
  for (const fips of METRO_FIPS) {
    if (byFips.has(fips)) continue;
    const county = resolveCounty(fips);
    if (county) byFips.set(county.fips, county);
    // Unresolved fips are skipped: the national registry may not be deployed
    // yet, and a board row must never be fabricated from a bare FIPS code.
  }
  return Array.from(byFips.values());
}

/** Curated counties plus every major-metro FIPS the registry can resolve. */
export const DEFAULT_BOARD: CountyRef[] = buildDefaultBoard();

export type SnapshotFetcher = (county: CountyRef) => Promise<OsintSnapshot>;

/** Map one snapshot to a board row — pure, unit-testable. */
export function toBoardEntry(county: CountyRef, snapshot: OsintSnapshot): RiskBoardEntry {
  const { riskScore, hazardType, drivers } = computeRiskScore(snapshot);
  return {
    county,
    riskScore,
    hazardType,
    action: actionForRisk(riskScore),
    topDriver: drivers[0] ?? null,
    sourcesLive: snapshot.sources.filter((s) => s.state === "live").length,
    sourcesTotal: snapshot.sources.length,
    collectedAt: snapshot.collectedAt,
  };
}

// Minimal promise pool — no dependency. Spawns min(limit, items) workers that
// pull the next index until the list is exhausted.
async function promisePool<T, R>(
  items: T[],
  limit: number,
  run: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.max(1, Math.min(Math.floor(limit), items.length)) },
    async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        results[i] = await run(items[i]);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

// A full board sweep hits ~30 counties × 6 feeds, so the assembled result is
// cached for 10 minutes per distinct county set. Caching only applies to the
// real collector — injected fetchers (tests) always run fresh.
const BOARD_CACHE_TTL_MS = 10 * 60 * 1000;
const boardCache = new Map<string, { at: number; entries: RiskBoardEntry[] }>();

/**
 * Screen a set of counties with the deterministic rules engine and return
 * board rows sorted by risk score descending. Never calls the LLM pipeline.
 * `fetchSnapshot` is injectable for tests; the default is the live collector.
 */
export async function sweepCounties(
  counties: CountyRef[],
  concurrency = 4,
  fetchSnapshot: SnapshotFetcher = collectOsintSnapshot,
): Promise<RiskBoardEntry[]> {
  const key = counties
    .map((c) => c.fips)
    .sort()
    .join(",");
  const cacheable = fetchSnapshot === collectOsintSnapshot;
  if (cacheable) {
    const hit = boardCache.get(key);
    if (hit && Date.now() - hit.at < BOARD_CACHE_TTL_MS) return [...hit.entries];
  }

  const rows = await promisePool(counties, concurrency, async (county) => {
    try {
      return toBoardEntry(county, await fetchSnapshot(county));
    } catch (err) {
      // collectOsintSnapshot never throws; this guards injected fetchers so
      // one bad county cannot take down the whole board.
      console.error(`riskboard: sweep failed for ${county.fips}:`, err);
      return null;
    }
  });

  const entries = rows
    .filter((r): r is RiskBoardEntry => r !== null)
    .sort(
      (a, b) =>
        b.riskScore - a.riskScore || a.county.name.localeCompare(b.county.name),
    );

  if (cacheable) {
    // Bound the map so arbitrary ?counties= combinations can't grow it forever.
    if (boardCache.size > 100) boardCache.clear();
    boardCache.set(key, { at: Date.now(), entries });
  }
  return [...entries];
}
