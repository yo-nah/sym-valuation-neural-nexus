# SYM Valuation Neural Nexus

A living, causally-connected valuation brain for **Symbotic Inc. (NASDAQ: SYM)** — the AI-powered warehouse robotics and supply-chain automation leader.

Every assumption, every macro variable, every peer multiple is interlinked in real time through a persistent Nexus causal graph. Change one lever and watch the entire valuation universe recalibrate instantly.

---

## Self-Hosting (Run Entirely Offline)

This app runs completely without Perplexity or any external service. Everything — the backend, database, and frontend — lives in this repository.

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| npm | 9+ | bundled with Node.js |
| git | any | [git-scm.com](https://git-scm.com) |

No cloud accounts, API keys, or internet connection required after initial `npm install`.

### One-Command Setup

```bash
# 1. Clone the repository
git clone https://github.com/yo-nah/sym-valuation-neural-nexus.git
cd sym-valuation-neural-nexus

# 2. Install dependencies
npm install

# 3. Start the server
npm run dev
```

Open **http://localhost:5000** — the app is fully running locally.

### Production Mode (Faster)

```bash
npm run build
NODE_ENV=production node dist/index.cjs
```

Open **http://localhost:5000**

---

## How It Works Offline

```
Browser (React)  ←→  Express server (port 5000)  ←→  SQLite database (nexus.db)
```

- **Frontend** — React + Vite, served statically from `dist/public/`
- **Backend** — Express API on port 5000; all valuation math runs server-side in Node.js
- **Database** — SQLite via Drizzle ORM; `nexus.db` is created automatically on first run and seeded with all 24 default assumptions
- **No external calls** — the 3D globe earth texture loads from `unpkg.com` CDN (optional visual only); the 2D map uses local GeoJSON (`countries-geojson.json`) and works fully offline

> **Globe in offline mode:** The 2D globe (default) works entirely offline. The 3D globe loads an earth texture from a CDN — if offline, it will show a dark sphere but all nodes, arcs, and data are still fully functional.

---

## Folder Structure

```
sym-valuation-neural-nexus/
├── client/                  # React frontend (Vite)
│   ├── public/
│   │   ├── countries-geojson.json   # World map polygons (offline)
│   │   └── countries-110m.json      # TopoJSON source
│   └── src/
│       ├── components/      # TopBar, NexusOverlay, Sidebar, AssumptionCard
│       ├── lib/             # Zustand store, queryClient, utils
│       └── pages/           # All 12 dashboard pages
├── server/
│   ├── index.ts             # Express entry point
│   ├── routes.ts            # All API endpoints + valuation engine
│   ├── storage.ts           # Drizzle ORM + SQLite storage layer
│   └── vite.ts              # Vite dev middleware
├── shared/
│   └── schema.ts            # Drizzle table definitions
├── nexus.db                 # SQLite database (auto-created, gitignored)
├── package.json
└── README.md
```

---

## API Endpoints

All endpoints are served by the local Express server. No authentication required.

### Assumptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/assumptions` | All 24 assumptions |
| `GET` | `/api/assumptions/:category` | Filter by `firm`, `ecosystem`, `consumer`, `global`, or `government` |
| `PATCH` | `/api/assumptions/:id` | Update a single value — body: `{ "value": number }` |
| `POST` | `/api/assumptions/reset` | Reset all to defaults; returns fresh rows |

### Valuation

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/valuation` | Runs full valuation engine; returns DCF, comps, ensemble, revenues, FCFs |

### Scenarios

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/scenarios` | Saved scenarios |
| `POST` | `/api/scenarios` | Create — body: `{ name, description, assumptions }` |
| `DELETE` | `/api/scenarios/:id` | Delete |

---

## Pages

| # | Page | Valuation Methodology |
|---|------|-----------------------|
| 1 | **Landing** | Business overview, key metrics |
| 2 | **Key Assumptions** | Central source of truth — 24 assumptions, all wired to engine |
| 3 | **Firm** | 5-year DCF + EV/Revenue + EV/EBITDA comps + tornado chart |
| 4 | **Ecosystem** | Peer multiples, TAM overlap, cosine similarity scores |
| 5 | **Historical** | 3-track event timeline + comparative peer price/returns chart |
| 6 | **Consumer** | Sentiment model, labor displacement, customer concentration |
| 7 | **Global** | BIS/IMF macros + interactive 2D/3D globe + NOAA/NASA climate |
| 8 | **Academia** | 6 high-impact papers → academic valuation overlay ensemble |
| 9 | **Government** | Regulatory timeline, policy impact model |
| 10 | **Derivatives** | CME/CBOE options analytics + futures forward curves |
| 11 | **Executive Summary** | Bayesian-weighted ensemble across all 8 active pages |
| 12 | **Appendix** | Data sources, agent prompts, methodology |

---

## Valuation Engine

All math runs in `server/routes.ts` — `computeValuation()`. Every one of the 24 assumptions is wired into the output:

### Revenue Model
- `revenueGrowthY1–Y5` → compound revenue projection FY2026–FY2030
- TAM × market share → soft revenue cap on Y3–Y5 trajectory

### EBITDA
- `grossMargin` → EBITDA via `grossMargin × 0.55` (opex ratio)
- `ebitdaMargin` → override if set above 5%
- `laborDisplacement` → pricing power premium on EBITDA

### DCF
- 5-year FCF = EBITDA × (1 − tax) − CapEx − NWC change
- `automationSubsidy` → capex offset (up to 30% CapEx reduction)
- `sentimentScore` → WACC adjustment (±0.6% swing)
- `walmartConcentration` → revenue risk discount
- Terminal value: Gordon Growth using `terminalGrowth` / `wacc`

### Comps
- EV/Revenue: `fwdRev × evRevMultiple`
- EV/EBITDA: `fwdEbitda × evEbitdaMultiple`

### Macro Discount
- `chinaTariffRisk`, `globalCreditSpread`, `aiRegulationRisk`, `tradePolicyRisk` → headwinds
- `supplyChainResilience` → tailwind (higher = better)

### Ensemble
`DCF × 45% + EV/Rev × 30% + EV/EBITDA × 25%` × macro discount

---

## Heatmap Mode Toggle

The flame icon (🔥) in the top bar controls how assumption cards are color-coded:

| Mode | What it shows |
|------|--------------|
| **BULL** | Green intensity = how much each assumption can lift the price target |
| **BEAR** | Red intensity = how much downside risk each assumption carries |
| **NET** | Green/red by average sensitivity magnitude and net direction |
| **OFF** | No color coding |

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| v1.0.0 | Mar 31, 2026 | Initial 11-page dashboard |
| v1.1.0 | Apr 1, 2026 | Globe hotfix: react-globe.gl + local GeoJSON |
| v1.2.0 | Apr 1, 2026 | Climate/macro toggles, 2D zoom/pan/fly-to, Iran War |
| v1.3.0 | Apr 1, 2026 | 3D sidebar fly-to fix, Derivatives page |
| v1.4.0 | Apr 1, 2026 | Historical: peer chart, returns mode, event ref lines |
| v1.5.0 | Apr 2, 2026 | Tornado bars fixed, label signs corrected |
| v1.6.0 | Apr 9, 2026 | GitHub repo; ABBNY/OCDO prices corrected; data granularity |
| v1.7.0 | Apr 9, 2026 | Valuation engine v2: all 24 assumptions wired; Y1–Y5 revenue table |
| v1.8.0 | Apr 9, 2026 | NL query bar removed; heatmap mode logic fixed; self-hosting docs |

---

## Data Sources

All data is baked into the application — no live API connections required for core functionality.

| Source | Data Used |
|--------|-----------|
| SEC EDGAR | SYM financials (FY2022–FY2025 actuals) |
| Yahoo Finance | Historical peer prices (SYM, OCDO, FANUY, ABBNY) |
| BIS Statistics | Credit gap, global liquidity |
| IMF WEO | GDP forecasts, global growth |
| NOAA CPC | El Niño/ENSO indices |
| NASA NSIDC | Arctic sea ice extent |
| BLS JOLTS | Warehouse employment data |
| CME Group | Copper, steel futures forward curves |
| CBOE | SYM options chain, IV, put/call ratios |

---

## Future API Extensions

The server is structured to accept new endpoints in `server/routes.ts`. Planned extensions:

```
/api/live-price      — Yahoo Finance / Alpha Vantage real-time feed
/api/sentiment       — Stocktwits NLP sentiment pipeline
/api/sec-filings     — EDGAR filing parser for latest SYM financials
/api/options-chain   — CBOE live options data
/api/futures         — CME live forward curves
```

---

## License

MIT — built for research and educational purposes. Not financial advice.
