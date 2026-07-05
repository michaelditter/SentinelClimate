# CLAUDE.md — Sentinel Climate

Project-level reference and working notes. The global `~/.claude/CLAUDE.md`
(Mike's preferences) still applies; this file is the Sentinel-Climate-specific
memory: what it is, where it lives, how it's built, and what's still open.

---

## What it is

Sentinel Climate is climate-emergency **decision support**. It watches public
data feeds for disruption — extreme heat, flash floods, grid stress, dirty air,
earthquakes, wildfires, tropical systems, hospital strain — scores the risk to a
county, and drafts a resource-allocation plan (cooling centers, ambulances,
high-water vehicles, medical teams) against that county's real inventory. The
mission is timing: move the right resources toward the right place *before* the
disaster peaks.

It is support, not automation. Every assessment ends with a recommendation a
human emergency manager must review — `reviewRequired: true` is wired into the
data model, not the marketing.

Origin: June 2025 AI+ Expo hackathon build (Anthropic track, Replit-generated),
hardened into a real tool across July 2026.

## Where it lives

| | |
|---|---|
| **Live app** | https://sentinel-climate.vercel.app |
| **GitHub** (public) | https://github.com/michaelditter/SentinelClimate |
| **Local** | `~/Sentinel Climate` |
| **Vercel** | team `mjditter-4980`, project `sentinel-climate` (prod on push to `main` via `vercel deploy --prod`) |
| **Backup** | `~/SentinelClimate-local-backup/` — original 133-commit git mirror, the removed `attached_assets/`, and `scrub-history*.sh` |

## Status — as of 2026-07-05

**Live, deployed, and verified.** 105 tests pass, `tsc` clean, build + serverless
bundle verified, endpoints confirmed live on Vercel against real government APIs.

- ✅ Security scrubbed — leaked API keys, account IDs, phone numbers, and 58
  pasted AI transcripts removed from the working tree **and** from all git
  history (git-filter-repo rewrite of file contents *and* commit messages,
  force-pushed).
- ⚠️ **OPEN — only action left for Mike: rotate the exposed keys.** They were
  public for ~1 year, so the history scrub reduces discoverability but doesn't
  undo exposure. Rotate: **EIA** (eia.gov/opendata), **EPA AirNow**
  (docs.airnowapi.org), **NOAA** token (ncdc.noaa.gov). All free, all optional
  to the app.
- ✅ Real OSINT + multi-agent pipeline + allocation engine (was UI theater).
- ✅ Deployed to Vercel serverless.
- ✅ 10X wave: national coverage, all-hazards, 72h forecasting, national board.

## What it does now (capabilities)

- **Every US county** (~3,144) — search and analyze any of them. Registry built
  from Census 2023 Gazetteer + ACS 5-year (population, 65+ as vulnerability
  proxy).
- **10 OSINT feeds**, each labeled live / degraded / unavailable per snapshot:
  NWS (alerts, forecast, hourly), USGS water gauges, USGS earthquakes, NIFC
  wildfires, NHC tropical, OpenFEMA declarations, HHS hospital occupancy, Census
  (bundled), plus EIA grid and AirNow AQI when keys are set.
- **Four-agent pipeline** — SENTINEL → MEDIC → DISPATCHER → COMMANDER. Runs on
  Claude with `ANTHROPIC_API_KEY`; without it, a deterministic rules engine
  produces the same report shape and says so. The allocation engine is always
  deterministic — the agents inform, the engine allocates.
- **72-hour risk trajectory** — projects each county's risk curve from the NWS
  hourly forecast (surfaces heat peaks before they land).
- **National risk board** — deterministic sweep of major metros + a watchlist,
  ranked live. Turns "which county?" into a leaderboard.

## Architecture — where the code is

```
OSINT feeds → collector → risk engine ┬→ multi-agent pipeline → allocation → dashboard
(server/osint) (collector) (allocation) │  (server/agents)      (allocation)  (client)
                                        └→ trajectory / risk board
```

| Path | Role |
|---|---|
| `shared/intelligence.ts` | **The contract.** All shared types. Read first; changing it ripples everywhere. |
| `server/osint/*` | One module per data source. Each returns `{data, status}` and **never throws**. `collector.ts` fans out with per-source provenance. |
| `server/allocation/engine.ts` | `computeRiskScore` + `planAllocation`. **Pure, deterministic, no clock reads** — unit-tested. |
| `server/allocation/trajectory.ts` | 72h projection (pure). |
| `server/agents/*` | `orchestrator.ts` (Claude or rules), `prompts.ts`, `rulesEngine.ts`. |
| `server/riskboard/*` | National sweep, watchlist, alerts. |
| `server/config/counties.ts` | 6 curated counties (hand-tuned gauges/grid). |
| `server/config/nationalCounties.{ts,json}` | ~3,144-county registry. Regenerate with `scripts/generateCounties.mjs`. |
| `server/routes/*` | `intelligence.ts`, `countySearch.ts`, `trajectory.ts`, `riskboard.ts` — all registered in `server/routes.ts`. |
| `server/app.ts` | Shared Express factory (local server + Vercel function). |
| `api/index.ts` + `vercel.json` | Serverless entry; esbuild bundles the app at build time. |
| `client/src/components/LiveAgentAnalysis.tsx`, `RiskBoard.tsx` | The two main panels, mounted in `SentinelAI.tsx`. |
| `tests/*` | vitest — allocation, hazards, trajectory, national counties, risk board. |

### Key API endpoints

| Endpoint | What |
|---|---|
| `GET /api/counties/search?q=` | National county autocomplete |
| `POST /api/agents/analyze` `{county}` | Full multi-agent assessment (force-refresh) |
| `GET /api/allocation/plan/:county` | Fast deterministic score + plan (no LLM) |
| `GET /api/trajectory/:county` | 72h projected risk curve |
| `GET /api/riskboard` | National risk leaderboard |
| `GET/POST/DELETE /api/watchlist`, `GET /api/alerts` | Watchlist + alert buffer |
| `GET /api/system/health` | Mode (ai/rules) + uptime |

## Conventions (the load-bearing ones)

- **Data honesty is the product.** Simulated/fallback data is *never* presented
  as live. Every snapshot carries per-source `SourceStatus`; every agent report
  is stamped `ai` (with model id) or `rules`; confidence in rules mode is the
  fraction of live sources — measured, not invented.
- **Server imports shared types via RELATIVE paths** (`../../shared/intelligence`),
  **never** the `@shared` alias — the alias breaks the Vercel function bundle.
  Client code uses `@shared`. This trips people up; keep it straight.
- **The risk engine is pure and deterministic** — no `Date.now()`, no randomness.
  Freshness/staleness is derived from timestamps on the snapshot
  (`reportedAt` vs `collectedAt`). This is what makes it unit-testable; don't
  break it.
- **PORT env** — defaults to 5000, which collides with macOS AirPlay. Use 5001+
  locally (`PORT=5001 npm run dev`).
- **Model** — `ANTHROPIC_MODEL` env, default `claude-opus-4-8`. Client is
  constructed lazily (never at module scope); 5-min per-county assessment cache;
  concurrent same-county requests coalesce.
- **Background sweep** is gated: `ENABLE_SWEEP=1` and only off-Vercel.

## Run / verify / deploy

```bash
cp env.example .env      # all keys optional; app runs with zero keys
npm install
PORT=5001 npm run dev    # http://localhost:5001
npm run check            # tsc, strict
npm test                 # vitest (105 tests)
npm run build            # vite client + esbuild server
vercel deploy --prod --yes   # production (team mjditter-4980)
```

## How to get back to the detail

- **Commit history** carries the full story — the messages are verbose by
  design. Anchor commits (post-history-rewrite SHAs):
  - `711e802` — 10X wave (national coverage, all-hazards, trajectory, risk board)
  - `80e223b` — Vercel serverless adapter
  - `22e89df` — real OSINT pipeline + allocation engine + bug fixes
  - `4191d86` — security scrub of secrets/PII
- **Auto-memory**: `~/.claude/projects/-Users-michaelditter-Sentinel-Climate/memory/sentinel-climate-project.md`
- **Backup + scrub scripts**: `~/SentinelClimate-local-backup/`

## For michaelditter.com / future leverage

The pitch, in the site's terms: *a live, national, all-hazards climate
decision-support platform — 3,144 counties, 10 real government data feeds, a
Claude multi-agent analysis pipeline with a deterministic fallback, 72-hour risk
forecasting, and a national risk leaderboard — that recommends where emergency
resources should go, with a human always in the loop.* Deployed at
sentinel-climate.vercel.app.

Concrete, sourced numbers to draw on (all real, all verifiable in the running
app): 3,144 counties; 10 OSINT sources; 4-agent pipeline; 72-hour projection
horizon; 105 automated tests. The screenshots that sell it: the National Risk
Board ranking live metros (e.g. Phoenix topping the board on a real Extreme Heat
Warning), and a county's 72h risk sparkline with the peak callout.

Honest framing for the site (matches the product): decision *support*, not
automation; every input is provenance-tagged; the AI path degrades to a
transparent deterministic engine, never to fake data.
