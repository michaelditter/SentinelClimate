# Sentinel Climate

Decision support for climate emergencies. Sentinel Climate watches public data
feeds for climate disruption — extreme heat, flash floods, grid stress, dirty
air, earthquakes, wildfires, tropical systems, hospital strain — scores the risk
to any US county, and drafts a resource-allocation plan against that county's
real inventory: cooling centers, ambulances, high-water vehicles, medical teams.
The mission is timing: get the right resources moving toward the right place
before the disaster peaks, not after.

It works for **every US county** (~3,144, from Census + ACS data), projects each
county's risk **72 hours forward** from the hourly forecast, and ranks a
**national risk board** so you can see where the country needs resources most
right now.

It is decision *support*, not decision *making*. Every assessment ends with a
recommendation that a human emergency manager must review before anything
deploys. That constraint is wired into the data model, not the marketing.

Live: **https://sentinel-climate.vercel.app**

## How it works

```
  OSINT sources                     Multi-agent pipeline
 ┌──────────────┐                 ┌──────────────────────────┐
 │ NWS alerts   │                 │  SENTINEL  hazard watch  │
 │ USGS gauges  │   ┌─────────┐   │  MEDIC     health risk   │   ┌────────────┐
 │ OpenFEMA     │──▶│collector│──▶│  DISPATCHER logistics    │──▶│ allocation │
 │ EIA grid     │   │(snapshot│   │  COMMANDER decision      │   │   engine   │
 │ AirNow AQI   │   │ + prov- │   ├──────────────────────────┤   └─────┬──────┘
 │ CDC heat     │   │ enance) │   │ Claude (ANTHROPIC_API_   │         │
 └──────────────┘   └─────────┘   │ KEY) or deterministic    │         ▼
                                  │ rules fallback           │   ┌────────────┐
                                  └──────────────────────────┘   │ dashboard  │
                                                                 └────────────┘
```

1. **Collector** pulls a fresh snapshot of a county from ten public OSINT feeds
   and records, per source, whether the data was live, degraded, or unavailable.
2. **Multi-agent pipeline** — four agents in sequence: SENTINEL reads the
   hazards, MEDIC assesses population health risk, DISPATCHER works the
   logistics, COMMANDER makes the call (MONITOR / DEPLOY / EMERGENCY). With an
   `ANTHROPIC_API_KEY` the agents run on Claude; without one, a deterministic
   rules engine produces the same report shape and says so.
3. **Allocation engine** converts the risk score into resource demand, fills it
   from the county's inventory, and reports every shortfall with a mitigation —
   it never pretends inventory it doesn't have.
4. **Risk trajectory** projects the next 72 hours of risk from the NWS hourly
   forecast, so a county heading into a heat peak surfaces before it arrives.
5. **National risk board** sweeps the major metros (plus any watchlist counties)
   with the deterministic scorer and ranks them, turning "which county?" into a
   live leaderboard of where resources are most needed.
6. **Dashboard** renders the assessment with the provenance of every input, a
   county search over the full national registry, and the 72-hour sparkline.

### Key endpoints

| Endpoint | What |
|---|---|
| `GET /api/counties/search?q=` | Autocomplete over every US county |
| `POST /api/agents/analyze` `{county}` | Full multi-agent assessment |
| `GET /api/allocation/plan/:county` | Fast deterministic score + plan (no LLM) |
| `GET /api/trajectory/:county` | 72-hour projected risk curve |
| `GET /api/riskboard` | National risk leaderboard |
| `GET/POST/DELETE /api/watchlist` | Counties to keep sweeping |

## Data sources

| Source | What | Key required | Status when unconfigured |
|---|---|---|---|
| NWS (api.weather.gov) | Weather alerts, forecasts, hourly forecast, heat index | None | Live |
| USGS Water Services | River gauge height and discharge | None | Live |
| USGS Earthquakes (FDSN) | Recent seismic events near the county | None | Live |
| NIFC Wildfires | Active wildfire incidents near the county | None | Live |
| NHC Tropical | Active hurricanes / tropical storms | None | Live |
| OpenFEMA | Disaster declarations | None | Live |
| HHS Protect | State hospital inpatient / ICU occupancy | None | Live (degraded when the federal feed is stale) |
| Census + ACS | County registry, population, senior counts | None | Live (bundled) |
| EIA | Grid demand and reserve margin | `EIA_API_KEY` | Unavailable (labeled) |
| AirNow | Air quality index | `AIRNOW_API_KEY` | Unavailable (labeled) |
| CDC | Heat-health data | `CDC_API_KEY` | Unavailable (labeled) |
| Google CSE + OpenAI | Social listening / OSINT sweeps | `GOOGLE_CSE_API_KEY`, `GOOGLE_CSE_ID`, `OPENAI_API_KEY` | Unavailable (labeled) |
| ElevenLabs / Twilio | Voice and SMS outreach | `ELEVENLABS_API_KEY`, `TWILIO_*` | Demo mode (simulated, labeled) |

All keys are optional and free to register. The app runs with zero keys — it
just tells you, per source, that it is running degraded.

## Quickstart

```bash
cp env.example .env    # fill in whichever keys you have; all are optional
npm install
npm run dev
```

Open `http://localhost:5001`. The server reads `PORT` from the environment and
defaults to 5001 — port 5000 collides with AirPlay Receiver on macOS, so set
`PORT` explicitly if you need a different one.

Checks:

```bash
npm run check   # TypeScript, strict mode
npm test        # vitest — allocation engine, all-hazards scoring, risk
                # trajectory, national county registry, risk board
```

Set `ENABLE_SWEEP=1` (ignored on Vercel) to run a background sweep of the
watchlist every `SWEEP_INTERVAL_MINUTES` (default 15) and collect alerts.

## Data honesty

The core product rule: **simulated data is never presented as live.**

- Every assessment carries per-source provenance — a `SourceStatus` for each
  feed stating `live`, `degraded`, or `unavailable`, with a timestamp. The
  dashboard renders these as a provenance strip on every result.
- Every agent report is stamped with its mode: `ai` (Claude, model id included)
  or `rules` (deterministic fallback). The fallback never masquerades as AI.
- In rules mode, agent confidence is the fraction of data sources that were
  actually live — measured, not invented.
- Every decision output sets `reviewRequired: true`. A qualified human reviews
  before any resource moves. There is no auto-deploy path.

## Origin

Built at the AI+ Expo hackathon in June 2025, now being hardened into a real
decision-support tool: typed contracts shared between server and client, a
deterministic fallback for every AI path, provenance on every payload, tests on
the allocation math, national county coverage, all-hazards feeds, forward-looking
risk projection, and a one-command deploy to Vercel serverless.
