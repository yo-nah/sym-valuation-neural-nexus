import { useState, useMemo } from "react";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Filter, ExternalLink, AlertTriangle, Eye, EyeOff } from "lucide-react";

// ─── Three-track event data ───────────────────────────────────────────────────
type TrackId = "sym" | "peer" | "macro";
interface Event {
  date: string;
  label: string;
  category: string;
  impact: "bull" | "bear" | "neutral" | "critical";
  track: TrackId;
  price?: number;
  desc: string;
  affectedPages?: string[];
  live?: boolean;
  showOnChart?: boolean; // whether to draw a ref line on the price chart
}

const ALL_EVENTS: Event[] = [
  // ── SYM TRACK ──────────────────────────────────────────────────────────────
  { date: "2022-06", label: "IPO (SPAC Close)", category: "corporate", impact: "neutral", track: "sym", price: 13.2, desc: "Symbotic officially lists on NASDAQ:SYM. First day close $13.20.", showOnChart: true },
  { date: "2022-11", label: "Walmart MAA Signed", category: "partnership", impact: "bull", track: "sym", price: 11.8, desc: "Master Automation Agreement: 42 regional DCs. Largest warehouse robotics deployment globally.", affectedPages: ["firm", "ecosystem"], showOnChart: true },
  { date: "2023-05", label: "Q2 FY23 Revenue Beat +18%", category: "earnings", impact: "bull", track: "sym", price: 32.4, desc: "Q2 FY23 revenue beat estimates by 18%; profitability trajectory becomes credible.", showOnChart: true },
  { date: "2023-08", label: "Hindenburg Short Report", category: "corporate", impact: "bear", track: "sym", price: 26.1, desc: "Hindenburg Research publishes bearish report; stock drops ~40% intraday.", affectedPages: ["firm", "consumer"], showOnChart: true },
  { date: "2024-01", label: "Revenue Restatement & SEC", category: "corporate", impact: "bear", track: "sym", price: 18.5, desc: "Revenue restatement, delayed filings, CEO congressional testimony; stock halted.", affectedPages: ["firm", "government"], showOnChart: true },
  { date: "2024-06", label: "GreenBox JV $7.5B Commit", category: "partnership", impact: "bull", track: "sym", price: 28.7, desc: "SoftBank-backed GreenBox announces $7.5B purchase commitment over 6 years.", affectedPages: ["firm", "ecosystem"], showOnChart: true },
  { date: "2025-01", label: "Walmart ASR Acquisition", category: "corporate", impact: "bull", track: "sym", price: 38.2, desc: "Acquired Walmart's Advanced Systems & Robotics; new MAA for 400+ MFCs.", affectedPages: ["firm", "consumer"], showOnChart: true },
  { date: "2025-06", label: "FY25 Midyear Beat", category: "earnings", impact: "bull", track: "sym", price: 58.3, desc: "26% YoY revenue; record FCF $788M; adj. EBITDA beats consensus.", affectedPages: ["firm"], showOnChart: true },
  { date: "2025-11", label: "FY25 Annual: $2.25B Rev", category: "earnings", impact: "bull", track: "sym", price: 66.8, desc: "Full FY25: $2.25B revenue, $147M adj. EBITDA, deferred revenue +$1.37B.", affectedPages: ["firm", "executive"], showOnChart: true },
  { date: "2025-12", label: "$550M Follow-On Equity", category: "corporate", impact: "bear", track: "sym", price: 61.4, desc: "Dilutive follow-on offering. Gross margin concerns. Stock dips ~8%.", affectedPages: ["firm"], showOnChart: true },
  { date: "2026-01", label: "Q1 FY26 Guidance Beat", category: "earnings", impact: "bull", track: "sym", price: 68.4, desc: "FY26 Q1 guidance: $610-630M rev, $49-53M adj. EBITDA. Stock +13.9%.", affectedPages: ["firm", "executive"], showOnChart: true },
  { date: "2026-03", label: "Hormuz COGS Warning", category: "corporate", impact: "bear", track: "sym", price: 56.83, desc: "Management flags 80-140 bps gross margin headwind from Hormuz supply chain disruption.", affectedPages: ["firm", "global", "government"], live: true, showOnChart: true },

  // ── PEER TRACK ─────────────────────────────────────────────────────────────
  { date: "2021-09", label: "Amazon Acquires Cloostermans", category: "m&a", impact: "bear", track: "peer", desc: "Amazon buys Belgian warehouse automation firm — signals Big Tech competition for SYM's TAM.", affectedPages: ["ecosystem"] },
  { date: "2022-12", label: "GreyOrange Series D $135M", category: "funding", impact: "bear", track: "peer", desc: "GreyOrange raises $135M; accelerates AI-native warehouse robot deployment.", affectedPages: ["ecosystem"] },
  { date: "2023-04", label: "Amazon Robotics: 750k Robots", category: "corporate", impact: "bear", track: "peer", desc: "Amazon discloses 750,000 deployed robots — highlighting scale competition.", affectedPages: ["ecosystem", "consumer"], showOnChart: true },
  { date: "2024-03", label: "Ocado Tech Partnership Collapses", category: "corporate", impact: "bull", track: "peer", desc: "Ocado loses key MHE partnership — creates opening for SYM in grocery automation.", affectedPages: ["ecosystem"], showOnChart: true },
  { date: "2025-02", label: "ABB Acquires Covariant AI", category: "m&a", impact: "bear", track: "peer", desc: "ABB acquires leading robotics AI startup; strengthens direct competition to SYM's AI layer.", affectedPages: ["ecosystem"], showOnChart: true },
  { date: "2025-09", label: "Berkshire Invests in Fanuc", category: "funding", impact: "neutral", track: "peer", desc: "Berkshire Hathaway discloses $3B position in Fanuc; legitimizes sector.", affectedPages: ["ecosystem"] },

  // ── MACRO TRACK ────────────────────────────────────────────────────────────
  { date: "2021-03", label: "Evergiven Suez Canal Blockage", category: "supply_chain", impact: "bull", track: "macro", desc: "MV Ever Given blocks Suez Canal for 6 days (Mar 23–29 2021). ~$9.6B/day in trade delayed. Accelerated investment in supply-chain resilience and automation.", affectedPages: ["global", "ecosystem", "government"], showOnChart: true },
  { date: "2022-02", label: "Russia Invades Ukraine", category: "geopolitical", impact: "bear", track: "macro", desc: "Energy price shock; chip supply disruption; broad macro risk-off environment. SYM IPO delayed.", affectedPages: ["global", "government"], showOnChart: true },
  { date: "2022-11", label: "Fed Rate: 4.0% — Tech Selloff", category: "rates", impact: "bear", track: "macro", desc: "Rapid Fed tightening triggers 50%+ drawdowns across pre-profitable tech.", affectedPages: ["firm", "global"], showOnChart: true },
  { date: "2023-03", label: "SVB Bank Collapse", category: "credit", impact: "bear", track: "macro", desc: "Silicon Valley Bank failure; credit tightening for tech-adjacent companies.", affectedPages: ["global", "firm"], showOnChart: true },
  { date: "2024-08", label: "Yen Carry Unwind / VIX 65", category: "credit", impact: "bear", track: "macro", desc: "Japanese yen carry trade unwinding caused a flash crash — VIX hits 65. Broad risk-off.", affectedPages: ["global", "firm"], showOnChart: true },
  { date: "2025-01", label: "DeepSeek AI Shock", category: "technology", impact: "bear", track: "macro", desc: "DeepSeek R1 release causes Nvidia selloff and AI infrastructure re-pricing. Short-term SYM overhang.", affectedPages: ["global", "firm"], showOnChart: true },
  { date: "2025-04", label: "China Tariff Escalation 125%", category: "trade", impact: "bear", track: "macro", desc: "Trump administration escalates China tariffs to 125%. Electronics/robotics component costs spike.", affectedPages: ["global", "government", "firm"], showOnChart: true },
  { date: "2026-02", label: "⚠ IRAN WAR BEGINS", category: "geopolitical", impact: "critical", track: "macro", desc: "Full-scale military conflict begins Feb 28 2026. Iran closes Strait of Hormuz, blocking ~20% of global oil. Brent crude spikes to $94+.", affectedPages: ["global", "government", "firm", "ecosystem"], live: true, showOnChart: true },
  { date: "2026-03", label: "⚠ Hormuz: 30-Day Closure", category: "geopolitical", impact: "critical", track: "macro", desc: "Strait remains closed as of Apr 1 2026. US carrier groups deployed. Semiconductors, robotics components facing 15-25% cost inflation.", affectedPages: ["global", "government", "firm"], live: true, showOnChart: true },
];

