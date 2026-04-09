import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNexusStore } from "@/lib/store";
import { AssumptionCard } from "@/components/AssumptionCard";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, BarChart, Bar, Cell,
} from "recharts";
import type { Assumption, Valuation } from "@/lib/store";
import { Filter, Info } from "lucide-react";

// ── Peer data with descriptions + similarity scores ──────────────────────────
const PEERS = [
  {
    ticker: "SYM",
    name: "Symbotic",
    color: "hsl(196 100% 50%)",
    evRev: 8.1,
    evEbitda: null,
    revGrowth: 26,
    grossMargin: 21,
    mktCapB: 19.3,
    tamOverlapPct: 100,
    cosineSim: 1.00,
    automationFocus: 98,
    aiNative: 95,
    desc: "Full-stack AI robotics platform for warehouse automation. Revenue model: hardware deployments + recurring software/AI licensing. Deep Walmart/SoftBank customer moat.",
    type: "pure-play",
  },
  {
    ticker: "FANUY",
    name: "Fanuc",
    color: "hsl(262 83% 65%)",
    evRev: 4.2,
    evEbitda: 22,
    revGrowth: 8,
    grossMargin: 55,
    mktCapB: 28.1,
    tamOverlapPct: 62,
    cosineSim: 0.61,
    automationFocus: 85,
    aiNative: 45,
    desc: "Japanese industrial robot OEM — CNC systems, collaborative robots, servo motors. Serves automotive and electronics manufacturing primarily, not warehouse-native.",
    type: "industrial",
  },
  {
    ticker: "ABB",
    name: "ABB",
    color: "hsl(40 90% 55%)",
    evRev: 2.8,
    evEbitda: 18,
    revGrowth: 6,
    grossMargin: 36,
    mktCapB: 72.4,
    tamOverlapPct: 48,
    cosineSim: 0.52,
    automationFocus: 72,
    aiNative: 38,
    desc: "Swiss conglomerate with robotics, electrification and industrial automation divisions. Acquired Covariant AI (2025) to bolster warehouse robotics AI capabilities.",
    type: "conglomerate",
  },
  {
    ticker: "ROK",
    name: "Rockwell Auto.",
    color: "hsl(142 70% 45%)",
    evRev: 3.9,
    evEbitda: 19,
    revGrowth: 5,
    grossMargin: 42,
    mktCapB: 18.9,
    tamOverlapPct: 41,
    cosineSim: 0.44,
    automationFocus: 78,
    aiNative: 30,
    desc: "Industrial automation and information technology specialist. Primarily serves discrete and process manufacturing — limited direct warehouse robotics exposure.",
    type: "industrial",
  },
  {
    ticker: "KUKA",
    name: "KUKA AG",
    color: "hsl(0 72% 55%)",
    evRev: 1.6,
    evEbitda: 16,
    revGrowth: 4,
    grossMargin: 28,
    mktCapB: 3.1,
    tamOverlapPct: 55,
    cosineSim: 0.57,
    automationFocus: 82,
    aiNative: 42,
    desc: "German industrial robot manufacturer (Midea-owned). Strong in automotive robotic arms; growing footprint in logistics automation via KMR mobile robots.",
    type: "industrial",
  },
  {
    ticker: "GREY",
    name: "GreyOrange",
    color: "hsl(196 60% 65%)",
    evRev: 8.2,
    evEbitda: null,
    revGrowth: 42,
    grossMargin: 30,
    mktCapB: 1.8,
    tamOverlapPct: 88,
    cosineSim: 0.89,
    automationFocus: 96,
    aiNative: 88,
    desc: "AI-native warehouse robotics platform — direct SYM competitor. Butler AMR fleet + Ranger ASRS systems for e-commerce and 3PL. Raised $135M Series D; targeting IPO.",
    type: "pure-play",
  },
  {
    ticker: "AMZN",
    name: "Amazon Robotics",
    color: "hsl(40 90% 60%)",
    evRev: null,
    evEbitda: null,
    revGrowth: 12,
    grossMargin: 47,
    mktCapB: 2200,
    tamOverlapPct: 75,
    cosineSim: 0.78,
    automationFocus: 90,
    aiNative: 92,
    desc: "750,000+ deployed robots (Kiva/Proteus/Sparrow/Cardinal). Internal captive market only — not a commercial vendor, but sets the pace for warehouse AI and creates SYM competitive pressure.",
    type: "internal",
  },
  {
    ticker: "OCDO",
    name: "Ocado Tech",
    color: "hsl(262 60% 60%)",
    evRev: 6.4,
    evEbitda: null,
    revGrowth: 18,
    grossMargin: 12,
    mktCapB: 5.2,
    tamOverlapPct: 70,
    cosineSim: 0.72,
    automationFocus: 94,
    aiNative: 65,
    desc: "UK-based grocery automation tech — proprietary Hive grid ASRS system licensed to global grocery retailers (Kroger, Sobeys, Coles). Direct TAM overlap with SYM's grocery/MFC segment.",
    type: "pure-play",
  },
];

