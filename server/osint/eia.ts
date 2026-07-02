import type { CountyRef, GridSummary, SourceStatus } from "../../shared/intelligence";
import { asArray, asNumber, asRecord, asString, errorMessage, fetchJson } from "./http";

export const EIA_SOURCE = "EIA Grid Demand";

export async function fetchGridSummary(
  county: CountyRef,
  signal?: AbortSignal,
): Promise<{ grid: GridSummary | null; status: SourceStatus }> {
  const fetchedAt = new Date().toISOString();

  const apiKey = process.env.EIA_API_KEY;
  if (!apiKey) {
    return {
      grid: null,
      status: {
        source: EIA_SOURCE,
        state: "unavailable",
        fetchedAt,
        detail: "EIA_API_KEY not configured",
      },
    };
  }

  // Per-county respondent override first (not all TX counties are on ERCOT —
  // Beaumont is MISO/Entergy), then ERCOT for Texas, lower-48 aggregate else.
  const respondent = county.gridRespondent ?? (county.state === "TX" ? "TEX" : "US48");
  const url =
    "https://api.eia.gov/v2/electricity/rto/region-data/data/" +
    `?api_key=${encodeURIComponent(apiKey)}` +
    "&frequency=hourly&data[0]=value" +
    `&facets[respondent][]=${respondent}` +
    "&facets[type][]=D" +
    "&sort[0][column]=period&sort[0][direction]=desc&length=1";

  try {
    const payload = await fetchJson(url, signal);
    const rows = asArray(asRecord(asRecord(payload)?.response)?.data);
    const row = asRecord(rows[0]);
    const demandMW = asNumber(row?.value);
    if (demandMW === null) throw new Error("no hourly demand rows in EIA response");
    const period = asString(row?.period);

    // This endpoint publishes demand only. Capacity and reserve margin are
    // not derivable from it, so they stay null and stress stays "unknown" —
    // never invent grid-stress numbers.
    const grid: GridSummary = {
      demandMW,
      capacityMW: null,
      reserveMarginPct: null,
      stress: "unknown",
    };
    return {
      grid,
      status: {
        source: EIA_SOURCE,
        state: "degraded",
        fetchedAt,
        detail:
          `hourly demand for ${respondent}${period ? ` (${period})` : ""}; ` +
          "capacity/reserve margin not published on this endpoint",
      },
    };
  } catch (err) {
    return {
      grid: null,
      status: { source: EIA_SOURCE, state: "unavailable", fetchedAt, detail: errorMessage(err) },
    };
  }
}
