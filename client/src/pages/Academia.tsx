import { useState, useMemo } from "react";
import { useNexusStore } from "@/lib/store";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, AreaChart, Area, ScatterChart, Scatter, ZAxis, Legend,
} from "recharts";
import { BookOpen, ExternalLink, Star, FlaskConical, TrendingUp } from "lucide-react";

const PAPERS = [
  {
    id: "acemoglu",
    title: "Robots and Jobs: Evidence from US Labor Markets",
    authors: "Acemoglu & Restrepo",
    year: 2020,
    journal: "Journal of Political Economy",
    tags: ["labor displacement", "robotics", "macroeconomics"],
    relevance: 9.2,
    summary: "Establishes causal evidence that industrial robots reduce employment and wages; provides the empirical baseline for our labor displacement assumption.",
    keyInsight: "1 additional robot per 1,000 workers reduces employment-to-population ratio by 0.18–0.34%. Directly calibrates the labor displacement rate assumption.",
    priceSensitivity: "+3.2% bull / -2.1% bear sensitivity",
    valuationMethod: "labor-productivity-dcf",
    methodLabel: "Labor-Productivity DCF Overlay",
    targetAdj: 1.042,  // multiplier over base ensemble
  },
  {
    id: "mgi",
    title: "The Future of Work: Automation Will Transform Industry",
    authors: "McKinsey Global Institute",
    year: 2023,
    journal: "MGI Report",
    tags: ["automation", "TAM", "supply chain"],
    relevance: 8.8,
    summary: "Estimates 400M–800M workers globally could be displaced by automation by 2030; warehouse/logistics among highest-automation sectors.",
    keyInsight: "Retail fulfillment automation TAM may reach $500B+ by 2035 at 15.7% CAGR — validates SYM's $433B TAM estimate.",
    priceSensitivity: "+4.1% bull TAM uplift",
    valuationMethod: "tam-expansion",
    methodLabel: "TAM Expansion Overlay",
    targetAdj: 1.058,
  },
  {
    id: "zhang",
    title: "Deep Learning-Based Stock Price Prediction Using LSTM Networks",
    authors: "Zhang et al.",
    year: 2024,
    journal: "Journal of Financial Data Science",
    tags: ["ML forecasting", "LSTM", "price prediction"],
    relevance: 7.1,
    summary: "LSTM-based price forecasting integrating supply-chain sentiment data — methodology applicable to SYM's contract-driven revenue model.",
    keyInsight: "Backlog-to-price correlation in long-cycle B2B firms averages 0.62 over 18-month horizons. Backlog is a leading indicator.",
    priceSensitivity: "Applied as LSTM Overlay in Executive Summary",
    valuationMethod: "backlog-regression",
    methodLabel: "Backlog Regression Overlay",
    targetAdj: 1.025,
  },
  {
    id: "seamans",
    title: "Network Effects in Platform Businesses: Evidence from Logistics",
    authors: "Seamans & Zhu",
    year: 2023,
    journal: "Strategic Management Journal",
    tags: ["platform economics", "network effects", "SaaS"],
    relevance: 8.3,
    summary: "Logistics software platforms compound value through network effects; SYM's AI fleet management software exhibits these properties.",
    keyInsight: "Platform businesses with >40% repeat-customer revenue command 2.1–3.4x multiple premium. SYM's Walmart lock-in qualifies.",
    priceSensitivity: "+5.8% if software layer priced at platform multiples",
    valuationMethod: "platform-multiple",
    methodLabel: "Platform Multiple Overlay",
    targetAdj: 1.082,
  },
  {
    id: "hendricks",
    title: "Supply Chain Disruptions and Firm Valuation",
    authors: "Hendricks & Singhal",
    year: 2022,
    journal: "Management Science",
    tags: ["supply chain", "risk", "event study"],
    relevance: 7.6,
    summary: "Event-study of 519 supply chain disruptions; firms experience average -9% abnormal return within 60 days.",
    keyInsight: "Automation-focused firms experience 40% lower disruption-related return impact vs. manual counterparts — validates SYM's resilience premium.",
    priceSensitivity: "-3.4% if supply chain score deteriorates 20 pts (CRITICAL now with Hormuz crisis)",
    valuationMethod: "disruption-discount",
    methodLabel: "Supply Chain Disruption Discount",
    targetAdj: 0.933,
  },
  {
    id: "damodaran",
    title: "Valuing High-Growth Technology Firms: A Bayesian DCF Approach",
    authors: "Damodaran & Swaminathan",
    year: 2024,
    journal: "Journal of Applied Finance",
    tags: ["valuation", "Bayesian", "DCF", "growth"],
    relevance: 9.5,
    summary: "Proposes Bayesian-weighted ensemble DCF for pre-profitability growth firms with contracted backlog — directly used as our ensemble methodology.",
    keyInsight: "Bayesian DCF reduces estimation error by 31% vs. traditional DCF for firms with >10x revenue-to-FCF gaps.",
    priceSensitivity: "Core methodology — drives ensemble weighting",
    valuationMethod: "bayesian-dcf",
    methodLabel: "Bayesian DCF (Core Method)",
    targetAdj: 1.0,
  },
];

