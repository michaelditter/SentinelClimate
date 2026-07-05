// NWS hourly forecast feed — the input to the forward-looking risk
// trajectory. Same never-throw contract as the other OSINT sources: the
// worst case is an empty hours array with an "unavailable" SourceStatus.

import type { CountyRef, SourceStatus } from "../../shared/intelligence";
import { asArray, asNumber, asRecord, asString, errorMessage, fetchJson } from "./http";

const API = "https://api.weather.gov";

export const NWS_HOURLY_SOURCE = "NWS Hourly Forecast";

/** Up to 72 hourly periods — the trajectory projects a 72-hour window. */
const MAX_HOURS = 72;

/** One hourly forecast period. Missing readings stay null — never invented. */
export interface HourlyForecastHour {
  at: string;
  temperatureF: number | null;
  humidityPct: number | null;
}

// api.weather.gov rejects coordinates with more than 4 decimal places.
function coord(n: number): string {
  return n.toFixed(4);
}

// NWS hourly periods report in F by default but carry a temperatureUnit;
// convert defensively rather than assuming.
function periodTempF(period: Record<string, unknown>): number | null {
  const t = asNumber(period.temperature);
  if (t === null) return null;
  return asString(period.temperatureUnit) === "C" ? Math.round((t * 9) / 5 + 32) : t;
}

export async function fetchHourlyForecast(
  county: CountyRef,
  signal?: AbortSignal,
): Promise<{ hours: HourlyForecastHour[]; status: SourceStatus }> {
  const fetchedAt = new Date().toISOString();
  try {
    const point = await fetchJson(
      `${API}/points/${coord(county.lat)},${coord(county.lon)}`,
      signal,
    );
    const hourlyUrl = asString(asRecord(asRecord(point)?.properties)?.forecastHourly);
    if (!hourlyUrl) throw new Error("NWS points response had no forecastHourly URL");

    const forecast = await fetchJson(hourlyUrl, signal);
    const periods = asArray(asRecord(asRecord(forecast)?.properties)?.periods)
      .map((p) => asRecord(p))
      .filter((p): p is Record<string, unknown> => p !== null);
    if (periods.length === 0) throw new Error("NWS hourly forecast response had no periods");

    const hours: HourlyForecastHour[] = [];
    for (const p of periods) {
      // A period without a timestamp cannot be placed on the curve — skip it
      // rather than fabricating a time.
      const at = asString(p.startTime);
      if (!at) continue;
      hours.push({
        at,
        temperatureF: periodTempF(p),
        humidityPct: asNumber(asRecord(p.relativeHumidity)?.value),
      });
      if (hours.length >= MAX_HOURS) break;
    }

    return {
      hours,
      status: {
        source: NWS_HOURLY_SOURCE,
        state: "live",
        fetchedAt,
        detail: `${hours.length} hourly period(s)`,
      },
    };
  } catch (err) {
    return {
      hours: [],
      status: {
        source: NWS_HOURLY_SOURCE,
        state: "unavailable",
        fetchedAt,
        detail: errorMessage(err),
      },
    };
  }
}
