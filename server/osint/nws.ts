import type {
  CountyRef,
  HazardSignal,
  HazardType,
  SourceStatus,
  WeatherSummary,
} from "../../shared/intelligence";
import { asArray, asNumber, asRecord, asString, errorMessage, fetchJson } from "./http";

const API = "https://api.weather.gov";

export const NWS_ALERTS_SOURCE = "NWS Alerts";
export const NWS_FORECAST_SOURCE = "NWS Forecast";

function mapEventToHazardType(event: string): HazardType {
  const e = event.toLowerCase();
  if (e.includes("heat")) return "extreme_heat";
  if (e.includes("hurricane") || e.includes("tropical storm")) return "hurricane";
  if (e.includes("tornado")) return "tornado";
  if (e.includes("flood")) return "flood";
  if (e.includes("winter") || e.includes("blizzard") || e.includes("ice storm")) return "winter_storm";
  if (e.includes("fire") || e.includes("red flag")) return "wildfire";
  if (e.includes("air quality") || e.includes("smoke")) return "air_quality";
  return "other";
}

// NWS uses Minor|Moderate|Severe|Extreme (plus Unknown); lowercase defensively
// and default to the least alarming value rather than inventing severity.
function mapSeverity(raw: unknown): HazardSignal["severity"] {
  const s = (asString(raw) ?? "").toLowerCase();
  if (s === "extreme") return "extreme";
  if (s === "severe") return "severe";
  if (s === "moderate") return "moderate";
  return "minor";
}

// NWS uses Immediate|Expected|Future|Past (plus Unknown).
function mapUrgency(raw: unknown): HazardSignal["urgency"] {
  const u = (asString(raw) ?? "").toLowerCase();
  if (u === "immediate") return "immediate";
  if (u === "expected") return "expected";
  if (u === "past") return "past";
  return "future";
}

// api.weather.gov rejects coordinates with more than 4 decimal places.
function coord(n: number): string {
  return n.toFixed(4);
}

export async function fetchActiveAlerts(
  county: CountyRef,
  signal?: AbortSignal,
): Promise<{ hazards: HazardSignal[]; status: SourceStatus }> {
  const fetchedAt = new Date().toISOString();

  let payload: unknown;
  let usedStateFallback = false;
  try {
    try {
      payload = await fetchJson(
        `${API}/alerts/active?point=${coord(county.lat)},${coord(county.lon)}`,
        signal,
      );
    } catch (pointErr) {
      if (signal?.aborted) throw pointErr;
      usedStateFallback = true;
      payload = await fetchJson(
        `${API}/alerts/active?area=${encodeURIComponent(county.state)}`,
        signal,
      );
    }
  } catch (err) {
    return {
      hazards: [],
      status: {
        source: NWS_ALERTS_SOURCE,
        state: "unavailable",
        fetchedAt,
        detail: errorMessage(err),
      },
    };
  }

  const hazards: HazardSignal[] = [];
  // When falling back to the state-wide feed, only keep alerts whose area
  // actually mentions this county — otherwise a tornado warning 800 miles
  // away inflates this county's risk score.
  const countyNeedle = county.name.replace(/\s+county$/i, "").toLowerCase();
  for (const feature of asArray(asRecord(payload)?.features)) {
    const props = asRecord(asRecord(feature)?.properties);
    if (!props) continue;
    const areas = (asString(props.areaDesc) ?? "")
      .split(";")
      .map((a) => a.trim())
      .filter(Boolean);
    if (usedStateFallback && !areas.some((a) => a.toLowerCase().includes(countyNeedle))) {
      continue;
    }
    const event = asString(props.event) ?? "Unknown event";
    hazards.push({
      type: mapEventToHazardType(event),
      headline: asString(props.headline) ?? event,
      severity: mapSeverity(props.severity),
      urgency: mapUrgency(props.urgency),
      certainty: (asString(props.certainty) ?? "unknown").toLowerCase(),
      areas,
      onset: asString(props.onset) ?? undefined,
      expires: asString(props.expires) ?? undefined,
      source: "NWS",
    });
  }

  return {
    hazards,
    status: {
      source: NWS_ALERTS_SOURCE,
      state: usedStateFallback ? "degraded" : "live",
      fetchedAt,
      detail: usedStateFallback
        ? `point query failed; state-wide (${county.state}) alerts filtered to ${county.name}`
        : `${hazards.length} active alert(s) at county point`,
    },
  };
}

export async function fetchWeatherSummary(
  county: CountyRef,
  signal?: AbortSignal,
): Promise<{ weather: WeatherSummary | null; status: SourceStatus }> {
  const fetchedAt = new Date().toISOString();
  try {
    const point = await fetchJson(`${API}/points/${coord(county.lat)},${coord(county.lon)}`, signal);
    const forecastUrl = asString(asRecord(asRecord(point)?.properties)?.forecast);
    if (!forecastUrl) throw new Error("NWS points response had no forecast URL");

    const forecast = await fetchJson(forecastUrl, signal);
    const periods = asArray(asRecord(asRecord(forecast)?.properties)?.periods)
      .map((p) => asRecord(p))
      .filter((p): p is Record<string, unknown> => p !== null);
    if (periods.length === 0) throw new Error("NWS forecast response had no periods");

    const first = periods[0];
    const temperatureF = periodTempF(first);
    const humidityPct = asNumber(asRecord(first.relativeHumidity)?.value);

    const forecastHighsF: number[] = [];
    for (const p of periods) {
      if (p.isDaytime !== true) continue;
      const t = periodTempF(p);
      if (t !== null) forecastHighsF.push(t);
      if (forecastHighsF.length >= 5) break;
    }

    const weather: WeatherSummary = {
      temperatureF,
      // No humidity reading -> no heat index. Assuming a default RH fabricates
      // dangerously wrong values in dry climates (102°F at a guessed 65% RH
      // computes ~144°F; the real Phoenix figure would be ~100°F).
      heatIndexF:
        temperatureF === null || humidityPct === null
          ? null
          : heatIndexF(temperatureF, humidityPct),
      conditions: asString(first.shortForecast),
      forecastHighsF,
    };
    return {
      weather,
      status: { source: NWS_FORECAST_SOURCE, state: "live", fetchedAt },
    };
  } catch (err) {
    return {
      weather: null,
      status: {
        source: NWS_FORECAST_SOURCE,
        state: "unavailable",
        fetchedAt,
        detail: errorMessage(err),
      },
    };
  }
}

function periodTempF(period: Record<string, unknown>): number | null {
  const t = asNumber(period.temperature);
  if (t === null) return null;
  return asString(period.temperatureUnit) === "C" ? Math.round((t * 9) / 5 + 32) : t;
}

/**
 * NWS Rothfusz heat-index regression, with the standard low-RH and high-RH
 * adjustments (https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml).
 * Below 80F the heat index is simply the air temperature.
 */
export function heatIndexF(tempF: number, humidityPct: number): number {
  if (tempF < 80) return tempF;
  const T = tempF;
  const RH = Math.min(100, Math.max(0, humidityPct));
  let hi =
    -42.379 +
    2.04901523 * T +
    10.14333127 * RH -
    0.22475541 * T * RH -
    6.83783e-3 * T * T -
    5.481717e-2 * RH * RH +
    1.22874e-3 * T * T * RH +
    8.5282e-4 * T * RH * RH -
    1.99e-6 * T * T * RH * RH;
  if (RH < 13 && T <= 112) {
    hi -= ((13 - RH) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
  } else if (RH > 85 && T <= 87) {
    hi += ((RH - 85) / 10) * ((87 - T) / 5);
  }
  return Math.round(hi);
}