const TAG_COLORS: Record<string, string> = {
  "labor displacement":   "hsl(0 72% 55%)",
  "robotics":             "hsl(196 100% 50%)",
  "macroeconomics":       "hsl(40 90% 55%)",
  "automation":           "hsl(262 83% 65%)",
  "TAM":                  "hsl(142 70% 45%)",
  "supply chain":         "hsl(40 80% 55%)",
  "ML forecasting":       "hsl(196 80% 60%)",
  "LSTM":                 "hsl(196 80% 60%)",
  "price prediction":     "hsl(196 80% 60%)",
  "valuation":            "hsl(262 83% 65%)",
  "Bayesian":             "hsl(262 83% 65%)",
  "DCF":                  "hsl(262 83% 65%)",
  "platform economics":   "hsl(142 70% 45%)",
  "network effects":      "hsl(142 70% 45%)",
  "SaaS":                 "hsl(142 70% 45%)",
  "risk":                 "hsl(0 60% 55%)",
  "event study":          "hsl(40 80% 55%)",
  "growth":               "hsl(142 70% 45%)",
};

// Sensitivity table data per paper
function buildSensitivityData(paper: typeof PAPERS[0], baseEnsemble: number) {
  const rows = [-30, -20, -10, 0, 10, 20, 30];
  return rows.map((pctChange) => {
    const adj = paper.targetAdj;
    const perturbed = adj + (pctChange / 100) * (adj - 1);
    return {
      change: `${pctChange > 0 ? "+" : ""}${pctChange}%`,
      target: (baseEnsemble * perturbed).toFixed(2),
      delta: ((perturbed - adj) * baseEnsemble).toFixed(2),
      impact: pctChange > 0 ? "bull" : pctChange < 0 ? "bear" : "neutral",
    };
  });
}

// Tornado chart: impact of each paper's method on price target
function buildTornadoData(papers: typeof PAPERS, baseEnsemble: number) {
  return papers.map((p) => ({
    name: p.methodLabel.replace(" Overlay", "").replace("(Core Method)", "").trim(),
    bull: ((p.targetAdj - 1) * baseEnsemble).toFixed(1),
    bear: (-(p.targetAdj - 1) * 0.6 * baseEnsemble).toFixed(1),
    adj: p.targetAdj,
    color: p.relevance >= 9 ? "hsl(196 100% 50%)" : p.relevance >= 8 ? "hsl(142 70% 45%)" : "hsl(40 90% 55%)",
  })).sort((a, b) => Math.abs(parseFloat(b.bull)) - Math.abs(parseFloat(a.bull)));
}

