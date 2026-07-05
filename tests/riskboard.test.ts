// Risk-board sweep + watchlist suites. Everything is synthetic: the snapshot
// fetcher is injected so no test ever touches the network.

import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CountyRef, OsintSnapshot } from "@shared/intelligence";
import { actionForRisk, sweepCounties, toBoardEntry } from "../server/riskboard/sweep";
import {
  addToWatchlist,
  getAlerts,
  getWatchlist,
  recordAlert,
  removeFromWatchlist,
  resetWatchlistForTests,
} from "../server/riskboard/watchlist";
import {
  HARRIS,
  JEFFERSON,
  absurdSnapshot,
  floodSnapshot,
  quietSnapshot,
  severeHeatSnapshot,
} from "./fixtures";

const COOK: CountyRef = {
  fips: "17031",
  name: "Cook",
  state: "IL",
  population: 5_275_541,
  vulnerablePopulation: 750_000,
  lat: 41.88,
  lon: -87.63,
};

/** Snapshot fetcher keyed by FIPS — throws on an unexpected county. */
function fakeFetcher(byFips: Record<string, OsintSnapshot>) {
  return async (county: CountyRef): Promise<OsintSnapshot> => {
    const snapshot = byFips[county.fips];
    if (!snapshot) throw new Error(`no fixture for ${county.fips}`);
    return snapshot;
  };
}

describe("actionForRisk", () => {
  it("applies the <40 MONITOR, 40-69 DEPLOY, >=70 EMERGENCY ladder", () => {
    expect(actionForRisk(0)).toBe("MONITOR");
    expect(actionForRisk(39)).toBe("MONITOR");
    expect(actionForRisk(40)).toBe("DEPLOY");
    expect(actionForRisk(69)).toBe("DEPLOY");
    expect(actionForRisk(70)).toBe("EMERGENCY");
    expect(actionForRisk(100)).toBe("EMERGENCY");
  });
});

describe("sweepCounties", () => {
  it("maps snapshots to board entries and sorts by risk score descending", async () => {
    const fetcher = fakeFetcher({
      [HARRIS.fips]: severeHeatSnapshot(),
      [JEFFERSON.fips]: floodSnapshot(),
      [COOK.fips]: quietSnapshot(COOK),
    });
    // Deliberately pass the quiet county first: the sort must reorder.
    const entries = await sweepCounties([COOK, HARRIS, JEFFERSON], 4, fetcher);

    expect(entries).toHaveLength(3);
    const scores = entries.map((e) => e.riskScore);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);

    // Quiet county: no drivers, MONITOR, all six fixture sources live.
    const quiet = entries.find((e) => e.county.fips === COOK.fips)!;
    expect(quiet.action).toBe("MONITOR");
    expect(quiet.topDriver).toBeNull();
    expect(quiet.sourcesLive).toBe(6);
    expect(quiet.sourcesTotal).toBe(6);
    expect(quiet.collectedAt).toBe(quietSnapshot(COOK).collectedAt);

    // Severe heat must rank first and escalate past MONITOR.
    expect(entries[0].county.fips).toBe(HARRIS.fips);
    expect(entries[0].action).not.toBe("MONITOR");
    expect(entries[0].hazardType).toBe("extreme_heat");
    expect(entries[0].topDriver).toContain("Excessive Heat Warning");

    // Every entry's action must agree with its own score and the ladder.
    for (const entry of entries) {
      expect(entry.action).toBe(actionForRisk(entry.riskScore));
    }
  });

  it("topDriver is the first computed driver, EMERGENCY at a maxed-out score", () => {
    const entry = toBoardEntry(HARRIS, absurdSnapshot());
    expect(entry.riskScore).toBe(100);
    expect(entry.action).toBe("EMERGENCY");
    expect(typeof entry.topDriver).toBe("string");
    expect(entry.topDriver!.length).toBeGreaterThan(0);
  });

  it("limits concurrent snapshot fetches to the pool size", async () => {
    const counties: CountyRef[] = Array.from({ length: 9 }, (_, i) => ({
      ...HARRIS,
      fips: String(90000 + i),
      name: `Synthetic County ${i}`,
    }));
    let inFlight = 0;
    let maxInFlight = 0;
    let calls = 0;
    const instrumented = async (county: CountyRef): Promise<OsintSnapshot> => {
      calls += 1;
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 15));
      inFlight -= 1;
      return quietSnapshot(county);
    };

    const entries = await sweepCounties(counties, 3, instrumented);
    expect(entries).toHaveLength(9);
    expect(calls).toBe(9);
    expect(maxInFlight).toBe(3);
  });

  it("skips a county whose fetch throws instead of failing the whole board", async () => {
    const fetcher = async (county: CountyRef): Promise<OsintSnapshot> => {
      if (county.fips === JEFFERSON.fips) throw new Error("synthetic failure");
      return quietSnapshot(county);
    };
    const entries = await sweepCounties([HARRIS, JEFFERSON], 2, fetcher);
    expect(entries).toHaveLength(1);
    expect(entries[0].county.fips).toBe(HARRIS.fips);
  });

  it("does not cache results for injected fetchers (tests always run fresh)", async () => {
    let calls = 0;
    const counting = async (county: CountyRef): Promise<OsintSnapshot> => {
      calls += 1;
      return quietSnapshot(county);
    };
    await sweepCounties([HARRIS, JEFFERSON], 4, counting);
    await sweepCounties([HARRIS, JEFFERSON], 4, counting);
    expect(calls).toBe(4);
  });
});

