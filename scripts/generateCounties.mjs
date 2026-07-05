#!/usr/bin/env node
// Generates server/config/nationalCounties.json — every US county (and
// county-equivalent) with coordinates and population, from public Census
// Bureau survey data. Two data needs, each with a primary source and a
// same-provenance fallback (all four verified live):
//
//   Geography (fips / name / state / lat / lon)
//     1. Census 2023 Gazetteer national counties file (tab-separated zip on
//        www2.census.gov).
//     2. Fallback: TIGERweb ACS-vintage Counties layer
//        (tigerweb.geo.census.gov — official Census Bureau, no key).
//
//   Population (total + 65-and-over)
//     1. ACS 5-year data profile via api.census.gov
//        (DP05_0001E = total population, DP05_0024E = 65 and over).
//        As of mid-2025 api.census.gov REQUIRES an API key — set
//        CENSUS_API_KEY to use this source.
//     2. Fallback: Census Reporter (api.censusreporter.org), which serves
//        the ACS 5-year release verbatim, no key. 65+ is the exact B01001
//        identity: males 020–025 + females 044–049 ≡ DP05_0024E.
//
// Rows are inner-joined on the 5-digit county FIPS. Rows that fail
// validation (bad fips, non-finite coordinates, non-positive population,
// seniors outside [0, population]) are DROPPED and reported — never patched
// with invented values. The script exits non-zero if the output fails its
// own sanity gates, so a bad upstream day cannot silently ship a bad file.
// (TIGERweb also carries the Island Areas — AS/GU/MP/VI — which the ACS
// does not cover; the inner join drops those ~13 rows by design.)
//
// Usage: node scripts/generateCounties.mjs
// Requires: node >= 18 (global fetch) and the `unzip` binary on PATH.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GAZETTEER_URL =
  "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2023_Gazetteers/2023_Gaz_counties_national.zip";
const ACS_URL =
  "https://api.census.gov/data/2023/acs/acs5/profile?get=NAME,DP05_0001E,DP05_0024E&for=county:*";
const TIGERWEB_URL =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2024/MapServer/82/query" +
  "?where=1%3D1&outFields=GEOID,NAME,STATE,INTPTLAT,INTPTLON&returnGeometry=false&f=json&orderByFields=GEOID";
const CENSUS_REPORTER_URL =
  "https://api.censusreporter.org/1.0/data/show/acs2024_5yr?table_ids=B01001&geo_ids=050|01000US";

// State FIPS → USPS abbreviation. Stable federal reference codes (FIPS 5-2),
// needed because TIGERweb reports the numeric state code, not the USPS abbr.
const STATE_FIPS_TO_USPS = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO",
  "09": "CT", "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI",
  "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS", "21": "KY",
  "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN",
  "28": "MS", "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
  "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND", "39": "OH",
  "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
  "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA",
  "54": "WV", "55": "WI", "56": "WY", "60": "AS", "66": "GU", "69": "MP",
  "72": "PR", "78": "VI",
};

function fail(message) {
  console.error(`FAILED: ${message}`);
  process.exit(1);
}

// One retry after a short pause, then give up loudly — no fabricated data.
async function fetchWithRetry(url, attempt = 1) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "SentinelClimate/1.0 (info@michaelditter.com)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return res;
  } catch (err) {
    if (attempt >= 2) {
      throw new Error(`unreachable after ${attempt} attempts: ${url} (${err.message})`);
    }
    console.warn(`Retrying ${url} after error: ${err.message}`);
    await new Promise((r) => setTimeout(r, 2000));
    return fetchWithRetry(url, attempt + 1);
  }
}

// --- Geography, primary: 2023 Gazetteer zip --------------------------------

