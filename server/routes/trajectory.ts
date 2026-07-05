// Forward-looking risk trajectory route. Registered from server/routes.ts via
// registerTrajectoryRoutes(app). Cheap endpoint (snapshot + hourly forecast +
// pure scoring, no LLM step) — deliberately not rate limited.

import type { Express } from "express";
import { resolveCounty } from "../config/counties";
import { collectOsintSnapshot } from "../osint/collector";
import { fetchHourlyForecast } from "../osint/nwsHourly";
import { computeRiskTrajectory } from "../allocation/trajectory";

// Same per-source budget the collector uses — a hung NWS call must not hold
// the (serverless) request open.
const HOURLY_TIMEOUT_MS = 8000;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Internal server error";
}

export function registerTrajectoryRoutes(app: Express): void {
  app.get("/api/trajectory/:county", async (req, res) => {
    const county = resolveCounty(req.params.county);
    if (!county) {
      res.status(404).json({ error: `Unknown county: "${req.params.county}"` });
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(new Error(`timed out after ${HOURLY_TIMEOUT_MS}ms`)),
      HOURLY_TIMEOUT_MS,
    );
    try {
      // The collector has its own per-source timeouts; only the hourly fetch
      // needs one here. Neither call ever throws in normal operation.
      const [snapshot, hourly] = await Promise.all([
        collectOsintSnapshot(county),
        fetchHourlyForecast(county, controller.signal),
      ]);

      if (hourly.status.state === "unavailable") {
        // Data honesty: no hourly curve -> no trajectory. Never extrapolate.
        res.json({ county, trajectory: null, status: hourly.status });
        return;
      }

      res.json({
        county,
        trajectory: computeRiskTrajectory(snapshot, hourly.hours),
        status: hourly.status,
      });
    } catch (err) {
      res.status(500).json({ error: errorMessage(err) });
    } finally {
      clearTimeout(timer);
    }
  });
}