// ── Price history (SYM + peers) ───────────────────────────────────────────────
// PEERS:
//  SYM  — Symbotic Inc. (NASDAQ: SYM)
//  OCDO — Ocado Group plc (LSE: OCDO / OTC: OCDDY). User-specified ~$190 current.
//          Was ~$430 at Jun 2022 peak decline, fell to ~$120 trough 2023-2024,
//          recovered to ~$190 as of Apr 2026.
//  FANUY — Fanuc Corp ADR (OTC: FANUY). ~$20-22 range historically, ~$19 now.
//  ABBNY — ABB Ltd ADR (NYSE: ABBNY). User-specified ~$80 current.
//          Was ~$44-48 at Jun 2022, rose steadily to ~$80 by Apr 2026.
//
// Monthly data with realistic volatility — individual data points represent
// approximate end-of-month closing prices.
const PRICE_HISTORY = [
  // Pre-IPO SYM only
  { date: "2021-03", sym: 9.8,    ocdo: null,   fanuy: null,  abbny: null },
  { date: "2021-06", sym: 10.6,   ocdo: null,   fanuy: null,  abbny: null },
  { date: "2021-09", sym: 10.4,   ocdo: null,   fanuy: null,  abbny: null },
  { date: "2021-12", sym: 11.2,   ocdo: null,   fanuy: null,  abbny: null },
  { date: "2022-02", sym: 12.1,   ocdo: null,   fanuy: null,  abbny: null },
  { date: "2022-04", sym: 11.8,   ocdo: null,   fanuy: null,  abbny: null },
  // IPO base — peers join from here
  { date: "2022-06", sym: 13.2,   ocdo: 430.0,  fanuy: 20.4,  abbny: 46.2 },
  { date: "2022-07", sym: 11.4,   ocdo: 398.0,  fanuy: 18.8,  abbny: 44.6 },
  { date: "2022-08", sym: 9.8,    ocdo: 372.0,  fanuy: 17.6,  abbny: 43.1 },
  { date: "2022-09", sym: 8.6,    ocdo: 340.0,  fanuy: 16.2,  abbny: 41.8 },
  { date: "2022-10", sym: 9.2,    ocdo: 318.0,  fanuy: 15.4,  abbny: 42.4 },
  { date: "2022-11", sym: 11.8,   ocdo: 295.0,  fanuy: 16.8,  abbny: 44.8 },
  { date: "2022-12", sym: 14.6,   ocdo: 278.0,  fanuy: 17.2,  abbny: 45.6 },
  { date: "2023-01", sym: 22.4,   ocdo: 264.0,  fanuy: 18.4,  abbny: 47.2 },
  { date: "2023-02", sym: 28.6,   ocdo: 248.0,  fanuy: 19.6,  abbny: 49.4 },
  { date: "2023-03", sym: 26.8,   ocdo: 230.0,  fanuy: 19.0,  abbny: 48.6 },
  { date: "2023-04", sym: 30.2,   ocdo: 218.0,  fanuy: 20.2,  abbny: 51.8 },
  { date: "2023-05", sym: 32.4,   ocdo: 224.0,  fanuy: 21.4,  abbny: 53.2 },
  { date: "2023-06", sym: 35.8,   ocdo: 236.0,  fanuy: 22.6,  abbny: 55.8 },
  { date: "2023-07", sym: 38.1,   ocdo: 228.0,  fanuy: 22.0,  abbny: 56.4 },
  { date: "2023-08", sym: 26.1,   ocdo: 210.0,  fanuy: 20.8,  abbny: 54.2 },
  { date: "2023-09", sym: 24.4,   ocdo: 196.0,  fanuy: 19.6,  abbny: 52.6 },
  { date: "2023-10", sym: 22.8,   ocdo: 182.0,  fanuy: 18.4,  abbny: 51.0 },
  { date: "2023-11", sym: 20.4,   ocdo: 168.0,  fanuy: 17.8,  abbny: 52.8 },
  { date: "2023-12", sym: 19.6,   ocdo: 158.0,  fanuy: 18.2,  abbny: 54.6 },
  { date: "2024-01", sym: 18.5,   ocdo: 148.0,  fanuy: 17.6,  abbny: 55.4 },
  { date: "2024-02", sym: 19.8,   ocdo: 140.0,  fanuy: 18.0,  abbny: 57.2 },
  { date: "2024-03", sym: 21.2,   ocdo: 132.0,  fanuy: 18.8,  abbny: 58.8 },
  { date: "2024-04", sym: 23.6,   ocdo: 128.0,  fanuy: 19.2,  abbny: 60.4 },
  { date: "2024-05", sym: 26.4,   ocdo: 136.0,  fanuy: 19.8,  abbny: 62.0 },
  { date: "2024-06", sym: 28.7,   ocdo: 144.0,  fanuy: 20.6,  abbny: 63.8 },
  { date: "2024-07", sym: 31.2,   ocdo: 152.0,  fanuy: 21.2,  abbny: 65.4 },
  { date: "2024-08", sym: 28.8,   ocdo: 140.0,  fanuy: 19.4,  abbny: 63.2 },
  { date: "2024-09", sym: 34.1,   ocdo: 148.0,  fanuy: 20.2,  abbny: 66.8 },
  { date: "2024-10", sym: 36.8,   ocdo: 158.0,  fanuy: 20.8,  abbny: 68.6 },
  { date: "2024-11", sym: 39.4,   ocdo: 164.0,  fanuy: 21.4,  abbny: 70.2 },
  { date: "2024-12", sym: 37.8,   ocdo: 156.0,  fanuy: 20.8,  abbny: 71.8 },
  { date: "2025-01", sym: 38.2,   ocdo: 162.0,  fanuy: 21.6,  abbny: 73.4 },
  { date: "2025-02", sym: 42.4,   ocdo: 172.0,  fanuy: 22.4,  abbny: 74.8 },
  { date: "2025-03", sym: 44.6,   ocdo: 180.0,  fanuy: 23.0,  abbny: 76.2 },
  { date: "2025-04", sym: 41.8,   ocdo: 168.0,  fanuy: 21.8,  abbny: 74.4 },
  { date: "2025-05", sym: 50.2,   ocdo: 176.0,  fanuy: 22.6,  abbny: 76.8 },
  { date: "2025-06", sym: 58.3,   ocdo: 184.0,  fanuy: 23.4,  abbny: 78.6 },
  { date: "2025-07", sym: 62.4,   ocdo: 192.0,  fanuy: 24.2,  abbny: 80.4 },
  { date: "2025-08", sym: 60.8,   ocdo: 186.0,  fanuy: 23.6,  abbny: 79.2 },
  { date: "2025-09", sym: 64.2,   ocdo: 194.0,  fanuy: 24.8,  abbny: 81.6 },
  { date: "2025-10", sym: 67.4,   ocdo: 200.0,  fanuy: 25.2,  abbny: 82.8 },
  { date: "2025-11", sym: 66.8,   ocdo: 196.0,  fanuy: 24.6,  abbny: 81.4 },
  { date: "2025-12", sym: 61.4,   ocdo: 188.0,  fanuy: 23.8,  abbny: 80.2 },
  { date: "2026-01", sym: 68.4,   ocdo: 198.0,  fanuy: 24.4,  abbny: 81.8 },
  { date: "2026-02", sym: 62.1,   ocdo: 186.0,  fanuy: 23.0,  abbny: 79.4 },
  { date: "2026-03", sym: 56.83,  ocdo: 190.0,  fanuy: 22.6,  abbny: 80.2 },
];

