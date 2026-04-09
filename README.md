# SYM Valuation Neural Nexus

A living, causally-connected valuation brain for **Symbotic Inc. (NASDAQ: SYM)** — the AI-powered warehouse robotics and supply-chain automation leader.

Every assumption, every macro variable, every peer multiple is interlinked in real time through a persistent Nexus causal graph. Change one lever and watch the entire valuation universe recalibrate instantly.

---

## Live Dashboard

Deployed at: [SYM Valuation Neural Nexus](https://www.perplexity.ai/computer/a/sym-valuation-neural-nexus-2nbGgD_sSmqOPYD3kRWoOA)

> Data current as of **April 1, 2026**. Incorporates the 2026 Iran War / Strait of Hormuz crisis.

---

## Architecture

```
Frontend:  React (Vite) + Tailwind CSS v3 + shadcn/ui
Backend:   Express + Drizzle ORM (SQLite / better-sqlite3)
State:     Zustand global store
Charts:    Recharts
Globe:     react-globe.gl + Three.js
Fonts:     Space Grotesk (body) · JetBrains Mono (data)
Deploy:    Static S3 (frontend) + Express API proxy (backend)
```

### System Diagram

```
NL Query Bar → NLP Parser → Assumption Updates → Valuation Engine → Nexus Graph
                                  ↓                     ↓                ↓
                           Impact Heatmap          Price Target      All 11 Pages
```

---

## Pages

| # | Page | Valuation Methodology |
|---|------|-----------------------|
| 1 | **Landing** | Business overview, key metrics, feature tour |
| 2 | **Key Assumptions** | Central source of truth — 22 sliders cascade to all pages |
| 3 | **Firm** | 5-year DCF + EV/Revenue + EV/EBITDA comps + tornado chart |
| 4 | **Ecosystem** | Peer multiples, TAM overlap, cosine similarity scores |
| 5 | **Historical** | 3-track event timeline + comparative price/returns chart |
| 6 | **Consumer** | Sentiment model, labor displacement, customer concentration |
| 7 | **Global** | BIS/IMF macros + interactive 2D/3D globe + NOAA/NASA climate |
| 8 | **Academia** | 6 high-impact papers → academic valuation overlay ensemble |
| 9 | **Government** | Regulatory timeline, policy impact model |
| 10 | **Derivatives** | CME/CBOE options analytics + futures forward curves |
| 11 | **Executive Summary** | Bayesian-weighted ensemble across all 8 active pages |
| 12 | **Appendix** | Data sources, agent prompts, methodology, architecture |

---

## Core Features

### Nexus Overlay
Persistent ReactFlow causal graph — every assumption flows visually to every page. Nodes pulse on change. Click any node to navigate.

### Impact Heatmap Layer
Every assumption card color-codes its border/background by bull/bear price target sensitivity. Four modes: BULL | BEAR | NET | OFF. Toggle in the top bar.

### Natural-Language Query Engine
Ask anything in the query bar:
> *"What if China tariffs rise 15% and WACC drops 1%?"*

The parser extracts assumption changes, re-runs the valuation model, and returns the new ensemble target with a narrative.

### Executive Summary Ensemble
Bayesian-weighted ensemble price target across 8 specialist pages. Master toggles dim Nexus nodes and instantly recalculate weights. Confidence bands + scenario explorer included.

### Global Globe (2D/3D)
- **2D**: Canvas equirectangular — instant load, full zoom/pan/fly-to
- **3D**: react-globe.gl with Three.js earth texture, country polygons, animated supply-chain arcs, climate overlay rings

---

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (frontend + backend on same port)
npm run dev
# → http://localhost:5000

# Production build
npm run build
NODE_ENV=production node dist/index.cjs
```

### Environment
No `.env` required for local development. The SQLite database (`nexus.db`) is created automatically on first run and seeded with 22 default assumptions.

---

## Valuation Methodology

| Component | Weight | Description |
|-----------|--------|-------------|
| DCF | 45% | 5-year FCF model → terminal value (Gordon Growth) → WACC discounting |
| EV/Revenue Comps | 30% | Forward revenue × peer-derived multiple |
| EV/EBITDA Comps | 25% | Forward EBITDA × peer-derived multiple |

**Macro discount**: composite factor from China tariff risk, global credit spreads, and AI regulation risk score. Applied multiplicatively to the raw ensemble.

**Page weights** (Bayesian ensemble in Executive Summary):

| Page | Weight |
|------|--------|
| Firm / DCF | 30% |
| Ecosystem / Comps | 22% |
| Global Macro | 12% |
| Consumer | 8% |
| Government | 8% |
| Derivatives | 10% |
| Historical | 5% |
| Academia | 5% |

---

## API Reference

### Assumptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/assumptions` | All 22 assumptions |
| `GET` | `/api/assumptions/:category` | Filter by category |
| `PATCH` | `/api/assumptions/:id` | Update a single value `{ value: number }` |
| `POST` | `/api/assumptions/reset` | Reset all to defaults → returns fresh rows |

### Valuation

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/valuation` | Run full valuation engine → returns ensemble + breakdown |

### NL Query

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/query` | `{ query: string }` → parses intent, updates assumptions, returns `{ message, updates, valuation, assumptions }` |

### Scenarios

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/scenarios` | Saved scenarios |
| `POST` | `/api/scenarios` | Create scenario `{ name, description, assumptions }` |
| `DELETE` | `/api/scenarios/:id` | Delete scenario |

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| v1.0.0 | Mar 31, 2026 | Initial 11-page dashboard — Nexus overlay, heatmap layer, NL query |
| v1.1.0 | Apr 1, 2026 | Globe hotfix: react-globe.gl + local GeoJSON polygons |
| v1.2.0 | Apr 1, 2026 | Climate/macro toggles, 2D zoom/pan/fly-to, Iran War integration |
| v1.3.0 | Apr 1, 2026 | 3D sidebar fly-to fix (forwardRef), Derivatives page, Nexus node added |
| v1.4.0 | Apr 1, 2026 | Historical: peer price chart, returns mode, event ref lines |
| v1.5.0 | Apr 2, 2026 | SymBot removed, tornado bars fixed (absolute positioning), label signs corrected |
| v1.6.0 | Apr 9, 2026 | GitHub repo init; peer prices corrected (ABBNY ~$80, OCDO ~$190); price history granularity improved |

---

## Data Sources

| Source | Used For |
|--------|----------|
| [SEC EDGAR](https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=SYM) | SYM 10-K, 10-Q, 8-K filings |
| [Yahoo Finance](https://finance.yahoo.com/quote/SYM) | Real-time price, fundamentals |
| [BIS Statistics](https://www.bis.org/statistics/) | Credit gap, global liquidity |
| [IMF WEO](https://www.imf.org/en/Publications/WEO) | GDP forecasts, global growth |
| [World Bank](https://data.worldbank.org/) | Labor market, developing economy indices |
| [NOAA CPC](https://www.cpc.ncep.noaa.gov/) | El Niño/ENSO indices |
| [NASA NSIDC](https://nsidc.org/) | Arctic sea ice extent |
| [BLS JOLTS](https://www.bls.gov/jlt/) | Warehouse employment data |
| [Stocktwits API](https://api.stocktwits.com/api/2/streams/symbol/SYM.json) | Social sentiment |
| [CME Group](https://www.cmegroup.com/) | Copper, steel futures forward curves |
| [CBOE](https://www.cboe.com/) | SYM options chain, IV, put/call ratios |
| [Damodaran NYU](https://pages.stern.nyu.edu/~adamodar/) | Sector multiples, risk premiums |

---

## Future API Extensions

This repository is structured to support additional backend services:

- **`/api/live-price`** — Yahoo Finance / Alpha Vantage real-time price feed
- **`/api/sentiment`** — Stocktwits NLP sentiment score pipeline
- **`/api/sec-filings`** — EDGAR filing parser for latest SYM financials
- **`/api/options-chain`** — CBOE live options data feed
- **`/api/futures`** — CME live forward curves

See `server/routes.ts` to add new endpoints.

---

## License

MIT — built for research and educational purposes. Not financial advice.
