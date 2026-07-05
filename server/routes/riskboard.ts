// Risk-board, watchlist, and alert routes. Registered from server/routes.ts
// via registerRiskboardRoutes(app). Errors return {error} JSON only.

import type { Express } from "express";
import type { CountyRef } from "../../shared/intelligence";
import { resolveCounty } from "../config/counties";
import { DEFAULT_BOARD, sweepCounties } from "../riskboard/sweep";
import {
  addToWatchlist,
  getAlerts,
  getWatchlist,
  removeFromWatchlist,
  startWatchlistSweep,
  sweepEnabled,
  sweepIntervalMinutes,
} from "../riskboard/watchlist";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Internal server error";
}

// Per-IP throttle for the board endpoint, copied from routes/intelligence.ts
// (its rateLimited is module-private, and the two endpoints should not share
// one budget anyway). Tighter than analysis — 4/min — because one board sweep
// fans out to ~30 counties × 6 government APIs.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 4;
const requestLog = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX_REQUESTS) {
    requestLog.set(ip, recent);
    return true;
  }
  recent.push(now);
  requestLog.set(ip, recent);
  // Bound the map so a scanner can't grow it without limit.
  if (requestLog.size > 10_000) requestLog.clear();
  return false;
}

const MAX_BOARD_COUNTIES = 40;

export function registerRiskboardRoutes(app: Express): void {
  // GET /api/riskboard            → default board (curated + metros + watchlist)
  // GET /api/riskboard?counties=… → explicit comma-separated FIPS list (cap 40)
  app.get("/api/riskboard", async (req, res) => {
    if (rateLimited(req.ip ?? "unknown")) {
      res.status(429).json({
        error: "Too many risk-board requests — the board is cached for 10 minutes; try again shortly",
      });
      return;
    }

    const raw = typeof req.query.counties === "string" ? req.query.counties : "";
    const unresolved: string[] = [];
    const byFips = new Map<string, CountyRef>();

    if (raw.trim()) {
      const requested = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, MAX_BOARD_COUNTIES);
      for (const id of requested) {
        const county = resolveCounty(id);
        if (county) byFips.set(county.fips, county);
        else unresolved.push(id);
      }
      if (byFips.size === 0) {
        res.status(400).json({
          error: `None of the requested counties resolved: ${unresolved.join(", ")}`,
        });
        return;
      }
    } else {
      for (const county of DEFAULT_BOARD) byFips.set(county.fips, county);
      for (const fips of getWatchlist()) {
        if (byFips.has(fips)) continue;
        const county = resolveCounty(fips);
        if (county) byFips.set(county.fips, county);
        else unresolved.push(fips);
      }
    }

    try {
      const entries = await sweepCounties(Array.from(byFips.values()));
      res.json({
        generatedAt: new Date().toISOString(),
        method: "rules-engine screening (deterministic, no LLM)",
        entries,
        // Data honesty: name every county we could NOT resolve rather than
        // silently dropping it from the board.
        unresolved,
      });
    } catch (err) {
      res.status(500).json({ error: errorMessage(err) });
    }
  });

  app.get("/api/watchlist", (_req, res) => {
    res.json({ watchlist: getWatchlist() });
  });

  app.post("/api/watchlist", (req, res) => {
    const fips = req.body?.fips;
    if (typeof fips !== "string" || fips.trim() === "") {
      res.status(400).json({ error: "Request body must include a county FIPS code: {\"fips\": \"48201\"}" });
      return;
    }
    const county = resolveCounty(fips);
    if (!county) {
      res.status(404).json({ error: `Unknown county: "${fips}"` });
      return;
    }
    // Store the canonical FIPS even when the caller passed a county name.
    res.json({ added: county.fips, watchlist: addToWatchlist(county.fips) });
  });

  app.delete("/api/watchlist", (req, res) => {
    const fips = req.body?.fips;
    if (typeof fips !== "string" || fips.trim() === "") {
      res.status(400).json({ error: "Request body must include a county FIPS code: {\"fips\": \"48201\"}" });
      return;
    }
    // Remove both the raw id and its canonical resolution so stale env-seeded
    // entries can always be cleared.
    let watchlist = removeFromWatchlist(fips);
    const county = resolveCounty(fips);
    if (county && county.fips !== fips.trim()) watchlist = removeFromWatchlist(county.fips);
    res.json({ removed: fips.trim(), watchlist });
  });

  app.get("/api/alerts", (_req, res) => {
    res.json({
      sweepEnabled: sweepEnabled(),
      intervalMinutes: sweepIntervalMinutes(),
      alerts: getAlerts(),
    });
  });

  // Lazy start — a no-op unless ENABLE_SWEEP is set and we're not on Vercel.
  startWatchlistSweep();
}