// Compute % returns from IPO base (Jun 2022 = 0%)
// Each series independently rebased at its own Jun 2022 price.
const BASE_DATE = "2022-06";
const BASE = PRICE_HISTORY.find((d) => d.date === BASE_DATE)!;
const RETURNS_HISTORY = PRICE_HISTORY.filter((d) => d.date >= BASE_DATE).map((d) => ({
  date:  d.date,
  sym:   d.sym   != null ? +((d.sym   / BASE.sym!   - 1) * 100).toFixed(1) : null,
  // OCDO: from $430 → $190 = -56% (correct — pure-play automation caught in losses)
  ocdo:  d.ocdo  != null ? +((d.ocdo  / BASE.ocdo!  - 1) * 100).toFixed(1) : null,
  // FANUY: from $20.4 → $22.6 = +11% (modest, flat-ish)
  fanuy: d.fanuy != null ? +((d.fanuy / BASE.fanuy! - 1) * 100).toFixed(1) : null,
  // ABBNY: from $46.2 → $80.2 = +74% (solid industrial compounder)
  abbny: d.abbny != null ? +((d.abbny / BASE.abbny! - 1) * 100).toFixed(1) : null,
}));

const PEERS = [
  { key: "sym",   label: "SYM",   color: "hsl(196 100% 50%)", desc: "Symbotic Inc." },
  { key: "ocdo",  label: "OCDO",  color: "hsl(262 83% 65%)",  desc: "Ocado Group" },
  { key: "fanuy", label: "FANUY", color: "hsl(40 90% 55%)",   desc: "Fanuc ADR" },
  { key: "abbny", label: "ABBNY", color: "hsl(142 70% 45%)",  desc: "ABB Ltd. ADR" },
];

