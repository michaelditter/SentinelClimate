import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bot, Loader2, Radio, Search, TrendingUp } from 'lucide-react';
import type {
  AgentReport,
  AnalysisMode,
  CountyRef,
  CrisisAssessment,
  RiskTrajectory,
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

// Defensive parse of /api/counties/search results — the national-registry
// endpoint may return a bare array or a wrapped {results}/{counties} object.
const parseCountyList = (body: unknown): CountyRef[] => {
  const anyBody = body as { results?: unknown; counties?: unknown } | null;
  const raw = Array.isArray(body)
    ? body
    : Array.isArray(anyBody?.results)
      ? anyBody.results
      : Array.isArray(anyBody?.counties)
        ? anyBody.counties
        : [];
  return (raw as CountyRef[]).filter(
    (c) => c && typeof c.fips === 'string' && typeof c.name === 'string',
  );
};

type SearchStatus = 'idle' | 'loading' | 'error' | 'unavailable';

const LiveAgentAnalysis: React.FC = () => {
  const [counties, setCounties] = useState<CountyRef[]>([]);
  const [selectedFips, setSelectedFips] = useState<string>('');
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [assessment, setAssessment] = useState<CrisisAssessment | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // County search (national registry) + selection handed in from other panels.
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CountyRef[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle');
  // A county picked via search/event that isn't in the curated quick-pick list.
  const [extraCounty, setExtraCounty] = useState<CountyRef | null>(null);
  // 72h risk trajectory for the last assessment (null-safe: endpoint may 404).
  const [trajectory, setTrajectory] = useState<RiskTrajectory | null>(null);
  const countiesRef = useRef<CountyRef[]>([]);

  useEffect(() => {
    countiesRef.current = counties;
  }, [counties]);

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

  // Debounced (250ms) county search against the national registry.
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      setSearchStatus('idle');
      return;
    }
    let cancelled = false;
    setSearchStatus('loading');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/counties/search?q=${encodeURIComponent(q)}`);
        if (cancelled) return;
        if (!res.ok) {
          setSearchResults([]);
          setSearchStatus(res.status === 404 ? 'unavailable' : 'error');
          setSearchOpen(true);
          return;
        }
        const list = parseCountyList(await res.json());
        if (cancelled) return;
        setSearchResults(list.slice(0, 12));
        setSearchStatus('idle');
        setSearchOpen(true);
      } catch {
        if (!cancelled) {
          setSearchResults([]);
          setSearchStatus('error');
          setSearchOpen(true);
        }
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Other panels (e.g. the National Risk Board) hand a county over via
  // window CustomEvent('sentinel:selectCounty', { detail: fips }).
  useEffect(() => {
    const onSelect = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const fips = typeof detail === 'string' ? detail.trim() : '';
      if (!fips) return;
      setSelectedFips(fips);
      if (countiesRef.current.some((c) => c.fips === fips)) return;
      // Not a curated county — show a placeholder label, then try to upgrade
      // it from the national registry (best-effort; the endpoint may 404).
      setExtraCounty({
        fips,
        name: `County FIPS ${fips}`,
        state: '',
        population: 0,
        vulnerablePopulation: 0,
        lat: 0,
        lon: 0,
      });
      fetch(`/api/counties/search?q=${encodeURIComponent(fips)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((body) => {
          const match = body ? parseCountyList(body).find((c) => c.fips === fips) : undefined;
          if (match) setExtraCounty(match);
        })
        .catch(() => {
          // Placeholder label stays; the analysis still resolves by FIPS.
        });
    };
    window.addEventListener('sentinel:selectCounty', onSelect);
    return () => window.removeEventListener('sentinel:selectCounty', onSelect);
  }, []);

  // 72h risk trajectory for the assessed county. Null-safe by design: the
  // endpoint may not be deployed yet (404) or return {trajectory: null}.
  useEffect(() => {
    setTrajectory(null);
    if (!assessment) return;
    let cancelled = false;
    fetch(`/api/trajectory/${assessment.county.fips}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (cancelled) return;
        const t = body?.trajectory;
        if (t && Array.isArray(t.points) && t.points.length > 0) {
          setTrajectory(t as RiskTrajectory);
        }
      })
      .catch(() => {
        // No trajectory — the panel simply omits the sparkline.
      });
    return () => {
      cancelled = true;
    };
  }, [assessment]);

  const pickSearchResult = (county: CountyRef) => {
    if (!countiesRef.current.some((c) => c.fips === county.fips)) {
      setExtraCounty(county);
    }
    setSelectedFips(county.fips);
    setSearchQuery('');
    setSearchResults([]);
    setSearchOpen(false);
  };

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
          {extraCounty && !counties.some((c) => c.fips === extraCounty.fips) && (
            <option value={extraCounty.fips}>
              {extraCounty.name}
              {extraCounty.state ? `, ${extraCounty.state}` : ''}
              {extraCounty.population > 0
                ? ` · pop ${extraCounty.population.toLocaleString()}`
                : ''}
            </option>
          )}
        </select>
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setSearchOpen(true);
            }}
            onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
            placeholder="Search any US county…"
            disabled={running}
            className="bg-gray-700 text-gray-100 placeholder-gray-500 border border-gray-600 rounded-lg pl-9 pr-3 py-2 text-sm w-60 focus:outline-none focus:border-blue-500"
          />
          {searchOpen && (
            <div className="absolute z-20 mt-1 w-72 max-h-64 overflow-auto bg-gray-800 border border-gray-600 rounded-lg shadow-xl">
              {searchStatus === 'loading' && (
                <div className="px-3 py-2 text-xs text-gray-400">Searching…</div>
              )}
              {searchStatus === 'unavailable' && (
                <div className="px-3 py-2 text-xs text-gray-400">
                  County search unavailable — national registry endpoint not deployed.
                </div>
              )}
              {searchStatus === 'error' && (
                <div className="px-3 py-2 text-xs text-red-300">County search failed — try again.</div>
              )}
              {searchStatus === 'idle' && searchResults.length === 0 && (
                <div className="px-3 py-2 text-xs text-gray-400">
                  No counties match “{searchQuery.trim()}”.
                </div>
              )}
              {searchResults.map((c) => (
                <button
                  key={c.fips}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickSearchResult(c)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-100 hover:bg-gray-700 transition-colors"
                >
                  {c.name}, {c.state} · pop {c.population.toLocaleString()}
                </button>
              ))}
            </div>
          )}
        </div>
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

          {/* 72h projected risk trajectory (only when the endpoint returns one) */}
          {trajectory && trajectory.points.length > 1 && (
            <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center text-sm font-bold text-gray-100">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  72h risk trajectory
                </div>
                {trajectory.peak && (
                  <span className="text-xs px-2 py-1 rounded border bg-amber-500/15 text-amber-300 border-amber-500/40">
                    Risk peaks{' '}
                    {new Date(trajectory.peak.at).toLocaleString('en-US', {
                      weekday: 'long',
                      hour: 'numeric',
                    })}{' '}
                    at {trajectory.peak.riskScore}
                  </span>
                )}
              </div>
              <svg
                viewBox="0 0 300 64"
                preserveAspectRatio="none"
                className="w-full h-16"
                role="img"
                aria-label="Projected risk score over the next 72 hours"
              >
                {/* DEPLOY (40) and EMERGENCY (70) threshold guides */}
                <line x1="0" y1={62 - (40 / 100) * 60} x2="300" y2={62 - (40 / 100) * 60} stroke="#f59e0b" strokeOpacity="0.25" strokeDasharray="4 4" strokeWidth="1" />
                <line x1="0" y1={62 - (70 / 100) * 60} x2="300" y2={62 - (70 / 100) * 60} stroke="#ef4444" strokeOpacity="0.25" strokeDasharray="4 4" strokeWidth="1" />
                <polyline
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="1.5"
                  points={trajectory.points
                    .map((p, i) => {
                      const x = (i / (trajectory.points.length - 1)) * 300;
                      const y = 62 - (Math.max(0, Math.min(100, p.riskScore)) / 100) * 60;
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    })
                    .join(' ')}
                />
                {trajectory.peak &&
                  (() => {
                    const idx = trajectory.points.findIndex((p) => p.at === trajectory.peak!.at);
                    if (idx === -1) return null;
                    const x = (idx / (trajectory.points.length - 1)) * 300;
                    const y = 62 - (Math.max(0, Math.min(100, trajectory.peak!.riskScore)) / 100) * 60;
                    return <circle cx={x} cy={y} r="2.5" fill="#f59e0b" />;
                  })()}
              </svg>
              <div className="text-xs text-gray-500 mt-1">{trajectory.method}</div>
            </div>
          )}

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
