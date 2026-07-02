import { describe, expect, it } from "vitest";
import type { OsintSnapshot } from "@shared/intelligence";
import { runRulesAnalysis } from "../server/agents/rulesEngine";
import {
  absurdSnapshot,
  floodSnapshot,
  makeSources,
  quietSnapshot,
  severeHeatSnapshot,
} from "./fixtures";

const scenarios: Array<[string, OsintSnapshot]> = [
  ["quiet", quietSnapshot()],
  ["severe heat", severeHeatSnapshot()],
  ["flood", floodSnapshot()],
  ["maxed-out", absurdSnapshot()],
];

describe("runRulesAnalysis", () => {
  it("returns exactly four agents in pipeline order, all in rules mode", () => {
    const result = runRulesAnalysis(severeHeatSnapshot());
    expect(result.agents.map((a) => a.agent)).toEqual([
      "SENTINEL",
      "MEDIC",
      "DISPATCHER",
      "COMMANDER",
    ]);
    for (const agent of result.agents) {
      expect(agent.mode).toBe("rules");
    }
  });

  it("derives confidence from the live-source fraction (3 of 6 live -> 0.5)", () => {
    const snapshot = { ...severeHeatSnapshot(), sources: makeSources(3, 6) };
    const result = runRulesAnalysis(snapshot);
    for (const agent of result.agents) {
      expect(agent.confidence).toBeCloseTo(0.5, 5);
    }
  });

  it.each(scenarios)(
    "maps risk score to decision: <40 MONITOR, 40-69 DEPLOY, >=70 EMERGENCY (%s)",
    (_name, snapshot) => {
      const result = runRulesAnalysis(snapshot);
      const expected =
        result.riskScore >= 70
          ? "EMERGENCY"
          : result.riskScore >= 40
            ? "DEPLOY"
            : "MONITOR";
      expect(result.decision.action).toBe(expected);
    },
  );

  it("decides MONITOR for a quiet county", () => {
    // quiet risk < 25 (asserted in the engine suite), so this must be MONITOR
    const result = runRulesAnalysis(quietSnapshot());
    expect(result.decision.action).toBe("MONITOR");
  });

  it("escalates past MONITOR under an extreme heat warning", () => {
    // heat risk >= 60 (asserted in the engine suite), so DEPLOY or EMERGENCY
    const result = runRulesAnalysis(severeHeatSnapshot());
    expect(result.decision.action).not.toBe("MONITOR");
  });

  it.each(scenarios)("always requires human review (%s)", (_name, snapshot) => {
    const result = runRulesAnalysis(snapshot);
    expect(result.decision.reviewRequired).toBe(true);
  });

  it("puts real snapshot numbers in the summaries — 109F heat index", () => {
    const result = runRulesAnalysis(severeHeatSnapshot());
    const sentinel = result.agents.find((a) => a.agent === "SENTINEL");
    expect(sentinel).toBeDefined();
    expect(sentinel!.summary).toMatch(/109/);
  });

  it("puts real snapshot numbers in the reports — 25,000 cfs discharge", () => {
    const result = runRulesAnalysis(floodSnapshot());
    const allText = result.agents
      .map((a) => [a.summary, ...a.keyFindings].join(" "))
      .join(" ");
    expect(allText).toMatch(/25,?000/);
  });
});
