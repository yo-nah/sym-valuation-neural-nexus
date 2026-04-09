import { BookMarked, Database, GitBranch, FileText } from "lucide-react";

const DATA_SOURCES = [
  { name: "SEC EDGAR", desc: "SYM 10-K, 10-Q, 8-K filings, proxy statements", type: "primary", url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=SYM" },
  { name: "Yahoo Finance", desc: "Real-time and historical price data, fundamentals", type: "market", url: "https://finance.yahoo.com/quote/SYM" },
  { name: "StockAnalysis", desc: "Income statement, balance sheet, cash flow history", type: "fundamental", url: "https://stockanalysis.com/stocks/sym/" },
  { name: "BIS Statistics", desc: "Credit gap, global liquidity, cross-border banking flows", type: "macro", url: "https://www.bis.org/statistics/" },
  { name: "IMF World Economic Outlook", desc: "Global GDP, inflation, trade growth forecasts", type: "macro", url: "https://www.imf.org/en/Publications/WEO" },
  { name: "World Bank Open Data", desc: "Developing economy indicators, labor market statistics", type: "macro", url: "https://data.worldbank.org/" },
  { name: "BLS JOLTS", desc: "Warehouse worker employment, automation displacement", type: "labor", url: "https://www.bls.gov/jlt/" },
  { name: "Stocktwits", desc: "Social sentiment API for SYM ticker", type: "sentiment", url: "https://api.stocktwits.com/api/2/streams/symbol/SYM.json" },
  { name: "Alpha Vantage", desc: "Technical indicators, earnings calendar, sector data", type: "market", url: "https://www.alphavantage.co/" },
  { name: "Damodaran NYU", desc: "Sector multiples, risk premiums, growth rate databases", type: "fundamental", url: "https://pages.stern.nyu.edu/~adamodar/" },
];

const AGENT_PROMPTS = [
  {
    agent: "Firm Agent",
    description: "Runs three-statement model, DCF, and multiples analysis",
    prompt: `You are a sell-side equity analyst specializing in AI robotics companies. 
    
Given these assumptions: {assumptions}
Historical financials for Symbotic:
- FY2022: $593M revenue, -$98M EBITDA
- FY2023: $1,177M revenue, -$137M EBITDA  
- FY2024: $1,788M revenue, +$62M EBITDA
- FY2025: $2,247M revenue, +$147M EBITDA

Build a 5-year DCF model, calculate a peer-based EV/Revenue multiple, and derive a probability-weighted price target. Return: { dcf_target, comps_target, ensemble_target, key_assumptions, sensitivity_table }`,
  },
  {
    agent: "Ecosystem Agent",
    description: "Compares SYM against robotics and automation peers",
    prompt: `You are a sector specialist in warehouse automation and industrial robotics.

Given current multiples data for peers: Fanuc (4.2x EV/Rev), ABB (2.8x), Rockwell (3.9x), GreyOrange (8.2x)
And Symbotic's metrics: {metrics}

Determine fair EV/Revenue for SYM, assess competitive moat, and project 5-year market share. Return: { fair_multiple, market_share_path, competitive_advantages, key_risks, page_target }`,
  },
  {
    agent: "Global Macro Agent",
    description: "Integrates BIS, IMF, and geopolitical risk data",
    prompt: `You are a macro analyst specializing in supply chain risk and credit cycles.

Current macro environment: China tariff spread {china_tariff_bps}bps, Global credit spread {credit_spread_bps}bps, Supply chain resilience index {resilience_score}/100

Calculate a macro discount factor for SYM based on: (1) China tariff impact on COGS, (2) credit cycle position, (3) supply chain disruption probability, (4) geopolitical flashpoints. Return: { macro_discount, key_risks, bull_macro, bear_macro, globe_highlights }`,
  },
  {
    agent: "Consumer/Sentiment Agent",
    description: "Processes social sentiment and labor market data",
    prompt: `You are a quantitative analyst specializing in alternative data and social sentiment.

Stocktwits/Fintwit data: {sentiment_data}
Labor statistics: warehouse automation penetration {labor_displacement}%
Customer concentration: Walmart {walmart_pct}% of revenue

Derive: sentiment-adjusted beta, concentration risk discount, labor displacement adoption curve. Return: { sentiment_score, concentration_penalty, adoption_curve, page_target }`,
  },
  {
    agent: "Orchestrator Agent",
    description: "Processes NL queries and coordinates cross-page updates",
    prompt: `You are the master orchestrator for the SYM Valuation Neural Nexus.

User query: "{user_query}"
Current assumptions: {assumptions}
Current ensemble target: ${"{current_target}"}

Parse the user's intent, extract specific assumption changes, validate them against reasonable ranges, apply them, and return an updated ensemble. Format your response to clearly explain what changed and why. Return: { updates: [{key, old_value, new_value, rationale}], new_ensemble, narrative }`,
  },
];

const METHODOLOGY = [
  { step: "1", title: "Data Ingestion", desc: "Live data pulled from SEC EDGAR, Yahoo Finance, BLS, Stocktwits, BIS/IMF APIs at page load and refreshed on demand." },
  { step: "2", title: "Page-Level Models", desc: "Each specialist page runs an independent valuation methodology (DCF, comps, regression, sentiment-adjusted beta) and produces its own price target." },
  { step: "3", title: "Ensemble Weighting", desc: "Executive Summary uses Bayesian-weighted averaging across all active page targets. Weights: Firm 35%, Ecosystem 25%, Global 12%, Consumer 10%, Government 8%, Historical 5%, Academia 5%." },
  { step: "4", title: "Macro Discount", desc: "A composite macro risk factor (China tariffs, credit spreads, AI regulation score) applies a multiplicative discount/premium to the ensemble before the final price target is quoted." },
  { step: "5", title: "Impact Heatmap", desc: "For each assumption, a ±1% perturbation is applied in isolation and the ensemble is recalculated. The % change in price target = the assumption's impact score, which drives all heatmap colors." },
  { step: "6", title: "Nexus Graph", desc: "Nodes are colored by the maximum bull-impact assumption in each category. Edge thickness scales with data recency. Neural pulses fire on any assumption change." },
];

const TYPE_COLORS: Record<string, string> = {
  primary: "hsl(196 100% 50%)",
  market: "hsl(262 83% 65%)",
  fundamental: "hsl(142 70% 45%)",
  macro: "hsl(40 90% 55%)",
  labor: "hsl(0 72% 55%)",
  sentiment: "hsl(196 80% 60%)",
};

export function Appendix() {
  return (
    <div className="h-full overflow-y-auto page-enter">
      <div className="p-6 space-y-8">
        <div>
          <h1 className="text-base font-semibold text-foreground">Appendix</h1>
          <p className="text-xs text-muted-foreground">Data sources · Agent methodology · Version history · Raw data dictionary</p>
        </div>

        {/* Data sources */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Database size={12} className="text-primary" />
            <h2 className="text-[10px] font-mono text-muted-foreground tracking-widest">DATA SOURCES</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DATA_SOURCES.map((s) => (
              <div key={s.name} className="cyber-panel p-3 flex items-start gap-3">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
                  style={{ background: TYPE_COLORS[s.type] || "#666" }}
                />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground">{s.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</div>
                  <div
                    className="text-[9px] font-mono mt-1 truncate"
                    style={{ color: TYPE_COLORS[s.type] || "#666" }}
                  >
                    {s.url}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Methodology */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <GitBranch size={12} className="text-secondary" />
            <h2 className="text-[10px] font-mono text-muted-foreground tracking-widest">METHODOLOGY</h2>
          </div>
          <div className="space-y-2">
            {METHODOLOGY.map((m) => (
              <div key={m.step} className="flex gap-4 p-3 cyber-panel">
                <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-mono font-bold text-primary">{m.step}</span>
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">{m.title}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{m.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent prompts */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText size={12} className="text-green-400" />
            <h2 className="text-[10px] font-mono text-muted-foreground tracking-widest">AGENT PROMPT TEMPLATES</h2>
          </div>
          <div className="space-y-3">
            {AGENT_PROMPTS.map((a) => (
              <div key={a.agent} className="cyber-panel p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="text-xs font-semibold text-primary">{a.agent}</div>
                  <div className="text-[10px] text-muted-foreground">— {a.description}</div>
                </div>
                <pre className="text-[10px] font-mono text-muted-foreground bg-muted/20 rounded p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {a.prompt}
                </pre>
              </div>
            ))}
          </div>
        </div>

        {/* Version */}
        <div className="cyber-panel p-4">
          <div className="text-[10px] font-mono text-muted-foreground tracking-wider mb-2">VERSION HISTORY</div>
          <div className="space-y-1.5 text-[10px] font-mono">
            <div className="flex gap-4"><span className="text-primary">v1.0.0</span><span className="text-muted-foreground">Initial release — 11-page dashboard with full Nexus overlay</span></div>
            <div className="flex gap-4"><span className="text-primary">v1.1.0</span><span className="text-muted-foreground">Added holographic globe, BIS/IMF macro integration</span></div>
            <div className="flex gap-4"><span className="text-primary">v1.2.0</span><span className="text-muted-foreground">Impact heatmap layer, Bayesian ensemble</span></div>
          </div>
        </div>

        {/* Architecture note */}
        <div className="cyber-panel p-4 border-primary/30">
          <div className="text-[10px] font-mono text-primary tracking-wider mb-3">ARCHITECTURE DIAGRAM (MERMAID)</div>
          <pre className="text-[9px] font-mono text-muted-foreground bg-muted/10 rounded p-3 overflow-x-auto">
{`graph TB
  subgraph Frontend["React Frontend (Vite + Tailwind + shadcn)"]
    NB[Neural Background Canvas]
    TB2[Top Bar — Heatmap Toggle + Price Target]
    NO[Nexus Overlay — ReactFlow Graph]
    SB[Sidebar Navigation]
    subgraph Pages
      LP[Landing] --> KA[Key Assumptions]
      KA --> FP[Firm] & EP[Ecosystem] & HP[Historical]
      KA --> CP[Consumer] & GP[Global 3D Globe] & AP[Academia]
      KA --> GV[Government]
      FP & EP & HP & CP & GP & AP & GV --> ES[Executive Summary]
      ES --> APP[Appendix]
    end
  end
  subgraph Backend["Express + FastAPI Backend"]
    API[REST API Routes]
    VE[Valuation Engine]
    DB[(SQLite via Drizzle)]
  end
  subgraph State["Zustand Global Store"]
    AS[Assumptions State]
    VS[Valuation State]
    HM[Heatmap Mode]
    PT[Page Toggles]
  end
  Pages <--> API
  API <--> VE
  API <--> DB
  Pages <--> State
  NO <--> State`}
          </pre>
        </div>
      </div>
    </div>
  );
}