describe("watchlist", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sentinel-watchlist-"));
    process.env.WATCHLIST_DATA_DIR = tempDir;
    delete process.env.WATCHLIST;
    resetWatchlistForTests();
  });

  afterEach(() => {
    delete process.env.WATCHLIST_DATA_DIR;
    delete process.env.WATCHLIST;
    resetWatchlistForTests();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("seeds from the WATCHLIST env var", () => {
    process.env.WATCHLIST = " 48201, 04013 ,,";
    resetWatchlistForTests();
    expect(getWatchlist()).toEqual(["04013", "48201"]);
  });

  it("adds and removes counties, deduplicating adds", () => {
    expect(getWatchlist()).toEqual([]);
    addToWatchlist("48201");
    addToWatchlist("48201");
    addToWatchlist("17031");
    expect(getWatchlist()).toEqual(["17031", "48201"]);
    removeFromWatchlist("48201");
    expect(getWatchlist()).toEqual(["17031"]);
  });

  it("persists to watchlist.json and reloads after a state reset", () => {
    addToWatchlist("48201");
    const file = path.join(tempDir, "watchlist.json");
    expect(fs.existsSync(file)).toBe(true);
    expect(JSON.parse(fs.readFileSync(file, "utf-8"))).toEqual(["48201"]);

    // Fresh in-memory state (as after a process restart) reloads the file.
    resetWatchlistForTests();
    expect(getWatchlist()).toEqual(["48201"]);
  });

  it("degrades silently to memory-only when the data dir is unwritable", () => {
    // A path *under a regular file* can never be created — mimics Vercel's
    // read-only filesystem without needing permission tricks.
    const blocker = path.join(tempDir, "blocker");
    fs.writeFileSync(blocker, "not a directory");
    process.env.WATCHLIST_DATA_DIR = path.join(blocker, "nested");
    resetWatchlistForTests();

    expect(() => addToWatchlist("48201")).not.toThrow();
    expect(getWatchlist()).toEqual(["48201"]);
    // Nothing was persisted, and nothing threw.
    expect(fs.existsSync(path.join(blocker, "nested"))).toBe(false);
  });

  it("caps the alerts ring buffer at 200, evicting oldest first", () => {
    for (let i = 0; i < 250; i++) {
      recordAlert({
        at: new Date(i * 1000).toISOString(),
        county: HARRIS,
        riskScore: 55,
        action: "DEPLOY",
        topDriver: `driver ${i}`,
      });
    }
    const alerts = getAlerts();
    expect(alerts).toHaveLength(200);
    expect(alerts[0].topDriver).toBe("driver 50");
    expect(alerts[199].topDriver).toBe("driver 249");
  });
});
