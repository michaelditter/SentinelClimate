# Sentinel Climate

Decision support for climate emergencies. Sentinel Climate watches public data
feeds for climate disruption — extreme heat, flash floods, grid stress, dirty
air — scores the risk to a specific county, and drafts a resource-allocation
plan against that county's real inventory: cooling centers, ambulances,
high-water vehicles, medical teams. The mission is timing: get the right
resources moving toward the right place before the disaster peaks, not after.

It is decision *support*, not decision *making*. Every assessment ends with a
recommendation that a human emergency manager must review before anything
deploys. That constraint is wired into the data model, not the marketing.

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

1. **Collector** pulls a fresh snapshot of a county from public OSINT feeds and
   records, per source, whether the data was live, degraded, or unavailable.
2. **Multi-agent pipeline** — four agents in sequence: SENTINEL reads the
   hazards, MEDIC assesses population health risk, DISPATCHER works the
   logistics, COMMANDER makes the call (MONITOR / DEPLOY / EMERGENCY). With an
   `ANTHROPIC_API_KEY` the agents run on Claude; without one, a deterministic
   rules engine produces the same report shape and says so.
3. **Allocation engine** converts the risk score into resource demand, fills it
   from the county's inventory, and reports every shortfall with a mitigation —
   it never pretends inventory it doesn't have.
4. **Dashboard** renders the assessment with the provenance of every input.

## Data sources

| Source | What | Key required | Status when unconfigured |
|---|---|---|---|
| NWS (api.weather.gov) | Weather alerts, forecasts, heat index | None | Live |
| USGS Water Services | River gauge height and discharge | None | Live |
| OpenFEMA | Disaster declarations | None | Live |
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
npm test        # vitest — allocation engine, rules engine, county registry
```

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
deterministic fallback for every AI path, provenance on every payload, and
tests on the allocation math.
