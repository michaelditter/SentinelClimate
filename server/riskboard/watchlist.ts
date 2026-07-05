// County watchlist + background-sweep alerts.
//
// Storage model: an in-memory Set seeded from the WATCHLIST env var
// (comma-separated FIPS codes), persisted to .data/watchlist.json whenever the
// directory is writable. On read-only filesystems (Vercel serverless) the file
// write fails silently and the watchlist degrades to memory-only — which is
// honest: serverless instances are ephemeral anyway.
//
// Background sweep: opt-in via ENABLE_SWEEP and hard-disabled on Vercel (no
// long-lived timers in a serverless function). Started lazily from
// registerRiskboardRoutes, never at module import; the timer is unref()'d so
// it cannot keep the process alive.

import fs from "fs";
import path from "path";
import type { CountyRef, CrisisDecision } from "../../shared/intelligence";
import { resolveCounty } from "../config/counties";
import { sweepCounties } from "./sweep";

export interface WatchlistAlert {
  at: string;
  county: CountyRef;
  riskScore: number;
  action: CrisisDecision["action"];
  topDriver: string | null;
}

// Env read at access time (not module load) so tests can point the data dir
// somewhere disposable before touching the watchlist.
function dataDir(): string {
  return process.env.WATCHLIST_DATA_DIR ?? path.resolve(process.cwd(), ".data");
}

function watchlistFile(): string {
  return path.join(dataDir(), "watchlist.json");
}

let watchlist: Set<string> | null = null;

function parseEnvSeed(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function ensureLoaded(): Set<string> {
  if (watchlist) return watchlist;
  const set = new Set<string>(parseEnvSeed(process.env.WATCHLIST));
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(watchlistFile(), "utf-8"));
    if (Array.isArray(parsed)) {
      for (const fips of parsed) {
        if (typeof fips === "string" && fips.trim()) set.add(fips.trim());
      }
    }
  } catch {
    // No persisted file (or unreadable filesystem) — memory-only is fine.
  }
  watchlist = set;
  return set;
}

function persist(set: Set<string>): void {
  try {
    fs.mkdirSync(dataDir(), { recursive: true });
    fs.writeFileSync(watchlistFile(), JSON.stringify(Array.from(set).sort(), null, 2));
  } catch {
    // Read-only filesystem (Vercel) — degrade silently to memory-only.
  }
}

export function getWatchlist(): string[] {
  return Array.from(ensureLoaded()).sort();
}

export function addToWatchlist(fips: string): string[] {
  const set = ensureLoaded();
  const clean = fips.trim();
  if (clean && !set.has(clean)) {
    set.add(clean);
    persist(set);
  }
  return getWatchlist();
}

export function removeFromWatchlist(fips: string): string[] {
  const set = ensureLoaded();
  if (set.delete(fips.trim())) persist(set);
  return getWatchlist();
}

// ---------------------------------------------------------------------------
// Alerts ring buffer — most recent MAX_ALERTS non-MONITOR sweep results.
// ---------------------------------------------------------------------------

const MAX_ALERTS = 200;
const alerts: WatchlistAlert[] = [];

export function getAlerts(): WatchlistAlert[] {
  return [...alerts];
}

/** Append one alert, evicting the oldest beyond the 200-entry cap. */
export function recordAlert(alert: WatchlistAlert): void {
  alerts.push(alert);
  if (alerts.length > MAX_ALERTS) alerts.splice(0, alerts.length - MAX_ALERTS);
}

// ---------------------------------------------------------------------------
// Optional background sweep (never on Vercel, never at module import).
// ---------------------------------------------------------------------------

let sweepTimer: NodeJS.Timeout | null = null;

export function sweepEnabled(): boolean {
  return Boolean(process.env.ENABLE_SWEEP && !process.env.VERCEL);
}

export function sweepIntervalMinutes(): number {
  const raw = Number(process.env.SWEEP_INTERVAL_MINUTES);
  return Number.isFinite(raw) && raw > 0 ? raw : 15;
}

async function runWatchlistSweep(): Promise<void> {
  const counties = getWatchlist()
    .map((fips) => resolveCounty(fips))
    .filter((c): c is CountyRef => c !== undefined);
  if (counties.length === 0) return;
  const entries = await sweepCounties(counties);
  const at = new Date().toISOString();
  for (const entry of entries) {
    if (entry.action === "MONITOR") continue;
    recordAlert({
      at,
      county: entry.county,
      riskScore: entry.riskScore,
      action: entry.action,
      topDriver: entry.topDriver,
    });
  }
}

/**
 * Start the periodic watchlist sweep if (and only if) ENABLE_SWEEP is set and
 * we are not on Vercel. Idempotent; called lazily from registerRiskboardRoutes.
 */
export function startWatchlistSweep(): void {
  if (sweepTimer || !sweepEnabled()) return;
  sweepTimer = setInterval(() => {
    runWatchlistSweep().catch((err) => {
      // The timer must never crash the process.
      console.error("riskboard: watchlist sweep failed:", err);
    });
  }, sweepIntervalMinutes() * 60_000);
  sweepTimer.unref();
}

export function stopWatchlistSweep(): void {
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
  }
}

/** Test-only: drop all in-memory state so suites can exercise seeding/persistence. */
export function resetWatchlistForTests(): void {
  watchlist = null;
  alerts.length = 0;
  stopWatchlistSweep();
}
