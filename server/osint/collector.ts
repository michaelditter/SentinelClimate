import type {
  CountyRef,
  DisasterDeclaration,
  EarthquakeSignal,
  FloodGaugeReading,
  HazardSignal,
  OsintSnapshot,
  SourceStatus,
  TropicalSystem,
  WildfireSignal,
} from "../../shared/intelligence";
import { errorMessage } from "./http";
import {
  NWS_ALERTS_SOURCE,
  NWS_FORECAST_SOURCE,
  fetchActiveAlerts,
  fetchWeatherSummary,
} from "./nws";
import { USGS_SOURCE, fetchFloodGauges } from "./usgs";
import { EIA_SOURCE, fetchGridSummary } from "./eia";
import { AIRNOW_SOURCE, fetchAirQuality } from "./airnow";
import { FEMA_SOURCE, fetchDisasterDeclarations } from "./fema";
import { EARTHQUAKES_SOURCE, fetchEarthquakes } from "./earthquakes";
import { WILDFIRES_SOURCE, fetchWildfires } from "./wildfires";
import { TROPICAL_SOURCE, fetchTropicalSystems } from "./tropical";
import { HHS_SOURCE, fetchHospitalCapacity } from "./hhs";

const SOURCE_TIMEOUT_MS = 8000;

async function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error(`timed out after ${SOURCE_TIMEOUT_MS}ms`)),
    SOURCE_TIMEOUT_MS,
  );
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

function unavailable(source: string, reason: unknown): SourceStatus {
  return {
    source,
    state: "unavailable",
    fetchedAt: new Date().toISOString(),
    detail: errorMessage(reason),
  };
}

/**
 * Collects the full OSINT picture for a county. All ten feeds run in
 * parallel with a per-source timeout (NWS contributes two feeds — alerts and
 * forecast — each with its own SourceStatus). Never throws: the worst case is
 * a snapshot with empty arrays/nulls and every source marked unavailable.
 */
export async function collectOsintSnapshot(county: CountyRef): Promise<OsintSnapshot> {
  const [
    alertsResult,
    weatherResult,
    gaugesResult,
    gridResult,
    airResult,
    femaResult,
    quakeResult,
    fireResult,
    tropicalResult,
    hospitalResult,
  ] = await Promise.allSettled([
    withTimeout((signal) => fetchActiveAlerts(county, signal)),
    withTimeout((signal) => fetchWeatherSummary(county, signal)),
    withTimeout((signal) => fetchFloodGauges(county, signal)),
    withTimeout((signal) => fetchGridSummary(county, signal)),
    withTimeout((signal) => fetchAirQuality(county, signal)),
    withTimeout((signal) => fetchDisasterDeclarations(county, signal)),
    withTimeout((signal) => fetchEarthquakes(county, signal)),
    withTimeout((signal) => fetchWildfires(county, signal)),
    withTimeout((signal) => fetchTropicalSystems(county, signal)),
    withTimeout((signal) => fetchHospitalCapacity(county, signal)),
  ]);

  const sources: SourceStatus[] = [];

  let hazards: HazardSignal[] = [];
  if (alertsResult.status === "fulfilled") {
    hazards = alertsResult.value.hazards;
    sources.push(alertsResult.value.status);
  } else {
    sources.push(unavailable(NWS_ALERTS_SOURCE, alertsResult.reason));
  }

  let weather: OsintSnapshot["weather"] = null;
  if (weatherResult.status === "fulfilled") {
    weather = weatherResult.value.weather;
    sources.push(weatherResult.value.status);
  } else {
    sources.push(unavailable(NWS_FORECAST_SOURCE, weatherResult.reason));
  }

  let floodGauges: FloodGaugeReading[] = [];
  if (gaugesResult.status === "fulfilled") {
    floodGauges = gaugesResult.value.gauges;
    sources.push(gaugesResult.value.status);
  } else {
    sources.push(unavailable(USGS_SOURCE, gaugesResult.reason));
  }

  let grid: OsintSnapshot["grid"] = null;
  if (gridResult.status === "fulfilled") {
    grid = gridResult.value.grid;
    sources.push(gridResult.value.status);
  } else {
    sources.push(unavailable(EIA_SOURCE, gridResult.reason));
  }

  let airQuality: OsintSnapshot["airQuality"] = null;
  if (airResult.status === "fulfilled") {
    airQuality = airResult.value.airQuality;
    sources.push(airResult.value.status);
  } else {
    sources.push(unavailable(AIRNOW_SOURCE, airResult.reason));
  }

  let activeDeclarations: DisasterDeclaration[] = [];
  if (femaResult.status === "fulfilled") {
    activeDeclarations = femaResult.value.declarations;
    sources.push(femaResult.value.status);
  } else {
    sources.push(unavailable(FEMA_SOURCE, femaResult.reason));
  }

  let earthquakes: EarthquakeSignal[] = [];
  if (quakeResult.status === "fulfilled") {
    earthquakes = quakeResult.value.earthquakes;
    sources.push(quakeResult.value.status);
  } else {
    sources.push(unavailable(EARTHQUAKES_SOURCE, quakeResult.reason));
  }

  let wildfires: WildfireSignal[] = [];
  if (fireResult.status === "fulfilled") {
    wildfires = fireResult.value.wildfires;
    sources.push(fireResult.value.status);
  } else {
    sources.push(unavailable(WILDFIRES_SOURCE, fireResult.reason));
  }

  let tropical: TropicalSystem[] = [];
  if (tropicalResult.status === "fulfilled") {
    tropical = tropicalResult.value.tropical;
    sources.push(tropicalResult.value.status);
  } else {
    sources.push(unavailable(TROPICAL_SOURCE, tropicalResult.reason));
  }

  let hospitalCapacity: OsintSnapshot["hospitalCapacity"] = null;
  if (hospitalResult.status === "fulfilled") {
    hospitalCapacity = hospitalResult.value.capacity;
    sources.push(hospitalResult.value.status);
  } else {
    sources.push(unavailable(HHS_SOURCE, hospitalResult.reason));
  }

  return {
    county,
    collectedAt: new Date().toISOString(),
    sources,
    hazards,
    weather,
    grid,
    airQuality,
    floodGauges,
    activeDeclarations,
    earthquakes,
    wildfires,
    tropical,
    hospitalCapacity,
  };
}
