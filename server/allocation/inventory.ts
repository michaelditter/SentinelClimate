// ASSUMPTION: no live EMS/hospital/logistics feeds are connected yet, so every
// figure here is a deterministic planning-grade estimate scaled from county
// population (per-capita ratios in line with FEMA/ASPR planning guidance).
// These are NOT live availability numbers. countyProfiles.ts carries provider
// baselines (physician counts), not deployable-asset counts, so formulas are
// used for every resource kind. Replace with live feeds when they land; until
// then, degraded provenance is carried on the OsintSnapshot source list.

import type { CountyRef, ResourceInventoryItem } from "@shared/intelligence";

// Counties on the Texas Gulf Coast keep an enlarged high-water fleet.
const COASTAL_TX_FIPS = new Set(["48201", "48245"]);

export function getInventory(county: CountyRef): ResourceInventoryItem[] {
  const pop = county.population;
  // 2.4 staffed hospital beds per 1,000 residents; 15% surge headroom is what
  // can actually be offered up in an emergency, so "available" counts only that.
  const staffedBeds = Math.round((pop * 2.4) / 1000);

  return [
    {
      kind: "cooling_center",
      label: "Cooling centers",
      available: Math.max(8, Math.round(pop / 300_000)),
      unit: "sites",
    },
    {
      kind: "shelter",
      label: "Emergency shelters (200 beds each)",
      available: Math.round(pop / 250_000),
      unit: "units",
    },
    {
      kind: "ambulance",
      label: "Ambulances (ALS/BLS)",
      available: Math.round(pop / 25_000),
      unit: "vehicles",
    },
    {
      kind: "high_water_vehicle",
      label: "High-water rescue vehicles",
      available: 6 + (COASTAL_TX_FIPS.has(county.fips) ? 12 : 0),
      unit: "vehicles",
    },
    {
      kind: "medical_team",
      label: "Medical strike teams",
      available: Math.round(pop / 400_000),
      unit: "teams",
    },
    {
      kind: "hospital_beds",
      label: "Hospital surge beds (15% headroom over staffed capacity)",
      available: Math.round(staffedBeds * 0.15),
      unit: "beds",
    },
    {
      kind: "generator",
      label: "Industrial backup generators",
      available: Math.round(pop / 500_000) + 4,
      unit: "units",
    },
    {
      kind: "water_supply",
      label: "Potable water",
      available: Math.round(pop / 100_000),
      unit: "pallets/day",
    },
    {
      kind: "outreach_team",
      label: "Community outreach teams",
      available: Math.round(pop / 300_000),
      unit: "teams",
    },
  ];
}
