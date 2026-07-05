import type { CountyRef, SourceStatus, TropicalSystem } from "../../shared/intelligence";
import { asArray, asNumber, asRecord, asString, errorMessage, fetchJson } from "./http";
import { haversineKm } from "./earthquakes";

export const TROPICAL_SOURCE = "NHC Tropical";

const CURRENT_STORMS_URL = "https://www.nhc.noaa.gov/CurrentStorms.json";

// Inclusion rule: a storm is relevant to a county when EITHER
//   (a) its center is within 1,000 km of the county — direct proximity, any
//       basin; or
//   (b) the county sits in an Atlantic/Gulf coastal state AND the storm is in
//       the Atlantic basin (NHC storm ids start with "al"). Atlantic-basin
//       systems can threaten any Gulf/East-coast state within the forecast
//       window even when the center is still >1,000 km out, so coastal
//       counties see them early; an East-Pacific storm 3,000 km from Texas is
//       noise and is dropped.
// The risk engine applies points only inside 1,000 km, so basin-rule storms
// further out are informational (provenance-labeled) rather than score-moving.
const ATLANTIC_GULF_COASTAL_STATES = new Set([
  "TX", "LA", "MS", "AL", "FL", "GA", "SC", "NC", "VA", "MD", "DE",
  "NJ", "NY", "CT", "RI", "MA", "NH", "ME", "PA", "DC",
]);

const PROXIMITY_KM = 1000;

// NHC classification codes → human-readable labels (unknown codes pass through).
const CLASSIFICATION_LABELS: Record<string, string> = {
  TD: "Tropical Depression",
  TS: "Tropical Storm",
  HU: "Hurricane",
  MH: "Major Hurricane",
  STD: "Subtropical Depression",
  STS: "Subtropical Storm",
  PTC: "Potential Tropical Cyclone",
  PT: "Post-Tropical Cyclone",
};

function isAtlanticBasin(stormId: string): boolean {
  return stormId.toLowerCase().startsWith("al");
}

export async function fetchTropicalSystems(
  county: CountyRef,
  signal?: AbortSignal,
): Promise<{ tropical: TropicalSystem[]; status: SourceStatus }> {
  const fetchedAt = new Date().toISOString();

  let payload: unknown;
  try {
    payload = await fetchJson(CURRENT_STORMS_URL, signal);
  } catch (err) {
    return {
      tropical: [],
      status: {
        source: TROPICAL_SOURCE,
        state: "unavailable",
        fetchedAt,
        detail: errorMessage(err),
      },
    };
  }

  const activeStorms = asArray(asRecord(payload)?.activeStorms);
  const tropical: TropicalSystem[] = [];

  for (const entry of activeStorms) {
    const storm = asRecord(entry);
    if (!storm) continue;

    const id = asString(storm.id) ?? asString(storm.binNumber) ?? "unknown";
    const lat = asNumber(storm.latitudeNumeric);
    const lon = asNumber(storm.longitudeNumeric);
    const distanceKm =
      lat !== null && lon !== null
        ? Math.round(haversineKm(county.lat, county.lon, lat, lon))
        : null;

    const withinProximity = distanceKm !== null && distanceKm <= PROXIMITY_KM;
    const basinRelevant =
      ATLANTIC_GULF_COASTAL_STATES.has(county.state) && isAtlanticBasin(id);
    if (!withinProximity && !basinRelevant) continue;

    const movementDir = asNumber(storm.movementDir);
    const movementSpeed = asNumber(storm.movementSpeed);
    const movementBits: string[] = [];
    if (movementDir !== null) movementBits.push(`${movementDir}°`);
    if (movementSpeed !== null) movementBits.push(`${movementSpeed} kt`);

    const rawClassification = asString(storm.classification) ?? "unknown";
    tropical.push({
      id,
      name: asString(storm.name) ?? "Unnamed system",
      classification: CLASSIFICATION_LABELS[rawClassification] ?? rawClassification,
      intensityKt: asNumber(storm.intensity),
      lat,
      lon,
      distanceKm,
      movement: movementBits.length > 0 ? movementBits.join(" at ") : undefined,
    });
  }

  // Empty is the normal state most of the year — report it as live, not as a
  // failure, and say why the list is empty.
  const detail =
    activeStorms.length === 0
      ? "no active systems"
      : tropical.length === 0
        ? `${activeStorms.length} active system(s), none relevant to ${county.state} (wrong basin and >${PROXIMITY_KM} km)`
        : `${tropical.length} of ${activeStorms.length} active system(s) relevant to ${county.state}`;

  return {
    tropical,
    status: { source: TROPICAL_SOURCE, state: "live", fetchedAt, detail },
  };
}
