import { describe, expect, it } from "vitest";
import type { AllocationPlan, OsintSnapshot, ResourceKind } from "@shared/intelligence";
import { computeRiskScore, planAllocation } from "../server/allocation/engine";
import { getInventory } from "../server/allocation/inventory";
import {
  absurdSnapshot,
  floodSnapshot,
  quietSnapshot,
  severeHeatSnapshot,
} from "./fixtures";

function planFor(snapshot: OsintSnapshot): AllocationPlan {
  const { riskScore, hazardType } = computeRiskScore(snapshot);
  return planAllocation(snapshot, riskScore, hazardType);
}

function allocatedByKind(plan: AllocationPlan): Map<ResourceKind, number> {
  const totals = new Map<ResourceKind, number>();
  for (const line of plan.allocations) {
    totals.set(line.resource, (totals.get(line.resource) ?? 0) + line.allocated);
  }
  return totals;
}

describe("computeRiskScore", () => {
  it("scores a quiet county low", () => {
    const { riskScore } = computeRiskScore(quietSnapshot());
    expect(riskScore).toBeGreaterThanOrEqual(0);
    expect(riskScore).toBeLessThan(25);
  });

  it("scores an extreme heat warning with 109F heat index high, typed extreme_heat", () => {
    const { riskScore, hazardType } = computeRiskScore(severeHeatSnapshot());
    expect(riskScore).toBeGreaterThanOrEqual(60);
    expect(hazardType).toBe("extreme_heat");
  });

  it("scores a flash flood warning with 25,000 cfs discharge high, typed flood", () => {
    const { riskScore, hazardType } = computeRiskScore(floodSnapshot());
    expect(riskScore).toBeGreaterThanOrEqual(50);
    expect(hazardType).toBe("flood");
  });

  it("clamps to 0-100 even when every signal is maxed", () => {
    const { riskScore } = computeRiskScore(absurdSnapshot());
    expect(riskScore).toBeGreaterThanOrEqual(0);
    expect(riskScore).toBeLessThanOrEqual(100);
  });
});

describe("planAllocation", () => {
  const scenarios: Array<[string, OsintSnapshot]> = [
    ["severe heat", severeHeatSnapshot()],
    ["flood", floodSnapshot()],
    ["maxed-out", absurdSnapshot()],
  ];

  it.each(scenarios)("never allocates more than inventory (%s)", (_name, snapshot) => {
    const plan = planFor(snapshot);
    const inventory = getInventory(snapshot.county);

    for (const [kind, total] of allocatedByKind(plan)) {
      const item = inventory.find((i) => i.kind === kind);
      expect(item, `allocation references unknown inventory kind ${kind}`).toBeDefined();
      expect(total).toBeGreaterThanOrEqual(0);
      expect(total).toBeLessThanOrEqual(item!.available);
    }
  });

  it.each(scenarios)(
    "reports unmet need for every resource where demand exceeds inventory (%s)",
    (_name, snapshot) => {
      const plan = planFor(snapshot);
      const inventory = getInventory(snapshot.county);

      for (const [kind, demanded] of Object.entries(plan.demand) as Array<
        [ResourceKind, number]
      >) {
        const available = inventory.find((i) => i.kind === kind)?.available ?? 0;
        if (demanded > available) {
          const need = plan.unmetNeed.find((n) => n.resource === kind);
          expect(need, `expected unmet-need entry for ${kind}`).toBeDefined();
          expect(need!.shortfall).toBeGreaterThan(0);
          expect(need!.mitigation.length).toBeGreaterThan(0);
        }
      }
    },
  );

  it("surfaces unmet need when every signal is maxed", () => {
    // A risk score at the ceiling in a 4.7M-person county must overwhelm any
    // honest static inventory — silence here would mean the demand model or
    // the shortfall accounting is broken.
    const plan = planFor(absurdSnapshot());
    expect(plan.unmetNeed.length).toBeGreaterThan(0);
  });

  it("is deterministic — same snapshot, same plan", () => {
    const snapshot = severeHeatSnapshot();
    const { riskScore, hazardType } = computeRiskScore(snapshot);
    const first = planAllocation(snapshot, riskScore, hazardType);
    const second = planAllocation(snapshot, riskScore, hazardType);
    expect(second).toEqual(first);
  });

  it("carries the driving risk score and hazard type on the plan", () => {
    const snapshot = severeHeatSnapshot();
    const { riskScore, hazardType } = computeRiskScore(snapshot);
    const plan = planAllocation(snapshot, riskScore, hazardType);
    expect(plan.riskScore).toBe(riskScore);
    expect(plan.hazardType).toBe(hazardType);
  });
});
