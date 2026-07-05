// Pure-function tests for the 72-hour risk trajectory. All hours are
// synthetic (no network) so every expectation is deterministic.

import { describe, expect, it } from "vitest";
import type { OsintSnapshot } from "@shared/intelligence";
import { computeRiskScore } from "../server/allocation/engine";
import { TRAJECTORY_METHOD, computeRiskTrajectory } from "../server/allocation/trajectory";
import type { HourlyForecastHour } from "../server/osint/nwsHourly";
import { quietSnapshot, severeHeatSnapshot } from "./fixtures";

const BASE_MS = Date.parse("2026-07-01T18:00:00.000Z");

/** `count` consecutive hourly entries starting at BASE_MS. */
function makeHours(
  count: number,
  reading: (hour: number) => { temperatureF: number | null; humidityPct: number | null },
): HourlyForecastHour[] {
  return Array.from({ length: count }, (_, h) => ({
    at: new Date(BASE_MS + h * 3_600_000).toISOString(),
    ...reading(h),
  }));
}

/** The risk score of `snapshot` with the heat components removed — what every
 * projected point should score when the forecast hours carry no heat. */
function nonHeatBaseline(snapshot: OsintSnapshot): number {
  return computeRiskScore({
    ...snapshot,
    weather: {
      temperatureF: null,
      heatIndexF: null,
      conditions: snapshot.weather?.conditions ?? null,
      forecastHighsF: [],
    },
  }).riskScore;
}

describe("computeRiskTrajectory", () => {
  it("rises along a monotone heat ramp and peaks at the earliest maximum", () => {
    // 78°F climbing 0.4°F/hour at a fixed 55% RH — crosses every heat-index
    // scoring threshold (95/103/108°F) inside the 72-hour window.
    const hours = makeHours(73, (h) => ({ temperatureF: 78 + h * 0.4, humidityPct: 55 }));
    const { points, peak } = computeRiskTrajectory(quietSnapshot(), hours);

    for (let i = 1; i < points.length; i++) {
      expect(points[i].riskScore).toBeGreaterThanOrEqual(points[i - 1].riskScore);
    }
    expect(points[points.length - 1].riskScore).toBeGreaterThan(points[0].riskScore);

    // Peak = max score; on ties (the score is a step function of heat index,
    // so the top bracket spans several points) the earliest point wins.
    const maxScore = Math.max(...points.map((p) => p.riskScore));
    const earliestMax = points.find((p) => p.riskScore === maxScore);
    expect(peak).toEqual(earliestMax);
    expect(peak!.at).toBe(earliestMax!.at);
  });

  it("never fabricates a heat index when humidity is missing", () => {
    // 105°F air temperature but no RH reading: a guessed default RH would
    // invent a dangerous heat index. Every point must stay at the non-heat
    // baseline instead.
    const hours = makeHours(73, () => ({ temperatureF: 105, humidityPct: null }));
    const snapshot = quietSnapshot();
    const { points } = computeRiskTrajectory(snapshot, hours);
    const baseline = nonHeatBaseline(snapshot);

    expect(points.length).toBeGreaterThan(0);
    for (const point of points) {
      expect(point.heatIndexF).toBeNull();
      expect(point.temperatureF).toBe(105);
      expect(point.riskScore).toBe(baseline);
    }
  });

  it("holds non-heat components constant: all-cool hours give a flat trajectory at the non-heat baseline", () => {
    // severeHeatSnapshot carries an extreme+immediate hazard and elevated
    // grid stress — those must persist in every projected point while the
    // 72°F hours contribute zero heat.
    const snapshot = severeHeatSnapshot();
    const hours = makeHours(73, () => ({ temperatureF: 72, humidityPct: 50 }));
    const { points, peak } = computeRiskTrajectory(snapshot, hours);
    const baseline = nonHeatBaseline(snapshot);

    expect(baseline).toBeGreaterThan(0); // hazard + grid still score
    for (const point of points) {
      expect(point.riskScore).toBe(baseline);
      expect(point.heatIndexF).toBe(72); // below 80°F the heat index is the air temp
    }
    // Flat curve -> the peak is the earliest point.
    expect(peak).toEqual(points[0]);

    // Sanity: the current snapshot (heat index 109°F, forecast highs 106°F)
    // scores strictly higher than the cool projection.
    expect(computeRiskScore(snapshot).riskScore).toBeGreaterThan(baseline);
  });

  it("is deterministic — same inputs, deep-equal trajectories", () => {
    const hours = makeHours(73, (h) => ({ temperatureF: 80 + (h % 24), humidityPct: 60 }));
    const first = computeRiskTrajectory(severeHeatSnapshot(), hours);
    const second = computeRiskTrajectory(severeHeatSnapshot(), hours);
    expect(second).toEqual(first);
  });

  it("samples every 3rd hour across a 72-hour window -> 25 points", () => {
    const hours = makeHours(73, () => ({ temperatureF: 90, humidityPct: 40 }));
    const { points } = computeRiskTrajectory(quietSnapshot(), hours);
    expect(points.length).toBe(25);
    expect(points[0].at).toBe(hours[0].at);
    expect(points[1].at).toBe(hours[3].at);
    expect(points[24].at).toBe(hours[72].at);

    // Extra hours beyond the 72-hour mark are ignored, not sampled.
    const long = computeRiskTrajectory(quietSnapshot(), makeHours(120, () => ({
      temperatureF: 90,
      humidityPct: 40,
    })));
    expect(long.points.length).toBe(25);
  });

  it("returns an empty trajectory for empty hours", () => {
    const trajectory = computeRiskTrajectory(quietSnapshot(), []);
    expect(trajectory.points).toEqual([]);
    expect(trajectory.peak).toBeNull();
  });

  it("labels the projection method honestly", () => {
    const trajectory = computeRiskTrajectory(quietSnapshot(), makeHours(1, () => ({
      temperatureF: 90,
      humidityPct: 40,
    })));
    expect(trajectory.method).toBe(TRAJECTORY_METHOD);
    expect(trajectory.method).toContain("held at current values");
  });
});
