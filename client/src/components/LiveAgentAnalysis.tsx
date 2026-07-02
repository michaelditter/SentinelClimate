import React, { useEffect, useState } from 'react';
import { AlertTriangle, Bot, Loader2, Radio } from 'lucide-react';
import type {
  AgentReport,
  AnalysisMode,
  CountyRef,
  CrisisAssessment,
  SourceState,
} from '@shared/intelligence';

// Panel that drives the real OSINT → multi-agent → allocation pipeline.
// Everything rendered here comes from POST /api/agents/analyze; the provenance
// strip shows exactly which data feeds were live when the snapshot was taken.

interface SystemHealth {
  status: string;
  mode: AnalysisMode;
}

const DECISION_STYLES: Record<CrisisAssessment['decision']['action'], string> = {
  MONITOR: 'bg-green-600 text-white',
  DEPLOY: 'bg-amber-500 text-gray-900',
  EMERGENCY: 'bg-red-600 text-white',
};

const RISK_LEVEL_STYLES: Record<AgentReport['riskLevel'], string> = {
  monitor: 'bg-green-500/15 text-green-400 border border-green-500/40',
  elevated: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/40',
  deploy: 'bg-amber-500/15 text-amber-400 border border-amber-500/40',
  emergency: 'bg-red-500/15 text-red-400 border border-red-500/40',
};

const SOURCE_STYLES: Record<SourceState, string> = {
  live: 'bg-green-500/15 text-green-400 border-green-500/40',
  degraded: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
  unavailable: 'bg-gray-600/30 text-gray-400 border-gray-600',
};

const SOURCE_DOT_STYLES: Record<SourceState, string> = {
  live: 'bg-green-400',
  degraded: 'bg-amber-400',
  unavailable: 'bg-gray-500',
};

const prettyKind = (kind: string): string => kind.replace(/_/g, ' ');