const RADAR_DATA = [
  { subject: "Rev\nGrowth",  SYM: 90, Peers: 30 },
  { subject: "Gross\nMargin", SYM: 42, Peers: 65 },
  { subject: "TAM\nCapture",  SYM: 75, Peers: 40 },
  { subject: "Backlog",       SYM: 95, Peers: 20 },
  { subject: "AI-Native",     SYM: 88, Peers: 52 },
  { subject: "Profitability", SYM: 38, Peers: 70 },
];

const TYPE_FILTERS = ["all", "pure-play", "industrial", "conglomerate", "internal"];
const TYPE_COLORS: Record<string, string> = {
  "pure-play":   "hsl(196 100% 50%)",
  "industrial":  "hsl(262 83% 65%)",
  "conglomerate":"hsl(40 90% 55%)",
  "internal":    "hsl(40 70% 60%)",
};

export function Ecosystem() {
  const { valuation } = useNexusStore();
  const { data: assumptions = [] } = useQuery<Assumption[]>({ queryKey: ["/api/assumptions"] });
  const ecoAssumptions = assumptions.filter((a: Assumption) => a.category === "ecosystem");

  const [typeFilter, setTypeFilter] = useState("all");
  const [sortKey, setSortKey] = useState<string>("tamOverlapPct");
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);

  const compsTarget = valuation ? ((valuation.compsRev + valuation.compsEbitda) / 2) : 0;

  const filteredPeers = PEERS
    .filter((p) => typeFilter === "all" || p.type === typeFilter)
    .sort((a, b) => {
      if (sortKey === "tamOverlapPct") return b.tamOverlapPct - a.tamOverlapPct;
      if (sortKey === "cosineSim") return b.cosineSim - a.cosineSim;
      if (sortKey === "revGrowth") return b.revGrowth - a.revGrowth;
      if (sortKey === "evRev") return (b.evRev ?? 0) - (a.evRev ?? 0);
      return 0;
    });

  const simData = PEERS.filter((p) => p.ticker !== "SYM").map((p) => ({
    name: p.ticker,
    overlap: p.tamOverlapPct,
    similarity: Math.round(p.cosineSim * 100),
    color: p.color,
  }));

  return (
    <div className="h-full overflow-y-auto page-enter">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-foreground">Ecosystem Analysis</h1>
            <p className="text-xs text-muted-foreground">Peer multiples · TAM overlap · Cosine similarity scores · Competitive positioning — Apr 2026</p>
          </div>
          <div className="cyber-panel px-4 py-2 text-right">
            <div className="text-[9px] font-mono text-muted-foreground">COMPS TARGET</div>
            <div className="text-lg font-mono font-bold text-secondary">${compsTarget.toFixed(2)}</div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          {/* Left: Assumptions + TAM */}
          <div className="col-span-2 space-y-3">
            <h2 className="text-[10px] font-mono text-muted-foreground tracking-widest">ECOSYSTEM ASSUMPTIONS</h2>
            <div className="space-y-2">
              {ecoAssumptions.map((a: Assumption) => (
                <AssumptionCard key={a.id} assumption={a} />
              ))}
            </div>

            {/* Similarity legend */}
            <div className="cyber-panel p-3 space-y-2">
              <div className="text-[10px] font-mono text-muted-foreground tracking-wider flex items-center gap-1.5">
                <Info size={10} /> SIMILARITY SCORE METHODOLOGY
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Cosine similarity computed on a 6-dimension vector: {"{"}warehouse automation focus, AI-native architecture, recurring revenue %, B2B enterprise model, supply-chain integration depth, robotics hardware %{"}"}.
                TAM overlap = % of SYM's $433B TAM addressable by peer.
              </p>
            </div>

            {/* Similarity bar chart */}
            <div className="cyber-panel p-3">
              <div className="text-[10px] font-mono text-muted-foreground mb-2 tracking-wider">BUSINESS MODEL SIMILARITY TO SYM</div>
              <div className="space-y-1.5">
                {simData.sort((a, b) => b.similarity - a.similarity).map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-[10px]">
                    <div className="w-10 text-right font-mono text-muted-foreground">{d.name}</div>
                    <div className="flex-1 h-3 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${d.similarity}%`, background: d.color, opacity: 0.8 }}
                      />
                    </div>
                    <div className="w-8 font-mono text-right" style={{ color: d.color }}>{d.similarity}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* TAM breakdown */}
            <div className="cyber-panel p-3 space-y-2">
              <div className="text-[10px] font-mono text-muted-foreground tracking-wider">TAM BREAKDOWN</div>
              {[
                { label: "Warehouse Automation", value: "$433B", pct: 58 },
                { label: "US Micro-Fulfillment",  value: "$305B", pct: 42 },
                { label: "Total Addressable",     value: "$738B", pct: 100 },
              ].map((t) => (
                <div key={t.label} className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">{t.label}</span>
                    <span className="font-mono text-foreground">{t.value}</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary/70 rounded-full" style={{ width: `${t.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Peer table + charts */}
          <div className="col-span-3 space-y-4">
            {/* Filters + sort */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1">
                <Filter size={10} className="text-muted-foreground" />
                {TYPE_FILTERS.map((f) => (
                  <button key={f} onClick={() => setTypeFilter(f)}
                    className={`px-2 py-0.5 text-[9px] font-mono rounded border transition-all ${typeFilter === f ? "bg-primary/20 text-primary border-primary/40" : "bg-muted/20 text-muted-foreground border-border hover:text-foreground"}`}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 ml-auto text-[9px] font-mono text-muted-foreground">
                SORT:
                {["tamOverlapPct", "cosineSim", "revGrowth", "evRev"].map((k) => (
                  <button key={k} onClick={() => setSortKey(k)}
                    className={`px-1.5 py-0.5 rounded border transition-all ${sortKey === k ? "bg-secondary/20 text-secondary border-secondary/40" : "border-border hover:text-foreground"}`}
                  >
                    {k === "tamOverlapPct" ? "TAM%" : k === "cosineSim" ? "SIM" : k === "revGrowth" ? "GROWTH" : "EV/Rev"}
                  </button>
                ))}
              </div>
            </div>

            {/* Peer table with expanded descriptions */}
            <div className="cyber-panel overflow-hidden">
              <div className="text-[10px] font-mono text-muted-foreground tracking-wider p-4 pb-2">PEER COMPARISON TABLE</div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-border">
                      {["Ticker", "Type", "EV/Rev", "Rev Growth", "GM%", "TAM Overlap", "Similarity"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-mono text-muted-foreground font-normal text-[9px] tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPeers.map((p) => (
                      <>
                        <tr
                          key={p.ticker}
                          className={`border-b border-border/40 cursor-pointer transition-colors ${p.ticker === "SYM" ? "bg-primary/5" : "hover:bg-white/2"} ${expandedTicker === p.ticker ? "bg-muted/10" : ""}`}
                          onClick={() => setExpandedTicker(expandedTicker === p.ticker ? null : p.ticker)}
                        >
                          <td className="px-3 py-2 font-mono font-bold" style={{ color: p.color }}>{p.ticker}</td>
                          <td className="px-3 py-2">
                            <span className="text-[9px] font-mono px-1 py-0.5 rounded"
                              style={{ background: `${TYPE_COLORS[p.type] || "#666"}15`, color: TYPE_COLORS[p.type] || "#666" }}>
                              {p.type}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-foreground">{p.evRev != null ? `${p.evRev}x` : "N/A"}</td>
                          <td className={`px-3 py-2 font-mono ${p.revGrowth > 20 ? "text-green-400" : "text-muted-foreground"}`}>{p.revGrowth}%</td>
                          <td className="px-3 py-2 font-mono text-muted-foreground">{p.grossMargin}%</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-16 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${p.tamOverlapPct}%`, background: p.color, opacity: 0.7 }} />
                              </div>
                              <span className="font-mono text-[10px]" style={{ color: p.color }}>{p.tamOverlapPct}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-12 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${p.cosineSim * 100}%`, background: p.color, opacity: 0.7 }} />
                              </div>
                              <span className="font-mono text-[10px]" style={{ color: p.color }}>{(p.cosineSim * 100).toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                        {/* Expanded description row */}
                        {expandedTicker === p.ticker && (
                          <tr key={`${p.ticker}-desc`} className="border-b border-border/20 bg-muted/5">
                            <td colSpan={7} className="px-4 py-3">
                              <div className="flex items-start gap-3">
                                <div className="flex-1">
                                  <div className="text-[11px] font-semibold text-foreground mb-1">{p.name}</div>
                                  <p className="text-[10px] text-muted-foreground leading-relaxed">{p.desc}</p>
                                </div>
                                <div className="grid grid-cols-3 gap-3 flex-shrink-0">
                                  <div className="text-center">
                                    <div className="text-[9px] text-muted-foreground font-mono">AI-NATIVE</div>
                                    <div className="text-sm font-mono font-bold" style={{ color: p.color }}>{p.aiNative}%</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-[9px] text-muted-foreground font-mono">AUTOMATION</div>
                                    <div className="text-sm font-mono font-bold" style={{ color: p.color }}>{p.automationFocus}%</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-[9px] text-muted-foreground font-mono">MKT CAP</div>
                                    <div className="text-sm font-mono font-bold" style={{ color: p.color }}>${p.mktCapB < 100 ? p.mktCapB + "B" : (p.mktCapB / 1000).toFixed(1) + "T"}</div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Radar */}
            <div className="cyber-panel p-4">
              <h3 className="text-[10px] font-mono text-muted-foreground mb-3 tracking-wider">COMPETITIVE POSITIONING RADAR</h3>
              <ResponsiveContainer width="100%" height={190}>
                <RadarChart data={RADAR_DATA}>
                  <PolarGrid stroke="hsl(220 20% 18%)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: "hsl(218 15% 55%)", fontFamily: "JetBrains Mono" }} />
                  <Radar name="SYM" dataKey="SYM" stroke="hsl(196 100% 50%)" fill="hsl(196 100% 50% / 0.2)" strokeWidth={2} />
                  <Radar name="Peer Avg" dataKey="Peers" stroke="hsl(262 83% 65%)" fill="hsl(262 83% 65% / 0.1)" strokeWidth={1} strokeDasharray="4 4" />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Bubble: EV/Rev vs Growth, bubble = TAM overlap */}
            <div className="cyber-panel p-4">
              <h3 className="text-[10px] font-mono text-muted-foreground mb-3 tracking-wider">EV/REV vs REV GROWTH — BUBBLE = TAM OVERLAP %</h3>
              <ResponsiveContainer width="100%" height={150}>
                <ScatterChart margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
                  <CartesianGrid strokeDasharray="2 4" />
                  <XAxis dataKey="revGrowth" name="Rev Growth %" tick={{ fontSize: 10 }} label={{ value: "Rev Growth %", position: "insideBottom", fontSize: 9, fill: "#666" }} />
                  <YAxis dataKey="evRev" name="EV/Rev" tick={{ fontSize: 10 }} />
                  <ZAxis dataKey="tamOverlapPct" range={[30, 200]} />
                  <Tooltip cursor={false} content={({ payload }) => {
                    if (!payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="nexus-tooltip">
                        <div className="font-bold text-[11px]">{d.ticker} — {d.name}</div>
                        <div className="text-[10px] text-muted-foreground">{d.desc?.slice(0, 60)}...</div>
                        <div className="text-[10px] mt-1">EV/Rev: {d.evRev ?? "N/A"} | Growth: {d.revGrowth}% | Similarity: {(d.cosineSim * 100).toFixed(0)}%</div>
                      </div>
                    );
                  }} />
                  {PEERS.filter((p) => p.evRev != null).map((p) => (
                    <Scatter key={p.ticker} name={p.ticker} data={[p]} fill={p.color} opacity={0.85} />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
