import type { CountyRef, EarthquakeSignal, SourceStatus } from "../../shared/intelligence";
import { asArray, asNumber, asRecord, asString, errorMessage, fetchJson } from "./http";

export const EARTHQUAKES_SOURCE = "USGS Earthquakes";

const RADIUS_KM = 150;
const MIN_MAGNITUDE = 3.5;
const LOOKBACK_HOURS = 72;
const MAX_EVENTS = 20;

const EARTH_RADIUS_KM = 6371;

/**
 * Great-circle distance between two lat/lon points in kilometers.
 * Shared by the earthquake, wildfire, and tropical feeds (all three need a
 * county-to-point distance and none of the upstream APIs return one).
 */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export async function fetchEarthquakes(
  county: CountyRef,
  signal?: AbortSignal,
): Promise<{ earthquakes: EarthquakeSignal[]; status: SourceStatus }> {
  const fetchedAt = new Date().toISOString();

  const starttime = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
  const url =
    "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson" +
    `&latitude=${county.lat}&longitude=${county.lon}` +
    `&maxradiuskm=${RADIUS_KM}&minmagnitude=${MIN_MAGNITUDE}` +
    `&orderby=time&limit=${MAX_EVENTS}&starttime=${encodeURIComponent(starttime)}`;

  let payload: unknown;
  try {
    payload = await fetchJson(url, signal);
  } catch (err) {
    return {
      earthquakes: [],
      status: {
        source: EARTHQUAKES_SOURCE,
        state: "unavailable",
        fetchedAt,
        detail: errorMessage(err),
      },
    };
  }

  const earthquakes: EarthquakeSignal[] = [];
  for (const entry of asArray(asRecord(payload)?.features)) {
    const feature = asRecord(entry);
    if (!feature) continue;

    const props = asRecord(feature.properties);
    // GeoJSON geometry.coordinates = [lon, lat, depthKm].
    const coords = asArray(asRecord(feature.geometry)?.coordinates);
    const lon = asNumber(coords[0]);
    const lat = asNumber(coords[1]);

    const timeMs = asNumber(props?.time);
    earthquakes.push({
      id: asString(feature.id) ?? asString(props?.code) ?? "unknown",
      magnitude: asNumber(props?.mag),
      place: asString(props?.place) ?? "unknown location",
      occurredAt: timeMs !== null ? new Date(timeMs).toISOString() : "",
      distanceKm:
        lat !== null && lon !== null
          ? Math.round(haversineKm(county.lat, county.lon, lat, lon))
          : null,
      depthKm: asNumber(coords[2]),
    });
  }

  return {
    earthquakes,
    status: {
      source: EARTHQUAKES_SOURCE,
      state: "live",
      fetchedAt,
      detail: `${earthquakes.length} event(s) M≥${MIN_MAGNITUDE} within ${RADIUS_KM} km in last ${LOOKBACK_HOURS} h`,
    },
  };
}
