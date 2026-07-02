import type { AirQualitySummary, CountyRef, SourceStatus } from "@shared/intelligence";
import { asArray, asNumber, asRecord, asString, errorMessage, fetchJson } from "./http";

export const AIRNOW_SOURCE = "EPA AirNow";

export async function fetchAirQuality(
  county: CountyRef,
  signal?: AbortSignal,
): Promise<{ airQuality: AirQualitySummary | null; status: SourceStatus }> {
  const fetchedAt = new Date().toISOString();

  const apiKey = process.env.AIRNOW_API_KEY;
  if (!apiKey) {
    return {
      airQuality: null,
      status: {
        source: AIRNOW_SOURCE,
        state: "unavailable",
        fetchedAt,
        detail: "AIRNOW_API_KEY not configured",
      },
    };
  }

  const url =
    "https://www.airnowapi.org/aq/observation/latLong/current/" +
    `?format=application/json&latitude=${county.lat}&longitude=${county.lon}` +
    `&distance=50&API_KEY=${encodeURIComponent(apiKey)}`;

  try {
    const payload = await fetchJson(url, signal);

    // One observation per pollutant; report the worst (highest AQI).
    // AirNow uses -1 for observations without a computed AQI.
    let worst: AirQualitySummary | null = null;
    for (const entry of asArray(payload)) {
      const obs = asRecord(entry);
      const aqi = asNumber(obs?.AQI);
      if (aqi === null || aqi < 0) continue;
      if (!worst || worst.aqi === null || aqi > worst.aqi) {
        worst = {
          aqi,
          category: asString(asRecord(obs?.Category)?.Name),
          pollutant: asString(obs?.ParameterName),
        };
      }
    }

    if (!worst) {
      return {
        airQuality: null,
        status: {
          source: AIRNOW_SOURCE,
          state: "degraded",
          fetchedAt,
          detail: "no monitor observations within 50 miles",
        },
      };
    }
    return {
      airQuality: worst,
      status: {
        source: AIRNOW_SOURCE,
        state: "live",
        fetchedAt,
        detail: `max AQI ${worst.aqi} (${worst.pollutant ?? "unknown pollutant"})`,
      },
    };
  } catch (err) {
    return {
      airQuality: null,
      status: { source: AIRNOW_SOURCE, state: "unavailable", fetchedAt, detail: errorMessage(err) },
    };
  }
}