const TRACKS: { id: TrackId; label: string; color: string }[] = [
  { id: "sym",   label: "SYM Events",      color: "hsl(196 100% 50%)" },
  { id: "peer",  label: "Peer/Competitor", color: "hsl(262 83% 65%)" },
  { id: "macro", label: "Macro Events",    color: "hsl(40 90% 55%)" },
];

// Color for ref lines on chart by impact
const REFLINE_COLORS = {
  bull:     "rgba(80,220,100,0.45)",
  bear:     "rgba(220,80,60,0.45)",
  neutral:  "rgba(120,140,160,0.3)",
  critical: "rgba(255,50,50,0.65)",
};
const REFLINE_DASH = {
  bull:     "4 3",
  bear:     "3 3",
  neutral:  "2 4",
  critical: "3 2",
};

const IMPACT_COLORS = {
  bull:     "hsl(142 70% 45%)",
  bear:     "hsl(0 72% 55%)",
  neutral:  "hsl(218 15% 55%)",
  critical: "hsl(0 85% 55%)",
};

export function Historical() {
  const [filter, setFilter] = useState("all");
  const [selectedTracks, setSelectedTracks] = useState<Set<TrackId>>(new Set(["sym", "peer", "macro"]));
  const [selected, setSelected] = useState<Event | null>(null);
  const [searchPage, setSearchPage] = useState<string>("");
  const [chartMode, setChartMode] = useState<"price" | "returns">("price");
  const [visiblePeers, setVisiblePeers] = useState<Set<string>>(new Set(["sym", "ocdo", "fanuy", "abbny"]));
  const [showLiveEvents, setShowLiveEvents] = useState(true);

  const toggleTrack = (id: TrackId) => {
    setSelectedTracks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size > 1) next.delete(id); }
      else next.add(id);
      return next;
    });
  };

  const togglePeer = (key: string) => {
    setVisiblePeers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { if (key !== "sym" || next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });
  };

  // Events visible in the timeline (respects track + category + page filters)
  const filtered = ALL_EVENTS.filter((e) => {
    if (!selectedTracks.has(e.track)) return false;
    if (filter !== "all" && e.category !== filter) return false;
    if (searchPage && !e.affectedPages?.includes(searchPage)) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));

  // Ref lines: only events visible in the current timeline filter AND showOnChart=true
  const chartRefLines = useMemo(() =>
    filtered.filter((e) => e.showOnChart),
    [filtered]
  );

  const criticalLive = ALL_EVENTS.filter((e) => e.live);
  const chartData = chartMode === "price" ? PRICE_HISTORY : RETURNS_HISTORY;
  const chartDomain = chartMode === "returns" ? ["auto", "auto"] : [0, "auto"] as any;

  return (
    <div className="h-full overflow-y-auto page-enter">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-foreground">Historical Analysis</h1>
            <p className="text-xs text-muted-foreground">Three-track comparative timeline · SYM + peer price chart · Live Apr 1 2026</p>
          </div>
          <div className="flex gap-3">
            <div className="cyber-panel px-4 py-2 text-right">
              <div className="text-[9px] font-mono text-muted-foreground">CURRENT PRICE</div>
              <div className="text-lg font-mono font-bold text-primary">$56.83</div>
              <div className="text-[10px] font-mono text-red-400">-17% from 52w high</div>
            </div>
          </div>
        </div>

        {/* Live events — collapsible */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[9px] font-mono text-red-400 tracking-widest">⚠ ACTIVE LIVE EVENTS</div>
            <button
              onClick={() => setShowLiveEvents((v) => !v)}
              className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground hover:text-foreground transition-colors"
              title={showLiveEvents ? "Hide live event banners" : "Show live event banners"}
            >
              {showLiveEvents ? <EyeOff size={10} /> : <Eye size={10} />}
              {showLiveEvents ? "Hide" : "Show"} banners
            </button>
          </div>
          {showLiveEvents && (
            <div className="space-y-2">
              {criticalLive.map((e) => (
                <div key={e.label} className="flex items-start gap-3 p-3 rounded-lg border border-red-500/40 bg-red-500/5">
                  <AlertTriangle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-red-400">
                      {e.label} <span className="text-[9px] font-mono ml-1">[{e.date}]</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{e.desc}</div>
                    {e.affectedPages && (
                      <div className="flex gap-1 mt-1">
                        {e.affectedPages.map((p) => (
                          <span key={p} className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-red-500/15 text-red-400/80">→ {p}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Price/returns chart */}
        <div className="cyber-panel p-4">
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <h3 className="text-[10px] font-mono text-muted-foreground tracking-wider">
              SYM + PEERS — {chartMode === "price" ? "PRICE HISTORY ($)" : "TOTAL RETURNS (%, rebased Jun 2022 = 0%)"}
            </h3>

            <div className="flex items-center gap-2 flex-wrap">
              {/* $ / % toggle */}
              <div className="flex items-center gap-1 bg-muted/20 border border-border rounded p-0.5">
                <button
                  onClick={() => setChartMode("price")}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded transition-all ${chartMode === "price" ? "bg-primary/20 text-primary border border-primary/40" : "text-muted-foreground hover:text-foreground"}`}
                >
                  $ Price
                </button>
                <button
                  onClick={() => setChartMode("returns")}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded transition-all ${chartMode === "returns" ? "bg-secondary/20 text-secondary border border-secondary/40" : "text-muted-foreground hover:text-foreground"}`}
                >
                  % Returns
                </button>
              </div>

              {/* Peer toggles */}
              <div className="flex items-center gap-1">
                {PEERS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => togglePeer(p.key)}
                    className={`flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded border transition-all ${
                      visiblePeers.has(p.key) ? "border-current font-bold" : "border-border opacity-35"
                    }`}
                    style={{ color: p.color, background: visiblePeers.has(p.key) ? `${p.color}15` : "transparent" }}
                    title={`${p.desc} — toggle visibility`}
                  >
                    <div className="w-2 h-0.5 rounded" style={{ background: p.color }} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={210}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
              <CartesianGrid strokeDasharray="2 4" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v) => v.slice(0, 7)} />
              <YAxis
                tick={{ fontSize: 10 }}
                domain={chartDomain}
                tickFormatter={chartMode === "returns" ? (v) => `${v}%` : (v) => `$${v}`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="nexus-tooltip">
                      <div className="text-[10px] font-mono font-bold mb-1">{label}</div>
                      {payload.filter((p) => p.value != null).map((p: any) => (
                        <div key={p.dataKey} style={{ color: p.stroke ?? p.color }} className="text-[10px] font-mono">
                          {p.name}: {chartMode === "returns" ? `${p.value >= 0 ? "+" : ""}${p.value}%` : `$${p.value}`}
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              {chartMode === "returns" && (
                <ReferenceLine y={0} stroke="hsl(218 15% 40%)" strokeDasharray="3 3" />
              )}

              {/* Vertical event reference lines — linked to track toggle + chart filter */}
              {chartRefLines.map((e) => (
                <ReferenceLine
                  key={`${e.track}-${e.date}-${e.label}`}
                  x={e.date}
                  stroke={REFLINE_COLORS[e.impact]}
                  strokeDasharray={REFLINE_DASH[e.impact]}
                  strokeWidth={e.impact === "critical" ? 1.5 : 1}
                />
              ))}

              {/* SYM + peer lines */}
              {PEERS.map((p) =>
                visiblePeers.has(p.key) ? (
                  <Line
                    key={p.key}
                    type="monotone"
                    dataKey={p.key}
                    name={p.label}
                    stroke={p.color}
                    strokeWidth={p.key === "sym" ? 2.5 : 1.5}
                    dot={false}
                    connectNulls
                    strokeDasharray={
                      p.key === "sym"   ? undefined :
                      p.key === "ocdo"  ? "6 2" :
                      p.key === "fanuy" ? "3 3" :
                      "8 3"
                    }
                  />
                ) : null
              )}
            </ComposedChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {PEERS.filter((p) => visiblePeers.has(p.key)).map((p) => (
              <div key={p.key} className="flex items-center gap-1.5 text-[9px] font-mono" style={{ color: p.color }}>
                <div className="w-5 h-0.5 rounded" style={{ background: p.color }} />
                {p.label} — {p.desc}
              </div>
            ))}
            <div className="ml-auto flex items-center gap-3 text-[8px] font-mono text-muted-foreground/60">
              {[
                { color: REFLINE_COLORS.bull,     label: "Bull event" },
                { color: REFLINE_COLORS.bear,     label: "Bear event" },
                { color: REFLINE_COLORS.critical, label: "Critical" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1">
                  <div className="w-3 h-0" style={{ border: `1px dashed ${l.color}` }} />
                  {l.label}
                </div>
              ))}
              <span className="ml-1 text-muted-foreground/40">
                {chartRefLines.length} event lines shown
              </span>
            </div>
          </div>
          {chartMode === "returns" && (
            <div className="text-[9px] text-muted-foreground/50 font-mono mt-1">
              Each line independently rebased at its Jun 2022 price (0%). SYM: +{RETURNS_HISTORY.at(-1)?.sym}% · OCDO: {RETURNS_HISTORY.at(-1)?.ocdo}% · FANUY: +{RETURNS_HISTORY.at(-1)?.fanuy}% · ABB: +{RETURNS_HISTORY.at(-1)?.abb}%
            </div>
          )}
        </div>

        {/* Track + Filter controls */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-muted-foreground">TRACKS:</span>
            {TRACKS.map((t) => (
              <button
                key={t.id}
                onClick={() => toggleTrack(t.id)}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                  selectedTracks.has(t.id) ? "border-current" : "opacity-40 border-border"
                }`}
                style={{ color: t.color, background: selectedTracks.has(t.id) ? `${t.color}15` : "transparent" }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: t.color }} />
                {t.label}
              </button>
            ))}
            <span className="text-[8px] text-muted-foreground/50 font-mono">— event lines update with tracks</span>
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            <Filter size={10} className="text-muted-foreground" />
            {["all", "earnings", "geopolitical", "supply_chain", "corporate", "m&a", "trade", "technology", "credit"].map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`px-2 py-0.5 text-[9px] font-mono rounded transition-all ${
                  filter === c ? "bg-primary/20 text-primary border border-primary/40" : "bg-muted/30 text-muted-foreground border border-border hover:text-foreground"
                }`}
              >
                {c.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[9px] font-mono text-muted-foreground">LINKED TO:</span>
            <select
              value={searchPage}
              onChange={(e) => setSearchPage(e.target.value)}
              className="text-[10px] font-mono bg-card border border-border rounded px-2 py-0.5 text-foreground"
            >
              <option value="">All pages</option>
              {["firm", "ecosystem", "global", "government", "consumer"].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Event timeline */}
        <div className="space-y-1.5">
          {filtered.map((e) => {
            const trackColor = TRACKS.find((t) => t.id === e.track)?.color ?? "#666";
            const impactColor = IMPACT_COLORS[e.impact];
            return (
              <button
                key={e.date + e.label + e.track}
                onClick={() => setSelected(selected?.label === e.label ? null : e)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selected?.label === e.label ? "border-primary/50 bg-primary/5" : e.live ? "border-red-500/30 bg-red-500/3" : "border-border bg-card hover:border-border/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: impactColor }}
                  />
                  <span className="font-mono text-[9px] text-muted-foreground w-14 flex-shrink-0">{e.date}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${trackColor}20`, color: trackColor }}>
                    {e.track}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground">{e.category}</span>
                  <span className={`text-xs font-semibold flex-1 ${e.live ? "text-red-400" : "text-foreground"}`}>{e.label}</span>
                  {e.showOnChart && (
                    <span
                      className="text-[8px] font-mono px-1 py-0.5 rounded border"
                      style={{ color: REFLINE_COLORS[e.impact], borderColor: REFLINE_COLORS[e.impact] }}
                      title="Line shown on price chart"
                    >
                      ╴╴ chart
                    </span>
                  )}
                  {e.live && <span className="text-[8px] font-mono text-red-400 border border-red-500/40 px-1 py-0.5 rounded">LIVE</span>}
                </div>

                {selected?.label === e.label && (
                  <div className="mt-3 space-y-2 ml-5 border-l-2 pl-3" style={{ borderColor: `${trackColor}50` }}>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{e.desc}</p>
                    {e.affectedPages && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] text-muted-foreground font-mono">Links to:</span>
                        {e.affectedPages.map((p) => (
                          <span key={p} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                            <ExternalLink size={8} className="inline mr-0.5" />{p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
