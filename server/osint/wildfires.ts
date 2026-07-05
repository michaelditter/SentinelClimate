import type { CountyRef, SourceStatus, WildfireSignal } from "../../shared/intelligence";
import { asArray, asNumber, asRecord, asString, errorMessage, fetchJson } from "./http";
import { haversineKm } from "./earthquakes";

export const WILDFIRES_SOURCE = "NIFC Wildfires";

const RADIUS_METERS = 150_000;
const RADIUS_KM = RADIUS_METERS / 1000;

// NIFC WFIGS current incident locations (keyless ArcGIS feature service).
// Live-verified 2026-07-02: this layer has NO DailyAcres field — requesting it
// 400s the whole query. Current size lives in IncidentSize (falling back to
// DiscoveryAcres for brand-new incidents). The point-plus-distance geometry
// filter works once the field list is valid, so no state-level fallback query
// is needed. IncidentTypeCategory IN ('WF','CX') keeps wildfires and wildfire
// complexes but drops prescribed burns ('RX'), which would otherwise flood the
// feed with intentional, controlled fires.
const NIFC_LAYER_URL =
  "https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/" +
  "WFIGS_Incident_Locations_Current/FeatureServer/0/query";

const OUT_FIELDS = [
  "IrwinID",
  "IncidentName",
  "IncidentSize",
  "DiscoveryAcres",
  "PercentContained",
  "FireDiscoveryDateTime",
  "InitialLatitude",
  "InitialLongitude",
].join(",");

export async function fetchWildfires(
  county: CountyRef,
  signal?: AbortSignal,
): Promise<{ wildfires: WildfireSignal[]; status: SourceStatus }> {
  const fetchedAt = new Date().toISOString();

  const params = new URLSearchParams({
    where: "IncidentTypeCategory IN ('WF','CX')",
    outFields: OUT_FIELDS,
    f: "json",
    geometry: `${county.lon},${county.lat}`,
    geometryType: "esriGeometryPoint",
    distance: String(RADIUS_METERS),
    units: "esriSRUnit_Meter",
    spatialRel: "esriSpatialRelIntersects",
    inSR: "4326",
    returnGeometry: "false",
  });

  let payload: unknown;
  try {
    payload = await fetchJson(`${NIFC_LAYER_URL}?${params.toString()}`, signal);
  } catch (err) {
    return {
      wildfires: [],
      status: {
        source: WILDFIRES_SOURCE,
        state: "unavailable",
        fetchedAt,
        detail: errorMessage(err),
      },
    };
  }

  // ArcGIS reports query failures as HTTP 200 with an "error" body.
  const arcgisError = asRecord(asRecord(payload)?.error);
  if (arcgisError) {
    return {
      wildfires: [],
      status: {
        source: WILDFIRES_SOURCE,
        state: "unavailable",
        fetchedAt,
        detail: `ArcGIS error ${asNumber(arcgisError.code) ?? ""}: ${
          asString(arcgisError.message) ?? "unknown query failure"
        }`,
      },
    };
  }

  const wildfires: WildfireSignal[] = [];
  for (const entry of asArray(asRecord(payload)?.features)) {
    const attrs = asRecord(asRecord(entry)?.attributes);
    if (!attrs) continue;

    const lat = asNumber(attrs.InitialLatitude);
    const lon = asNumber(attrs.InitialLongitude);
    const discoveredMs = asNumber(attrs.FireDiscoveryDateTime);
    const name = asString(attrs.IncidentName) ?? "Unnamed incident";

    wildfires.push({
      id: asString(attrs.IrwinID) ?? name,
      name,
      acres: asNumber(attrs.IncidentSize) ?? asNumber(attrs.DiscoveryAcres),
      containmentPct: asNumber(attrs.PercentContained),
      distanceKm:
        lat !== null && lon !== null
          ? Math.round(haversineKm(county.lat, county.lon, lat, lon))
          : null,
      discoveredAt: discoveredMs !== null ? new Date(discoveredMs).toISOString() : undefined,
    });
  }

  return {
    wildfires,
    status: {
      source: WILDFIRES_SOURCE,
      state: "live",
      fetchedAt,
      detail: `${wildfires.length} active incident(s) within ${RADIUS_KM} km (wildfires and complexes; prescribed burns excluded)`,
    },
  };
}
