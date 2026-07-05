// Forward-looking risk: project the deterministic risk score along the NWS
// hourly forecast. Pure function of its inputs — no I/O, no clock reads, no
// randomness — so it is unit-testable with synthetic hours.
//
// Method (also carried on the returned trajectory for provenance): every 3rd
// forecast hour (0, 3, 6 … 72) gets a projected snapshot whose heat
// components (temperature + heat index) come from that hour; every other
// component — hazards, flood gauges, grid, air quality, declarations, and the
// optional all-hazards extensions — is held at its current value. The
// forecast-highs driver is dropped from the projection because the hourly
// curve replaces it; keeping both would double-count forecast heat.
//
// Known v1 simplification: computeRiskScore's active-alert component includes
// alerts that may expire mid-window. The method string discloses that the
// hazard component is held at current values.

import type {
  OsintSnapshot,
  RiskTrajectory,
  RiskTrajectoryPoint,
} from "../../shared/intelligence";
import type { HourlyForecastHour } from "../osint/nwsHourly";
import { heatIndexF } from "../osint/nws";
import { computeRiskScore } from "./engine";

export const TRAJECTORY_METHOD =
  "heat components projected from NWS hourly forecast; hazard/flood/grid/air/declaration components held at current values";

/** Sample every 3rd hour: fine enough to catch an afternoon peak, coarse
 * enough to keep the payload and the score recomputation cheap. */
const STEP_HOURS = 3;

/** Cap the projection at the 72-hour mark even if more hours are supplied. */
const WINDOW_HOURS = 72;

export function computeRiskTrajectory(
  snapshot: OsintSnapshot,
  hours: HourlyForecastHour[],
): RiskTrajectory {
  const points: RiskTrajectoryPoint[] = [];

  for (let i = 0; i < hours.length && i <= WINDOW_HOURS; i += STEP_HOURS) {
    const hour = hours[i];
    const temperatureF = hour.temperatureF;

    // Same no-fabrication rule as nws.ts: no humidity reading -> no heat
    // index. Assuming a default RH invents dangerously wrong values in dry
    // climates.
    const projectedHeatIndexF =
      temperatureF === null || hour.humidityPct === null
        ? null
        : heatIndexF(temperatureF, hour.humidityPct);

    const projected: OsintSnapshot = {
      ...snapshot,
      weather: {
        temperatureF,
        heatIndexF: projectedHeatIndexF,
        conditions: snapshot.weather?.conditions ?? null,
        // The hourly curve replaces the multi-day forecast-high driver —
        // keeping forecastHighsF would double-count heat against the
        // projected heat index.
        forecastHighsF: [],
      },
    };

    points.push({
      at: hour.at,
      riskScore: computeRiskScore(projected).riskScore,
      heatIndexF: projectedHeatIndexF,
      temperatureF,
    });
  }

  // Peak = max riskScore; strict > keeps the earliest point on ties.
  let peak: RiskTrajectoryPoint | null = null;
  for (const point of points) {
    if (peak === null || point.riskScore > peak.riskScore) peak = point;
  }

  return { points, peak, method: TRAJECTORY_METHOD };
}
