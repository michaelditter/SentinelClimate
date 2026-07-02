import type { CountyRef, FloodGaugeReading, SourceStatus } from "@shared/intelligence";
import { asArray, asNumber, asRecord, asString, errorMessage, fetchJson } from "./http";

export const USGS_SOURCE = "USGS Water Services";

// USGS instantaneous-values no-data sentinel.
const NO_DATA_SENTINEL = -999999;

const PARAM_GAGE_HEIGHT_FT = "00065";
const PARAM_DISCHARGE_CFS = "00060";

export async function fetchFloodGauges(
  county: CountyRef,
  signal?: AbortSignal,
): Promise<{ gauges: FloodGaugeReading[]; status: SourceStatus }> {
  const fetchedAt = new Date().toISOString();

  const locator = county.usgsSiteIds?.length
    ? `sites=${county.usgsSiteIds.join(",")}`
    : `countyCd=${county.fips}`;
  const url =
    "https://waterservices.usgs.gov/nwis/iv/?format=json" +
    `&parameterCd=${PARAM_GAGE_HEIGHT_FT},${PARAM_DISCHARGE_CFS}` +
    `&siteStatus=active&${locator}`;

  let payload: unknown;
  try {
    payload = await fetchJson(url, signal);
  } catch (err) {
    return {
      gauges: [],
      status: { source: USGS_SOURCE, state: "unavailable", fetchedAt, detail: errorMessage(err) },
    };
  }

  const timeSeries = asArray(asRecord(asRecord(payload)?.value)?.timeSeries);
  const bySite = new Map<string, FloodGaugeReading>();

  for (const entry of timeSeries) {
    const series = asRecord(entry);
    if (!series) continue;

    const sourceInfo = asRecord(series.sourceInfo);
    const siteCode = asRecord(asArray(sourceInfo?.siteCode)[0]);
    const siteId = asString(siteCode?.value);
    if (!siteId) continue;

    const variableCode = asRecord(asArray(asRecord(series.variable)?.variableCode)[0]);
    const paramCd = asString(variableCode?.value);

    const latest = latestSeriesValue(series);

    const reading = bySite.get(siteId) ?? {
      siteId,
      siteName: asString(sourceInfo?.siteName) ?? siteId,
      gageHeightFt: null,
      dischargeCfs: null,
    };
    if (paramCd === PARAM_GAGE_HEIGHT_FT) reading.gageHeightFt = latest;
    else if (paramCd === PARAM_DISCHARGE_CFS) reading.dischargeCfs = latest;
    bySite.set(siteId, reading);
  }

  const gauges = Array.from(bySite.values());
  return {
    gauges,
    status: {
      source: USGS_SOURCE,
      state: "live",
      fetchedAt,
      detail: `${gauges.length} gauge(s) reporting`,
    },
  };
}

// A time series can carry multiple value blocks, each with its own array of
// readings; take the newest reading across all of them.
function latestSeriesValue(series: Record<string, unknown>): number | null {
  let latest: { time: number; value: number } | null = null;
  for (const block of asArray(series.values)) {
    for (const v of asArray(asRecord(block)?.value)) {
      const rec = asRecord(v);
      const value = asNumber(rec?.value);
      if (value === null || value === NO_DATA_SENTINEL) continue;
      const parsed = Date.parse(asString(rec?.dateTime) ?? "");
      const time = Number.isNaN(parsed) ? 0 : parsed;
      if (!latest || time >= latest.time) latest = { time, value };
    }
  }
  return latest?.value ?? null;
}