const LiveAgentAnalysis: React.FC = () => {
  const [counties, setCounties] = useState<CountyRef[]>([]);
  const [selectedFips, setSelectedFips] = useState<string>('');
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [assessment, setAssessment] = useState<CrisisAssessment | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/counties/registry')
      .then((res) => {
        if (!res.ok) throw new Error(`County registry unavailable (${res.status})`);
        return res.json() as Promise<CountyRef[]>;
      })
      .then((list) => {
        if (cancelled) return;
        setCounties(list);
        if (list.length > 0) setSelectedFips((prev) => prev || list[0].fips);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });

    fetch('/api/system/health')
      .then((res) => (res.ok ? (res.json() as Promise<SystemHealth>) : null))
      .then((h) => {
        if (!cancelled && h) setHealth(h);
      })
      .catch(() => {
        // Health probe is informational only; the run button still works.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const runAnalysis = async () => {
    if (!selectedFips || running) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/agents/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ county: selectedFips }),
      });
      if (!res.ok) {
        let message = `Analysis failed (HTTP ${res.status})`;
        try {
          const body = await res.json();
          if (typeof body?.error === 'string') message = body.error;
          else if (typeof body?.message === 'string') message = body.message;
        } catch {
          // Non-JSON error body; keep the status message.
        }
        throw new Error(message);
      }
      setAssessment((await res.json()) as CrisisAssessment);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      {/* Panel header + controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h3 className="text-xl font-bold flex items-center text-gray-100">
          <Bot className="h-5 w-5 mr-2" />
          Live Multi-Agent Analysis
        </h3>
        {health && (
          <span
            className={`text-xs px-2 py-1 rounded border ${
              health.mode === 'ai'
                ? 'bg-blue-500/15 text-blue-300 border-blue-500/40'
                : 'bg-gray-600/30 text-gray-300 border-gray-600'
            }`}
          >
            {health.mode === 'ai'
              ? 'Engine: AI (Claude) configured'
              : 'Engine: deterministic rules — no ANTHROPIC_API_KEY set'}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={selectedFips}
          onChange={(e) => setSelectedFips(e.target.value)}
          disabled={running || counties.length === 0}
          className="bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        >
          {counties.length === 0 && <option value="">Loading counties…</option>}
          {counties.map((c) => (
            <option key={c.fips} value={c.fips}>
              {c.name}, {c.state} · pop {c.population.toLocaleString()}
            </option>
          ))}
        </select>
        <button
          onClick={runAnalysis}
          disabled={running || !selectedFips}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
        >
          {running ? 'Analyzing…' : 'Run Multi-Agent Analysis'}
        </button>
      </div>

      {running && (
        <div className="flex items-center gap-3 bg-gray-700 rounded-lg p-4 mb-4">
          <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
          <div>
            <div className="text-sm text-gray-100">
              Agents analyzing — SENTINEL → MEDIC → DISPATCHER → COMMANDER
            </div>
            <div className="text-xs text-gray-400">
              Live OSINT collection plus agent reasoning; this can take 30–90 seconds in AI mode.
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/40 rounded-lg p-3 mb-4">
          <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
          <span className="text-sm text-red-300">{error}</span>
        </div>
      )}

      {!assessment && !running && !error && (
        <p className="text-sm text-gray-400">
          Pick a county and run the pipeline: live OSINT snapshot → four-agent assessment →
          resource-allocation plan. Every result carries per-source provenance.
        </p>
      )}

      {assessment && (
        <div className="space-y-5">
          {/* Decision header */}
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`px-3 py-1 rounded-lg text-sm font-bold ${DECISION_STYLES[assessment.decision.action]}`}
            >
              {assessment.decision.action}
            </span>
            <span className="text-gray-100 font-bold text-lg">
              Risk {assessment.allocation.riskScore}/100
            </span>
            <span
              className={`text-xs px-2 py-1 rounded border ${
                assessment.mode === 'ai'
                  ? 'bg-blue-500/15 text-blue-300 border-blue-500/40'
                  : 'bg-gray-600/30 text-gray-300 border-gray-600'
              }`}
            >
              {assessment.mode === 'ai'
                ? `AI (${assessment.model ?? 'model unknown'})`
                : 'Rules engine — deterministic fallback, not AI'}
            </span>
            {assessment.cached && (
              <span className="text-xs px-2 py-1 rounded border bg-amber-500/15 text-amber-300 border-amber-500/40">
                Cached — generated {new Date(assessment.generatedAt).toLocaleTimeString()}
              </span>
            )}
            <span className="text-xs text-gray-400">
              {assessment.county.name}, {assessment.county.state} ·{' '}
              {new Date(assessment.generatedAt).toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-gray-300">{assessment.decision.rationale}</p>

          {/* Data provenance — which feeds were actually live for this snapshot */}
          <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center text-sm font-bold text-gray-100 mb-2">
              <Radio className="h-4 w-4 mr-2" />
              Data provenance
            </div>
            <div className="flex flex-wrap gap-2">
              {assessment.snapshot.sources.map((s) => (
                <span
                  key={s.source}
                  title={`${s.detail ?? s.state} · fetched ${new Date(s.fetchedAt).toLocaleTimeString()}`}
                  className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded border ${SOURCE_STYLES[s.state]}`}
                >
                  <span className={`h-2 w-2 rounded-full ${SOURCE_DOT_STYLES[s.state]}`} />
                  {s.source} · {s.state}
                </span>
              ))}
            </div>
          </div>

          {/* Agent reports */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {assessment.agents.map((agent) => (
              <div key={agent.agent} className="bg-gray-700 rounded-lg p-4 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-gray-100 text-sm">{agent.agent}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${RISK_LEVEL_STYLES[agent.riskLevel]}`}
                  >
                    {agent.riskLevel}
                  </span>
                </div>
                <p className="text-xs text-gray-300 mb-2">{agent.summary}</p>
                {agent.keyFindings.length > 0 && (
                  <ul className="text-xs text-gray-400 list-disc list-inside space-y-1 mb-2">
                    {agent.keyFindings.map((finding) => (
                      <li key={finding}>{finding}</li>
                    ))}
                  </ul>
                )}
                <div className="text-xs text-gray-500 mt-auto pt-1">
                  data completeness {Math.round(agent.confidence * 100)}%
                </div>
              </div>
            ))}
          </div>

          {/* Allocation plan */}
          <div>
            <h4 className="text-sm font-bold text-gray-100 mb-2">Resource allocation plan</h4>
            {assessment.allocation.allocations.length === 0 ? (
              <p className="text-sm text-gray-400">No resources allocated at this risk level.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-700">
                      <th className="py-2 pr-4 font-medium">Resource</th>
                      <th className="py-2 pr-4 font-medium">Allocated</th>
                      <th className="py-2 pr-4 font-medium">Target area</th>
                      <th className="py-2 font-medium">Rationale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessment.allocation.allocations.map((line) => (
                      <tr
                        key={`${line.resource}-${line.targetArea}`}
                        className="border-b border-gray-700/60"
                      >
                        <td className="py-2 pr-4 text-gray-100">{line.label}</td>
                        <td className="py-2 pr-4 text-gray-100 whitespace-nowrap">
                          {line.allocated.toLocaleString()} {line.unit}
                        </td>
                        <td className="py-2 pr-4 text-gray-300">{line.targetArea}</td>
                        <td className="py-2 text-gray-400">{line.rationale}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {assessment.allocation.unmetNeed.length > 0 && (
              <div className="mt-3 bg-red-500/10 border border-red-500/40 rounded-lg p-3 space-y-1">
                <div className="text-xs font-bold text-red-300">Unmet need</div>
                {assessment.allocation.unmetNeed.map((need) => (
                  <div key={need.resource} className="text-xs text-red-200">
                    {prettyKind(need.resource)}: short {need.shortfall.toLocaleString()} {need.unit}{' '}
                    — {need.mitigation}
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500">{assessment.disclaimer}</p>
        </div>
      )}
    </div>
  );
};

export default LiveAgentAnalysis;