async function fetchGazetteer() {
  console.log(`Geography (primary): ${GAZETTEER_URL}`);
  const res = await fetchWithRetry(GAZETTEER_URL);
  const zipBytes = Buffer.from(await res.arrayBuffer());

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gaz-counties-"));
  const zipPath = path.join(tmpDir, "counties.zip");
  fs.writeFileSync(zipPath, zipBytes);
  let text;
  try {
    // -p streams the (single) member file to stdout.
    text = execFileSync("unzip", ["-p", zipPath], {
      encoding: "utf-8",
      maxBuffer: 64 * 1024 * 1024,
    });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  const header = lines[0].split("\t").map((h) => h.trim());
  const col = (name) => {
    const i = header.indexOf(name);
    if (i === -1) throw new Error(`gazetteer header missing ${name}: ${header.join(", ")}`);
    return i;
  };
  const iUsps = col("USPS");
  const iGeoid = col("GEOID");
  const iName = col("NAME");
  const iLat = col("INTPTLAT");
  const iLon = col("INTPTLONG");

  const rows = new Map();
  for (const line of lines.slice(1)) {
    const parts = line.split("\t").map((p) => p.trim());
    rows.set(parts[iGeoid], {
      fips: parts[iGeoid],
      name: parts[iName],
      state: parts[iUsps],
      lat: Number(parts[iLat]),
      lon: Number(parts[iLon]),
    });
  }
  return rows;
}

// --- Geography, fallback: TIGERweb Counties layer ---------------------------

async function fetchTigerweb() {
  console.log(`Geography (fallback): ${TIGERWEB_URL}`);
  const rows = new Map();
  // maxRecordCount is 100k (all counties fit in one page), but honor
  // exceededTransferLimit anyway in case the service tightens its limits.
  for (let offset = 0; ; ) {
    const res = await fetchWithRetry(`${TIGERWEB_URL}&resultOffset=${offset}`);
    const payload = await res.json();
    if (payload.error) throw new Error(`TIGERweb error: ${JSON.stringify(payload.error)}`);
    const features = Array.isArray(payload.features) ? payload.features : [];
    for (const feature of features) {
      const a = feature?.attributes ?? {};
      const fips = String(a.GEOID ?? "");
      rows.set(fips, {
        fips,
        name: String(a.NAME ?? ""),
        state: STATE_FIPS_TO_USPS[String(a.STATE ?? "")] ?? "",
        lat: Number(a.INTPTLAT),
        lon: Number(a.INTPTLON),
      });
    }
    if (!payload.exceededTransferLimit || features.length === 0) break;
    offset += features.length;
  }
  return rows;
}

// --- Population, primary: ACS profile via api.census.gov --------------------

async function fetchAcs() {
  const key = process.env.CENSUS_API_KEY;
  const url = key ? `${ACS_URL}&key=${encodeURIComponent(key)}` : ACS_URL;
  console.log(`Population (primary): ${ACS_URL}${key ? " (+key)" : ""}`);
  const res = await fetchWithRetry(url);
  // Keyless requests get 302-redirected to an HTML "missing key" page;
  // res.json() then throws and we fall through to Census Reporter.
  const payload = await res.json();
  if (!Array.isArray(payload) || payload.length < 2) {
    throw new Error("ACS payload is not a data table");
  }

  const header = payload[0];
  const col = (name) => {
    const i = header.indexOf(name);
    if (i === -1) throw new Error(`ACS header missing ${name}: ${header.join(", ")}`);
    return i;
  };
  const iPop = col("DP05_0001E");
  const iSeniors = col("DP05_0024E");
  const iState = col("state");
  const iCounty = col("county");

  const rows = new Map();
  for (const row of payload.slice(1)) {
    const fips = `${row[iState]}${row[iCounty]}`;
    rows.set(fips, {
      population: Number(row[iPop]),
      seniors: Number(row[iSeniors]),
    });
  }
  return rows;
}

// --- Population, fallback: ACS 5-year B01001 via Census Reporter ------------

async function fetchCensusReporter() {
  console.log(`Population (fallback): ${CENSUS_REPORTER_URL}`);
  const res = await fetchWithRetry(CENSUS_REPORTER_URL);
  const payload = await res.json();
  const data = payload?.data;
  if (typeof data !== "object" || data === null) {
    throw new Error("Census Reporter payload has no data object");
  }
  console.log(`  release: ${payload?.release?.name ?? "unknown"}`);

  // 65-and-over from B01001 (Sex by Age): males 020–025 + females 044–049.
  const SENIOR_CELLS = [20, 21, 22, 23, 24, 25, 44, 45, 46, 47, 48, 49].map(
    (i) => `B01001${String(i).padStart(3, "0")}`,
  );
  const rows = new Map();
  for (const [geoid, tables] of Object.entries(data)) {
    // County geoids look like "05000US48201" — the fips is the last 5 chars.
    const fips = geoid.slice(-5);
    const est = tables?.B01001?.estimate ?? {};
    let seniors = 0;
    let missing = false;
    for (const cell of SENIOR_CELLS) {
      const v = Number(est[cell]);
      if (!Number.isFinite(v)) missing = true;
      else seniors += v;
    }
    rows.set(fips, {
      population: Number(est.B01001001),
      seniors: missing ? NaN : seniors, // NaN → row dropped by validation
    });
  }
  return rows;
}

// --- Assemble ----------------------------------------------------------------

function validRow(row) {
  if (!/^\d{5}$/.test(row.fips)) return `bad fips "${row.fips}"`;
  if (!row.name) return "empty name";
  if (!/^[A-Z]{2}$/.test(row.state)) return `bad state "${row.state}"`;
  if (!Number.isFinite(row.lat) || row.lat <= -90 || row.lat >= 90) return `bad lat ${row.lat}`;
  if (!Number.isFinite(row.lon) || row.lon < -180 || row.lon > 180) return `bad lon ${row.lon}`;
  // ACS sentinel values for suppressed estimates are large negatives —
  // caught here and the row is dropped rather than clamped.
  if (!Number.isFinite(row.population) || row.population <= 0) {
    return `bad population ${row.population}`;
  }
  if (!Number.isFinite(row.seniors) || row.seniors < 0 || row.seniors > row.population) {
    return `bad seniors ${row.seniors} (population ${row.population})`;
  }
  return null;
}

async function withFallback(label, primary, fallback) {
  try {
    return await primary();
  } catch (err) {
    console.warn(`${label} primary source failed: ${err.message}`);
    return fallback();
  }
}

const gazetteer = await withFallback("Geography", fetchGazetteer, fetchTigerweb);
console.log(`Geography rows: ${gazetteer.size}`);
const acs = await withFallback("Population", fetchAcs, fetchCensusReporter);
console.log(`Population rows: ${acs.size}`);

const out = [];
const dropped = [];
for (const [fips, geo] of gazetteer) {
  const pop = acs.get(fips);
  if (!pop) {
    dropped.push(`${fips} ${geo.name}, ${geo.state}: no population row`);
    continue;
  }
  const row = {
    fips: geo.fips,
    name: geo.name,
    state: geo.state,
    lat: Math.round(geo.lat * 1e6) / 1e6,
    lon: Math.round(geo.lon * 1e6) / 1e6,
    population: pop.population,
    seniors: pop.seniors,
  };
  const problem = validRow(row);
  if (problem) {
    dropped.push(`${fips} ${geo.name}, ${geo.state}: ${problem}`);
    continue;
  }
  out.push(row);
}
out.sort((a, b) => a.fips.localeCompare(b.fips));

if (dropped.length > 0) {
  console.warn(`Dropped ${dropped.length} rows:`);
  for (const d of dropped) console.warn(`  - ${d}`);
}

// --- Sanity gates: refuse to write a file that fails any of these. ----------

if (out.length <= 3000) fail(`only ${out.length} rows — expected > 3000`);
const fipsSet = new Set(out.map((r) => r.fips));
if (fipsSet.size !== out.length) fail("duplicate fips codes in output");
const harris = out.find((r) => r.fips === "48201");
if (!harris) fail("Harris County 48201 missing");
if (harris.population < 4_600_000 || harris.population > 4_950_000) {
  fail(`Harris County population ${harris.population} outside the expected 4.6-4.95M band`);
}
if (Math.abs(harris.lat - 29.86) > 0.5 || Math.abs(harris.lon - -95.4) > 0.5) {
  fail(`Harris County coordinates look wrong: ${harris.lat}, ${harris.lon}`);
}
if (!out.find((r) => r.fips === "06037")) fail("Los Angeles County 06037 missing");
if (!out.find((r) => r.fips === "17031")) fail("Cook County 17031 missing");

const OUT_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "server",
  "config",
  "nationalCounties.json",
);
// One row per line: readable diffs when the dataset is regenerated.
const json = `[\n${out.map((r) => JSON.stringify(r)).join(",\n")}\n]\n`;
fs.writeFileSync(OUT_PATH, json);
console.log(`Wrote ${out.length} counties to ${OUT_PATH}`);
