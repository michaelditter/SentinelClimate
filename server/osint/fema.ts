import type { CountyRef, DisasterDeclaration, SourceStatus } from "@shared/intelligence";
import { asArray, asNumber, asRecord, asString, errorMessage, fetchJson } from "./http";

export const FEMA_SOURCE = "FEMA Disaster Declarations";

const LOOKBACK_DAYS = 120;

export async function fetchDisasterDeclarations(
  county: CountyRef,
  signal?: AbortSignal,
): Promise<{ declarations: DisasterDeclaration[]; status: SourceStatus }> {
  const fetchedAt = new Date().toISOString();

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const filter = `state eq '${county.state}' and declarationDate ge '${since}'`;
  const url =
    "https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries" +
    `?$filter=${encodeURIComponent(filter)}` +
    "&$orderby=declarationDate%20desc&$top=20";

  let payload: unknown;
  try {
    payload = await fetchJson(url, signal);
  } catch (err) {
    return {
      declarations: [],
      status: { source: FEMA_SOURCE, state: "unavailable", fetchedAt, detail: errorMessage(err) },
    };
  }

  // OpenFEMA returns one row per designated area, so the same disaster number
  // shows up repeatedly. Keep rows naming this county plus statewide ones;
  // rows designated only for other counties are dropped.
  const countyMatches: DisasterDeclaration[] = [];
  const statewide: DisasterDeclaration[] = [];
  const countyName = county.name.toLowerCase();
  const rows = asArray(asRecord(payload)?.DisasterDeclarationsSummaries);

  for (const entry of rows) {
    const row = asRecord(entry);
    if (!row) continue;

    const disasterNumber = asNumber(row.disasterNumber);
    const declaration: DisasterDeclaration = {
      id:
        asString(row.femaDeclarationString) ??
        (disasterNumber !== null ? String(disasterNumber) : asString(row.id) ?? "unknown"),
      declarationType: asString(row.declarationType) ?? "unknown",
      incidentType: asString(row.incidentType) ?? "unknown",
      title: asString(row.declarationTitle) ?? "Untitled declaration",
      state: asString(row.state) ?? county.state,
      declaredAt: asString(row.declarationDate) ?? "",
      designatedArea: asString(row.designatedArea) ?? undefined,
    };

    // OpenFEMA formats designatedArea as "Harris (County)" — strip the
    // parentheses so it matches "harris county".
    const area = (declaration.designatedArea ?? "").toLowerCase().replace(/[()]/g, "");
    if (area.includes(countyName)) countyMatches.push(declaration);
    else if (!area || area.includes("statewide")) statewide.push(declaration);
  }

  // County-specific rows first, then statewide, deduped by declaration id.
  const seen = new Set<string>();
  const declarations: DisasterDeclaration[] = [];
  for (const d of [...countyMatches, ...statewide]) {
    if (seen.has(d.id)) continue;
    seen.add(d.id);
    declarations.push(d);
  }

  return {
    declarations,
    status: {
      source: FEMA_SOURCE,
      state: "live",
      fetchedAt,
      detail:
        `${rows.length} ${county.state} declaration row(s) in last ${LOOKBACK_DAYS} days; ` +
        `${declarations.length} relevant to ${county.name} (county or statewide)`,
    },
  };
}