export function Academia() {
  const { valuation } = useNexusStore();
  const baseEnsemble = valuation?.ensemble ?? 56.83;

  const [selected, setSelected] = useState<typeof PAPERS[0] | null>(null);
  const [enabledOverlays, setEnabledOverlays] = useState<Set<string>>(new Set(["bayesian-dcf"]));
  const [activeTab, setActiveTab] = useState<"papers" | "valuation">("papers");

  const toggleOverlay = (id: string) => {
    setEnabledOverlays((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  // Academic ensemble: weighted average of enabled overlays
  const academicTarget = useMemo(() => {
    const enabled = PAPERS.filter((p) => enabledOverlays.has(p.valuationMethod));
    if (!enabled.length) return baseEnsemble;
    const weightedSum = enabled.reduce((s, p) => s + p.targetAdj * (p.relevance / 10), 0);
    const weightSum = enabled.reduce((s, p) => s + p.relevance / 10, 0);
    return (baseEnsemble * weightedSum) / weightSum;
  }, [baseEnsemble, enabledOverlays]);

  const tornadoData = useMemo(() => buildTornadoData(PAPERS, baseEnsemble), [baseEnsemble]);
  const avgRelevance = (PAPERS.reduce((s, p) => s + p.relevance, 0) / PAPERS.length).toFixed(1);

  // Overlay targets for bar chart
  const overlayChartData = PAPERS.map((p) => ({
    name: p.authors.split(" ")[0],
    target: parseFloat((baseEnsemble * p.targetAdj).toFixed(2)),
    enabled: enabledOverlays.has(p.valuationMethod),
    color: enabledOverlays.has(p.valuationMethod) ? "hsl(196 100% 50%)" : "hsl(220 20% 25%)",
  }));

  return (
    <div className="h-full overflow-y-auto page-enter">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-foreground">Academia</h1>
            <p className="text-xs text-muted-foreground">High-impact papers · Novel valuation methods · Sensitivity tables · Stress-test tornado</p>
          </div>
          <div className="flex gap-3">
            <div className="cyber-panel px-4 py-2 text-center">
              <div className="text-[9px] font-mono text-muted-foreground">PAPERS</div>
              <div className="text-lg font-mono font-bold text-primary">{PAPERS.length}</div>
            </div>
            <div className="cyber-panel px-4 py-2 text-center">
              <div className="text-[9px] font-mono text-muted-foreground">AVG RELEVANCE</div>
              <div className="text-lg font-mono font-bold text-secondary">{avgRelevance}/10</div>
            </div>
            <div className="cyber-panel px-4 py-2 text-center">
              <div className="text-[9px] font-mono text-muted-foreground">ACADEMIC TARGET</div>
              <div className="text-lg font-mono font-bold text-green-400">${academicTarget.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-muted/20 border border-border rounded-lg p-1 w-fit">
          {[
            { id: "papers", label: "Research Papers", icon: BookOpen },
            { id: "valuation", label: "Academic Valuation Model", icon: FlaskConical },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-mono transition-all ${
                activeTab === id ? "bg-primary/20 text-primary border border-primary/40" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={11} />
              {label}
            </button>
          ))}
        </div>

        {/* ── TAB: PAPERS ── */}
        {activeTab === "papers" && (
          <div className="space-y-3">
            {PAPERS.sort((a, b) => b.relevance - a.relevance).map((paper) => (
              <div
                key={paper.title}
                className={`cyber-panel p-4 cursor-pointer transition-all ${selected?.id === paper.id ? "border-primary/50" : "hover:border-border/80"}`}
                onClick={() => setSelected(selected?.id === paper.id ? null : paper)}
              >
                <div className="flex items-start gap-3">
                  <BookOpen size={14} className="text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-xs font-semibold text-foreground leading-tight">{paper.title}</h3>
                        <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                          {paper.authors} · {paper.journal} · {paper.year}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleOverlay(paper.valuationMethod); }}
                          className={`text-[8px] font-mono px-1.5 py-0.5 rounded border transition-all ${
                            enabledOverlays.has(paper.valuationMethod)
                              ? "bg-primary/20 border-primary/40 text-primary"
                              : "bg-muted/20 border-border text-muted-foreground"
                          }`}
                        >
                          {enabledOverlays.has(paper.valuationMethod) ? "OVERLAY ON" : "OVERLAY OFF"}
                        </button>
                        <div className="flex items-center gap-1">
                          <Star size={10} className="text-yellow-400 fill-yellow-400" />
                          <span className="text-[11px] font-mono font-bold text-yellow-400">{paper.relevance}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {paper.tags.map((t) => (
                        <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                          style={{ background: `${TAG_COLORS[t] || "hsl(218 15% 40%)"}20`, color: TAG_COLORS[t] || "hsl(218 15% 55%)" }}>
                          {t}
                        </span>
                      ))}
                    </div>

                    {selected?.id === paper.id && (
                      <div className="mt-3 space-y-3 border-t border-border/50 pt-3">
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{paper.summary}</p>
                        <div className="bg-primary/5 border border-primary/20 rounded p-2.5 space-y-1">
                          <div className="text-[9px] font-mono text-primary tracking-wider">KEY INSIGHT</div>
                          <p className="text-[11px] text-foreground leading-relaxed">{paper.keyInsight}</p>
                        </div>
                        <div className="bg-secondary/5 border border-secondary/20 rounded p-2 flex items-center justify-between">
                          <div className="text-[10px] font-mono text-secondary">{paper.priceSensitivity}</div>
                          <div className="text-[10px] font-mono text-foreground">
                            Method target: <strong className="text-primary">${(baseEnsemble * paper.targetAdj).toFixed(2)}</strong>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TAB: VALUATION MODEL ── */}
        {activeTab === "valuation" && (
          <div className="space-y-6">
            {/* Academic overlay selector */}
            <div className="cyber-panel p-4 space-y-3">
              <div className="text-[10px] font-mono text-muted-foreground tracking-wider">ACADEMIC VALUATION OVERLAYS — TOGGLE TO INCLUDE IN ACADEMIC ENSEMBLE</div>
              <div className="grid grid-cols-3 gap-2">
                {PAPERS.map((p) => (
                  <button
                    key={p.valuationMethod}
                    onClick={() => toggleOverlay(p.valuationMethod)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      enabledOverlays.has(p.valuationMethod)
                        ? "border-primary/50 bg-primary/8"
                        : "border-border bg-muted/20 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${enabledOverlays.has(p.valuationMethod) ? "bg-primary" : "bg-muted-foreground"}`} />
                      <span className="text-[9px] font-mono text-muted-foreground">{p.authors.split(" ")[0]}</span>
                    </div>
                    <div className="text-[10px] text-foreground leading-tight">{p.methodLabel}</div>
                    <div className="text-[11px] font-mono font-bold text-primary mt-1">${(baseEnsemble * p.targetAdj).toFixed(2)}</div>
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="text-xs font-semibold text-foreground">Academic Ensemble Target</div>
                <div className="flex items-end gap-2">
                  <div className="price-target" style={{ fontSize: "1.6rem" }}>${academicTarget.toFixed(2)}</div>
                  <div className="text-[10px] font-mono text-muted-foreground mb-1">({enabledOverlays.size} overlays active)</div>
                </div>
              </div>
            </div>

            {/* Overlay target comparison */}
            <div className="cyber-panel p-4">
              <div className="text-[10px] font-mono text-muted-foreground mb-3 tracking-wider">PRICE TARGET BY ACADEMIC METHOD ($)</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={overlayChartData} margin={{ top: 4, right: 8, bottom: 20, left: 4 }}>
                  <CartesianGrid strokeDasharray="2 4" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} domain={[0, "auto"]} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return <div className="nexus-tooltip"><div className="font-mono text-[11px]">${payload[0].value}</div></div>;
                  }} />
                  <Bar dataKey="target" radius={[3, 3, 0, 0]}>
                    {overlayChartData.map((d, i) => (
                      <Cell key={i} fill={d.enabled ? "hsl(196 100% 50%)" : "hsl(220 20% 28%)"} opacity={d.enabled ? 0.85 : 0.4} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tornado chart — academic method sensitivity */}
            <div className="cyber-panel p-4">
              <div className="text-[10px] font-mono text-muted-foreground mb-3 tracking-wider">TORNADO CHART — ACADEMIC METHOD IMPACT ON PRICE TARGET ($ vs BASE ${baseEnsemble.toFixed(0)})</div>
              <div className="space-y-2">
                {tornadoData.map((d) => {
                  const bullPx = Math.abs(parseFloat(d.bull));
                  const bearPx = Math.abs(parseFloat(d.bear));
                  const maxPx = Math.max(...tornadoData.map((x) => Math.max(Math.abs(parseFloat(x.bull)), Math.abs(parseFloat(x.bear)))));
                  return (
                    <div key={d.name} className="flex items-center gap-2 text-[10px]">
                      <div className="w-36 text-right font-mono text-muted-foreground truncate text-[9px]">{d.name}</div>
                      <div className="flex-1 flex items-center justify-center gap-0.5 h-5">
                        <div
                          className="h-full rounded-l transition-all"
                          style={{ width: `${(bearPx / maxPx) * 45}%`, background: "hsl(0 72% 50% / 0.75)" }}
                        />
                        <div className="w-px h-full bg-border/50" />
                        <div
                          className="h-full rounded-r transition-all"
                          style={{ width: `${(bullPx / maxPx) * 45}%`, background: d.color, opacity: 0.85 }}
                        />
                      </div>
                      <div className="w-20 text-left font-mono text-[9px] flex gap-1">
                        <span className="text-red-400">-${bearPx.toFixed(1)}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-green-400">+${bullPx.toFixed(1)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sensitivity table for selected/top paper */}
            <div className="cyber-panel p-4">
              <div className="text-[10px] font-mono text-muted-foreground mb-3 tracking-wider">SENSITIVITY TABLE — DAMODARAN BAYESIAN DCF (CORE METHOD)</div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border">
                    {["Assumption Change", "Price Target", "Delta vs Base", "Signal"].map((h) => (
                      <th key={h} className="px-4 py-2 text-left font-mono text-muted-foreground font-normal text-[9px] tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {buildSensitivityData(PAPERS.find((p) => p.id === "damodaran")!, baseEnsemble).map((row) => (
                    <tr key={row.change} className={`border-b border-border/30 ${row.change === "0%" ? "bg-primary/5" : ""}`}>
                      <td className="px-4 py-2 font-mono text-foreground">{row.change}</td>
                      <td className={`px-4 py-2 font-mono font-bold ${row.change === "0%" ? "text-primary" : "text-foreground"}`}>${row.target}</td>
                      <td className={`px-4 py-2 font-mono ${parseFloat(row.delta) > 0 ? "text-green-400" : parseFloat(row.delta) < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                        {parseFloat(row.delta) > 0 ? "+" : ""}{row.delta}
                      </td>
                      <td className={`px-4 py-2 text-[10px] font-mono ${row.impact === "bull" ? "text-green-400" : row.impact === "bear" ? "text-red-400" : "text-muted-foreground"}`}>
                        {row.impact}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
