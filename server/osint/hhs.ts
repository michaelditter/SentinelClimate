import type { CountyRef, HospitalCapacitySummary, SourceStatus } from "../../shared/intelligence";
import { asArray, asNumber, asRecord, asString, errorMessage, fetchJson } from "./http";

export const HHS_SOURCE = "HHS Hospital Capacity";

// HHS Protect state-level hospital utilization (healthdata.gov Socrata dataset
// g62h-syeh). This was a COVID-era mandatory reporting feed, so the latest row
// can lag by months or years — anything older than STALE_AFTER_DAYS is
// reported as "degraded" with the real report date in the detail. We still
// surface whatever real values exist; we never substitute invented occupancy.
const DATASET_URL = "https://healthdata.gov/resource/g62h-syeh.json";
const STALE_AFTER_DAYS = 90;

function pctOf(used: number | null, total: number | null): number | null {
  if (used === null || total === null || total <= 0) return null;
  return Math.round((used / total) * 1000) / 10;
}

export async function fetchHospitalCapacity(
  county: CountyRef,
  signal?: AbortSignal,
): Promise<{ capacity: HospitalCapacitySummary | null; status: SourceStatus }> {
  const fetchedAt = new Date().toISOString();

  const params = new URLSearchParams({
    state: county.state,
    $order: "date DESC",
    $limit: "1",
  });

  let payload: unknown;
  try {
    payload = await fetchJson(`${DATASET_URL}?${params.toString()}`, signal);
  } catch (err) {
    return {
      capacity: null,
      status: { source: HHS_SOURCE, state: "unavailable", fetchedAt, detail: errorMessage(err) },
    };
  }

  const row = asRecord(asArray(payload)[0]);
  if (!row) {
    return {
      capacity: null,
      status: {
        source: HHS_SOURCE,
        state: "unavailable",
        fetchedAt,
        detail: `no hospital-utilization rows for ${county.state}`,
      },
    };
  }

  const reportedAt = asString(row.date);
  const capacity: HospitalCapacitySummary = {
    scope: "state",
    inpatientOccupancyPct: pctOf(
      asNumber(row.inpatient_beds_used),
      asNumber(row.inpatient_beds),
    ),
    icuOccupancyPct: pctOf(
      asNumber(row.staffed_adult_icu_bed_occupancy),
      asNumber(row.total_staffed_adult_icu_beds),
    ),
    reportedAt,
  };

  const reportedMs = reportedAt !== null ? Date.parse(reportedAt) : NaN;
  const ageDays = Number.isNaN(reportedMs)
    ? null
    : (Date.now() - reportedMs) / (24 * 60 * 60 * 1000);
  const stale = ageDays === null || ageDays > STALE_AFTER_DAYS;
  const incomplete =
    capacity.inpatientOccupancyPct === null && capacity.icuOccupancyPct === null;

  if (stale || incomplete) {
    const reasons: string[] = [];
    if (stale) {
      reasons.push(
        `federal feed is stale — latest ${county.state} report ${
          reportedAt ?? "has no date"
        }${ageDays !== null ? ` (${Math.round(ageDays)} days old)` : ""}`,
      );
    }
    if (incomplete) reasons.push("occupancy fields are null in the latest row");
    return {
      capacity,
      status: {
        source: HHS_SOURCE,
        state: "degraded",
        fetchedAt,
        detail: `${reasons.join("; ")}; reporting real values only, nothing imputed`,
      },
    };
  }

  return {
    capacity,
    status: {
      source: HHS_SOURCE,
      state: "live",
      fetchedAt,
      detail: `state-level utilization for ${county.state}, reported ${reportedAt}`,
    },
  };
}
