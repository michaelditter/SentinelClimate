import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Radar, RefreshCw } from 'lucide-react';
import type { RiskBoardEntry } from '@shared/intelligence';

// National Risk Board — multi-county rules-engine screening from
// GET /api/riskboard. Deliberately NOT the LLM pipeline: this panel is the
// cheap wide scan; clicking a row hands the county to the Live Multi-Agent
// Analysis panel (via the 'sentinel:selectCounty' CustomEvent) for the full
// four-agent assessment.

interface RiskBoardResponse {
  generatedAt: string;
  method: string;
  entries: RiskBoardEntry[];
  unresolved: string[];
}

const ACTION_BADGE: Record<RiskBoardEntry['action'], string> = {
  MONITOR: 'bg-slate-500/15 text-slate-300 border border-slate-500/40',
  DEPLOY: 'bg-amber-500/15 text-amber-300 border border-amber-500/40',
  EMERGENCY: 'bg-red-500/15 text-red-300 border border-red-500/40',
};

const ACTION_BAR: Record<RiskBoardEntry['action'], string> = {
  MONITOR: 'bg-slate-400',
  DEPLOY: 'bg-amber-400',
  EMERGENCY: 'bg-red-500',
};

const prettyHazard = (hazard: string): string => hazard.replace(/_/g, ' ');

const RiskBoard: React.FC = () => {
  const [entries, setEntries] = useState<RiskBoardEntry[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/riskboard');
      if (!res.ok) {
        let message = `Risk board unavailable (HTTP ${res.status})`;
        try {
          const body = await res.json();
          if (typeof body?.error === 'string') message = body.error;
        } catch {
          // Non-JSON error body; keep the status message.
        }
        throw new Error(message);
      }
      const body = (await res.json()) as RiskBoardResponse;
      const list = Array.isArray(body?.entries) ? body.entries : [];
      // The server sorts by risk score descending; re-sort defensively.
      setEntries([...list].sort((a, b) => b.riskScore - a.riskScore));
      setGeneratedAt(typeof body?.generatedAt === 'string' ? body.generatedAt : null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectCounty = (fips: string) => {
    window.dispatchEvent(new CustomEvent('sentinel:selectCounty', { detail: fips }));
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h3 className="text-xl font-bold flex items-center text-gray-100">
          <Radar className="h-5 w-5 mr-2" />
          National Risk Board
        </h3>
        <div className="flex items-center gap-3">
          {generatedAt && (
            <span className="text-xs text-gray-500">
              screened {new Date(generatedAt).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-60 text-gray-100 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-600 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/40 rounded-lg p-3 mb-4">
          <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
          <span className="text-sm text-red-300">{error}</span>
        </div>
      )}

      {loading && entries.length === 0 && !error && (
        <div className="flex items-center gap-3 bg-gray-700 rounded-lg p-4">
          <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
          <div className="text-sm text-gray-300">
            Screening counties — live OSINT snapshot per county, rules-engine scoring only.
          </div>
        </div>
      )}

      {entries.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-700">
                <th className="py-2 pr-4 font-medium">County</th>
                <th className="py-2 pr-4 font-medium w-44">Risk</th>
                <th className="py-2 pr-4 font-medium">Action</th>
                <th className="py-2 pr-4 font-medium">Hazard</th>
                <th className="py-2 pr-4 font-medium">Top driver</th>
                <th className="py-2 font-medium whitespace-nowrap">Sources live</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.county.fips}
                  onClick={() => selectCounty(entry.county.fips)}
                  title={`Analyze ${entry.county.name}, ${entry.county.state} in the multi-agent panel`}
                  className="border-b border-gray-700/60 cursor-pointer hover:bg-gray-700/40 transition-colors"
                >
                  <td className="py-2 pr-4 text-gray-100 whitespace-nowrap">
                    {entry.county.name}, {entry.county.state}
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-100 font-bold w-8 text-right">
                        {entry.riskScore}
                      </span>
                      <div className="flex-1 h-2 bg-gray-900/70 rounded-full overflow-hidden min-w-[80px]">
                        <div
                          className={`h-2 rounded-full ${ACTION_BAR[entry.action]}`}
                          style={{ width: `${Math.max(entry.riskScore, 2)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${ACTION_BADGE[entry.action]}`}>
                      {entry.action}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-gray-300 whitespace-nowrap capitalize">
                    {prettyHazard(entry.hazardType)}
                  </td>
                  <td
                    className="py-2 pr-4 text-gray-400 max-w-[280px] truncate"
                    title={entry.topDriver ?? 'No contributing risk drivers'}
                  >
                    {entry.topDriver ?? '—'}
                  </td>
                  <td
                    className={`py-2 whitespace-nowrap ${
                      entry.sourcesLive === entry.sourcesTotal
                        ? 'text-green-400'
                        : entry.sourcesLive > 0
                          ? 'text-amber-400'
                          : 'text-gray-500'
                    }`}
                  >
                    {entry.sourcesLive}/{entry.sourcesTotal}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <p className="text-sm text-gray-400">No counties on the board yet.</p>
      )}

      <p className="text-xs text-gray-500 mt-3">
        Rules-engine screening only (deterministic, no AI) — click a county to run the full
        multi-agent analysis above.
      </p>
    </div>
  );
};

export default RiskBoard;
