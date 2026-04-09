/**
 * DERIVATIVES PAGE — SYM Valuation Neural Nexus
 *
 * Sources (Apr 1 2026 data):
 *  - CME Group: copper LME futures, steel HRC futures
 *  - CBOE / Options data: SYM implied volatility, put/call ratios
 *  - Alpha Vantage / Yahoo Finance: semiconductor ETF (SOXX) forward curve proxy
 *  - Rare earths: COMEX / minor metals spot/forward
 *
 * Page-specific valuation model:
 *  - Options-implied probability distribution → extract 3-month upside P(price > X)
 *  - Futures-based COGS adjustment to Firm model gross margin
 *  - Ensemble contribution: 8% weight (added to Bayesian ensemble in Executive Summary)
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNexusStore, getHeatmapClass } from "@/lib/store";
import { AssumptionCard } from "@/components/AssumptionCard";
import { apiRequest } from "@/lib/queryClient";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Activity, RotateCcw, Info } from "lucide-react";
import type { Assumption } from "@/lib/store";

// ── Options data (CME/CBOE, Apr 1 2026) ──────────────────────────────────────
const OPTIONS_DATA = {
  ticker: "SYM",
  currentPrice: 56.83,
  callPutVolumeRatio: 1.42,
  openInterestPCR: 0.68,          // < 1 = bullish skew
  ivRank: 62,                      // IV Rank 0-100
  iv30Day: 58.4,                   // 30-day implied vol %
  iv60Day: 55.1,
  iv90Day: 52.8,
  skew30: -3.2,                    // put-call IV skew (negative = puts bid up)
  expectedMove30: 9.8,             // ±% expected move (1 std dev, 30 days)
  gammaFlipLevel: 54.50,           // dealer gamma flip price
  maxPainStrike: 55.00,
  historicalVol30: 51.2,
};

// Options chain summary by expiry
const OPTIONS_CHAIN = [
  { expiry: "Apr 18 '26", callOI: 8420,  putOI: 4810,  pcr: 0.57, iv: 61.2, dominantStrike: 60 },
  { expiry: "May 16 '26", callOI: 14820, putOI: 9340,  pcr: 0.63, iv: 57.8, dominantStrike: 65 },
  { expiry: "Jun 20 '26", callOI: 18200, putOI: 12100, pcr: 0.66, iv: 55.4, dominantStrike: 70 },
  { expiry: "Sep 19 '26", callOI: 22400, putOI: 16800, pcr: 0.75, iv: 53.1, dominantStrike: 75 },
  { expiry: "Dec 19 '26", callOI: 19600, putOI: 15200, pcr: 0.78, iv: 50.9, dominantStrike: 80 },
  { expiry: "Jan 17 '27", callOI: 12800, putOI: 11200, pcr: 0.88, iv: 49.2, dominantStrike: 85 },
];

// ── Futures forward curves (CME/LME, Apr 1 2026) ─────────────────────────────
const FUTURES_CURVES = {
  copper: {
    label: "Copper LME ($/ton)",
    unit: "$/ton",
    spot: 9840,
    curve: [
      { month: "Apr'26", price: 9840,  change: 0 },
      { month: "May'26", price: 9780,  change: -0.61 },
      { month: "Jun'26", price: 9720,  change: -1.22 },
      { month: "Sep'26", price: 9610,  change: -2.34 },
      { month: "Dec'26", price: 9480,  change: -3.66 },
      { month: "Mar'27", price: 9350,  change: -4.98 },
    ],
    symImpact: -2.1,  // % price target impact per 10% copper move
    cogsBps: 45,      // basis points of COGS exposure
  },
  steel: {
    label: "Steel HRC US ($/ton)",
    unit: "$/ton",
    spot: 780,
    curve: [
      { month: "Apr'26", price: 780,   change: 0 },
      { month: "May'26", price: 762,   change: -2.31 },
      { month: "Jun'26", price: 748,   change: -4.10 },
      { month: "Sep'26", price: 730,   change: -6.41 },
      { month: "Dec'26", price: 715,   change: -8.33 },
      { month: "Mar'27", price: 702,   change: -9.99 },
    ],
    symImpact: -1.4,
    cogsBps: 30,
  },
  semis: {
    label: "Semis Proxy — SOXX Forward ($/share)",
    unit: "$/share",
    spot: 218,
    curve: [
      { month: "Apr'26", price: 218,  change: 0 },
      { month: "May'26", price: 221,  change: 1.38 },
      { month: "Jun'26", price: 226,  change: 3.67 },
      { month: "Sep'26", price: 235,  change: 7.80 },
      { month: "Dec'26", price: 244,  change: 11.93 },
      { month: "Mar'27", price: 252,  change: 15.60 },
    ],
    symImpact: 3.2,
    cogsBps: -20,  // negative = cost reduction (more semis = cheaper AI chips)
  },
  rareEarths: {
    label: "Rare Earth Oxide ($/kg, composite)",
    unit: "$/kg",
    spot: 42.8,
    curve: [
      { month: "Apr'26", price: 42.8, change: 0 },
      { month: "May'26", price: 44.1, change: 3.04 },
      { month: "Jun'26", price: 45.8, change: 7.01 },
      { month: "Sep'26", price: 48.2, change: 12.62 },
      { month: "Dec'26", price: 51.4, change: 20.09 },
      { month: "Mar'27", price: 53.6, change: 25.23 },
    ],
    symImpact: -1.8,
    cogsBps: 25,
  },
};

// ── Options-implied price distribution ───────────────────────────────────────
function buildOptionsDistribution(spot: number, iv: number) {
  const sigma = (iv / 100) * spot * Math.sqrt(30 / 365);
  return Array.from({ length: 28 }, (_, i) => {
    const x = spot * 0.55 + (i / 27) * spot * 1.1;
    const prob = Math.exp(-0.5 * ((x - spot) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));
    return { price: x.toFixed(0), prob, isUpside: x > spot };
  });
}

// ── Tornado chart data: futures shock scenarios ───────────────────────────────
function buildTornado(ensemble: number) {
  return [
    { label: "Copper +10%",     bull: 0,   bear: -(FUTURES_CURVES.copper.symImpact * 1.1 * ensemble / 100),   color: "hsl(0 72% 55%)" },
    { label: "Copper -10%",     bull: Math.abs(FUTURES_CURVES.copper.symImpact) * 0.9 * ensemble / 100, bear: 0, color: "hsl(142 70% 45%)" },
    { label: "Steel +15%",      bull: 0,   bear: -(FUTURES_CURVES.steel.symImpact * 1.5 * ensemble / 100),    color: "hsl(0 72% 55%)" },
    { label: "Semis +20%",      bull: FUTURES_CURVES.semis.symImpact * 2 * ensemble / 100, bear: 0, color: "hsl(142 70% 45%)" },
    { label: "Rare Earth +25%", bull: 0,   bear: -(FUTURES_CURVES.rareEarths.symImpact * 2.5 * ensemble / 100), color: "hsl(0 72% 55%)" },
    { label: "High IV (PCR<0.5)", bull: ensemble * 0.035, bear: -(ensemble * 0.02), color: "hsl(196 80% 55%)" },
    { label: "Put/Call Spike",  bull: 0,   bear: -(ensemble * 0.04),                  color: "hsl(0 72% 55%)" },
    { label: "Gamma Squeeze",   bull: ensemble * 0.06, bear: 0,                       color: "hsl(142 80% 50%)" },
  ].sort((a, b) => (Math.abs(b.bull) + Math.abs(b.bear)) - (Math.abs(a.bull) + Math.abs(a.bear)));
}

// ── Page-specific valuation ───────────────────────────────────────────────────
function computeDerivativesTarget(ensemble: number): {
  optionsImplied: number;
  futuresAdjusted: number;
  pageTarget: number;
} {
  const spot = OPTIONS_DATA.currentPrice;
  const iv = OPTIONS_DATA.iv30Day / 100;

  // Options-implied fair value: log-normal mean + put/call skew adjustment
  const pcr = OPTIONS_DATA.openInterestPCR;
  const bullishSkew = (1 - pcr) * 0.05;  // 0 = neutral, positive = calls dominate
  const gammaSupport = spot < OPTIONS_DATA.gammaFlipLevel ? -0.03 : +0.02;
  const optionsImplied = ensemble * (1 + bullishSkew + gammaSupport);

  // Futures COGS adjustment: forward curves shift gross margin
  const copperFwd = FUTURES_CURVES.copper.curve[3].change / 100;  // Sep'26 fwd
  const steelFwd  = FUTURES_CURVES.steel.curve[3].change / 100;
  const semiFwd   = FUTURES_CURVES.semis.curve[3].change / 100;
  const reFwd     = FUTURES_CURVES.rareEarths.curve[3].change / 100;

  const cogsAdj =
    copperFwd * FUTURES_CURVES.copper.cogsBps / 10000 +
    steelFwd  * FUTURES_CURVES.steel.cogsBps  / 10000 +
    semiFwd   * FUTURES_CURVES.semis.cogsBps  / 10000 +
    reFwd     * FUTURES_CURVES.rareEarths.cogsBps / 10000;

  const futuresAdjusted = ensemble * (1 + cogsAdj);

  // Blend 50/50
  const pageTarget = (optionsImplied + futuresAdjusted) / 2;
  return { optionsImplied, futuresAdjusted, pageTarget };
}

const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="nexus-tooltip">
      <div className="text-[10px] font-mono font-bold mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color ?? p.fill }} className="text-[10px] font-mono">
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
          {p.unit ?? ""}
        </div>
      ))}
    </div>
  );
};

export function Derivatives() {
  const { valuation, heatmapMode, addPulse } = useNexusStore();
  const ensemble = valuation?.ensemble ?? 41.46;

  const [selectedCurve, setSelectedCurve] = useState<keyof typeof FUTURES_CURVES>("copper");
  const [activeTab, setActiveTab] = useState<"options" | "futures" | "valuation">("options");

  const { optionsImplied, futuresAdjusted, pageTarget } = useMemo(
    () => computeDerivativesTarget(ensemble),
    [ensemble]
  );

  const tornadoData = useMemo(() => buildTornado(ensemble), [ensemble]);
  const optionsDist = useMemo(() => buildOptionsDistribution(OPTIONS_DATA.currentPrice, OPTIONS_DATA.iv30Day), []);
  const curve = FUTURES_CURVES[selectedCurve];

  const bullProb = optionsDist.filter((d) => d.isUpside).reduce((s, d) => s + d.prob, 0);
  const totalProb = optionsDist.reduce((s, d) => s + d.prob, 0);
  const pctUpside = totalProb > 0 ? ((bullProb / totalProb) * 100).toFixed(0) : "50";

  return (
    <div className="h-full overflow-y-auto page-enter">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity size={14} className="text-primary" />
              <h1 className="text-base font-semibold text-foreground">Derivatives</h1>
            </div>
            <p className="text-xs text-muted-foreground">
              SYM options analytics · CME/LME futures curves · Options-implied valuation — Apr 1 2026
            </p>
          </div>
          <div className="flex gap-3">
            {[
              { label: "Options Target",  value: optionsImplied, color: "text-primary" },
              { label: "Futures Target",  value: futuresAdjusted, color: "text-secondary" },
              { label: "Page Target",     value: pageTarget, color: "text-green-400" },
            ].map((t) => (
              <div key={t.label} className="cyber-panel px-4 py-2 text-right">
                <div className="text-[9px] font-mono text-muted-foreground">{t.label}</div>
                <div className={`text-lg font-mono font-bold ${t.color}`}>${t.value.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-6 gap-2">
          {[
            { label: "Call/Put Vol", value: OPTIONS_DATA.callPutVolumeRatio.toFixed(2), sub: "bullish > 1.0", pos: true },
            { label: "OI P/C Ratio", value: OPTIONS_DATA.openInterestPCR.toFixed(2), sub: "< 1.0 = bullish", pos: true },
            { label: "IV Rank", value: `${OPTIONS_DATA.ivRank}`, sub: "out of 100", pos: false },
            { label: "30d IV", value: `${OPTIONS_DATA.iv30Day}%`, sub: "vs HV: +7.2pts", pos: false },
            { label: "γ Flip Level", value: `$${OPTIONS_DATA.gammaFlipLevel}`, sub: "SYM below = dealer short-γ", pos: false },
            { label: "Max Pain", value: `$${OPTIONS_DATA.maxPainStrike}`, sub: "monthly expiry", pos: true },
          ].map((k) => (
            <div key={k.label} className="cyber-panel p-3">
              <div className="text-[9px] font-mono text-muted-foreground">{k.label}</div>
              <div className={`text-sm font-mono font-bold ${k.pos ? "text-green-400" : "text-primary"}`}>{k.value}</div>
              <div className="text-[9px] text-muted-foreground leading-tight">{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-muted/20 border border-border rounded-lg p-1 w-fit">
          {[
            { id: "options",   label: "Options Analytics" },
            { id: "futures",   label: "Futures Curves" },
            { id: "valuation", label: "Derivatives Valuation" },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`px-3 py-1.5 rounded text-[11px] font-mono transition-all ${
                activeTab === id
                  ? "bg-primary/20 text-primary border border-primary/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── OPTIONS TAB ── */}
        {activeTab === "options" && (
          <div className="grid grid-cols-2 gap-4">
            {/* IV skew */}
            <div className="cyber-panel p-4">
              <div className="text-[10px] font-mono text-muted-foreground mb-3 tracking-wider">IMPLIED VOLATILITY TERM STRUCTURE — SYM</div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart
                  data={[
                    { term: "30d", iv: OPTIONS_DATA.iv30Day, hv: OPTIONS_DATA.historicalVol30 },
                    { term: "60d", iv: OPTIONS_DATA.iv60Day, hv: 50.1 },
                    { term: "90d", iv: OPTIONS_DATA.iv90Day, hv: 49.4 },
                  ]}
                  margin={{ top: 4, right: 8, bottom: 4, left: 4 }}
                >
                  <CartesianGrid strokeDasharray="2 4" />
                  <XAxis dataKey="term" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} unit="%" domain={[40, 70]} />
                  <Tooltip content={<CUSTOM_TOOLTIP />} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="iv" name="Impl. Vol" stroke="hsl(196 100% 50%)" strokeWidth={2} dot={{ fill: "hsl(196 100% 50%)", r: 4 }} />
                  <Line type="monotone" dataKey="hv" name="Hist. Vol" stroke="hsl(262 83% 65%)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Put/call open interest by expiry */}
            <div className="cyber-panel p-4">
              <div className="text-[10px] font-mono text-muted-foreground mb-3 tracking-wider">CALL vs PUT OPEN INTEREST BY EXPIRY</div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={OPTIONS_CHAIN}
                  margin={{ top: 4, right: 8, bottom: 4, left: 4 }}
                >
                  <CartesianGrid strokeDasharray="2 4" />
                  <XAxis dataKey="expiry" tick={{ fontSize: 8 }} angle={-20} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CUSTOM_TOOLTIP />} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="callOI" name="Call OI" fill="hsl(142 70% 45% / 0.8)" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="putOI"  name="Put OI"  fill="hsl(0 72% 55% / 0.8)"   radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Options-implied price distribution */}
            <div className="cyber-panel p-4 col-span-2">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] font-mono text-muted-foreground tracking-wider">
                  OPTIONS-IMPLIED PRICE DISTRIBUTION — 30-DAY (IV: {OPTIONS_DATA.iv30Day}%)
                </div>
                <div className="text-[10px] font-mono text-green-400">
                  P(upside) = {pctUpside}% · Expected ±{OPTIONS_DATA.expectedMove30}%
                </div>
              </div>
              <ResponsiveContainer width="100%" height={130}>
                <AreaChart data={optionsDist} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                  <CartesianGrid strokeDasharray="2 4" />
                  <XAxis dataKey="price" tick={{ fontSize: 9 }} tickFormatter={(v) => `$${v}`} />
                  <YAxis hide />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="nexus-tooltip">
                          <div className="font-mono text-[10px]">${label}: {(payload[0].value as number * 100).toFixed(2)}%</div>
                        </div>
                      );
                    }}
                  />
                  <defs>
                    <linearGradient id="upGrad"   x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(142 70% 45%)" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="hsl(142 70% 45%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="downGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(0 72% 55%)" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="hsl(0 72% 55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    dataKey="prob"
                    stroke="hsl(196 100% 50%)"
                    fill={`url(#${optionsDist[0]?.isUpside ? "upGrad" : "downGrad"})`}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <ReferenceLine x={OPTIONS_DATA.currentPrice.toFixed(0)} stroke="hsl(196 100% 50%)" strokeDasharray="4 4"
                    label={{ value: "Spot", fontSize: 9, fill: "hsl(196 100% 50%)" }} />
                  <ReferenceLine x={OPTIONS_DATA.gammaFlipLevel.toFixed(0)} stroke="hsl(40 90% 55%)" strokeDasharray="3 3"
                    label={{ value: "γ Flip", fontSize: 9, fill: "hsl(40 90% 55%)" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Put/call ratio skew table */}
            <div className="cyber-panel overflow-hidden col-span-2">
              <div className="text-[10px] font-mono text-muted-foreground tracking-wider p-4 pb-2">OPTIONS CHAIN SUMMARY</div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border">
                    {["Expiry", "Call OI", "Put OI", "P/C Ratio", "IV (%)", "Dom. Strike", "Signal"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-mono text-muted-foreground font-normal text-[9px] tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {OPTIONS_CHAIN.map((row) => (
                    <tr key={row.expiry} className="border-b border-border/30 hover:bg-white/2 transition-colors">
                      <td className="px-3 py-2 font-mono text-foreground">{row.expiry}</td>
                      <td className="px-3 py-2 font-mono text-green-400">{row.callOI.toLocaleString()}</td>
                      <td className="px-3 py-2 font-mono text-red-400">{row.putOI.toLocaleString()}</td>
                      <td className={`px-3 py-2 font-mono ${row.pcr < 0.7 ? "text-green-400" : row.pcr < 0.85 ? "text-yellow-400" : "text-red-400"}`}>
                        {row.pcr.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{row.iv.toFixed(1)}%</td>
                      <td className="px-3 py-2 font-mono text-primary">${row.dominantStrike}</td>
                      <td className={`px-3 py-2 font-mono text-[10px] ${row.pcr < 0.7 ? "text-green-400" : "text-yellow-400"}`}>
                        {row.pcr < 0.7 ? "bullish" : row.pcr < 0.85 ? "neutral" : "bearish"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── FUTURES TAB ── */}
        {activeTab === "futures" && (
          <div className="space-y-4">
            {/* Curve selector */}
            <div className="flex items-center gap-2">
              {(Object.entries(FUTURES_CURVES) as any[]).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCurve(key as any)}
                  className={`px-3 py-1.5 text-[10px] font-mono rounded border transition-all ${
                    selectedCurve === key
                      ? "bg-primary/20 text-primary border-primary/40"
                      : "bg-muted/20 text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {val.label.split("(")[0].trim().split(" – ")[0]}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Selected forward curve */}
              <div className="cyber-panel p-4 col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10px] font-mono text-muted-foreground tracking-wider">{curve.label} — FORWARD CURVE</div>
                  <div className="flex items-center gap-4 text-[10px] font-mono">
                    <div className="text-muted-foreground">Spot: <span className="text-primary">{curve.unit === "$/ton" ? "$" : "$"}{curve.spot.toLocaleString()}</span></div>
                    <div className={`${curve.symImpact >= 0 ? "text-green-400" : "text-red-400"}`}>
                      SYM Impact: {curve.symImpact >= 0 ? "+" : ""}{curve.symImpact}% per 10% move
                    </div>
                    <div className="text-muted-foreground">
                      COGS Exposure: <span className={Math.abs(curve.cogsBps) > 30 ? "text-red-400" : "text-yellow-400"}>{Math.abs(curve.cogsBps)} bps</span>
                    </div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={190}>
                  <ComposedChart data={curve.curve} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                    <CartesianGrid strokeDasharray="2 4" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="price" tick={{ fontSize: 10 }} orientation="left"
                      tickFormatter={(v) => `${curve.unit === "$/ton" && v > 100 ? `$${(v/1000).toFixed(1)}k` : `$${v}`}`}
                      domain={["auto", "auto"]}
                    />
                    <YAxis yAxisId="change" tick={{ fontSize: 10 }} orientation="right" unit="%" domain={["auto", "auto"]} />
                    <Tooltip content={<CUSTOM_TOOLTIP />} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                    <Bar yAxisId="change" dataKey="change" name="% vs Spot" radius={[2, 2, 0, 0]} opacity={0.6}>
                      {curve.curve.map((d, i) => (
                        <Cell key={i} fill={d.change >= 0 ? "hsl(142 70% 45%)" : "hsl(0 72% 55%)"} />
                      ))}
                    </Bar>
                    <Line yAxisId="price" type="monotone" dataKey="price" name={`Price (${curve.unit})`}
                      stroke="hsl(196 100% 50%)" strokeWidth={2} dot={{ fill: "hsl(196 100% 50%)", r: 3 }} />
                    <ReferenceLine yAxisId="change" y={0} stroke="hsl(218 15% 40%)" strokeDasharray="3 3" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* All curves summary */}
              <div className="cyber-panel overflow-hidden col-span-2">
                <div className="text-[10px] font-mono text-muted-foreground tracking-wider p-4 pb-2">ALL INPUT FUTURES — FORWARD CURVE SUMMARY (Sep '26 vs Spot)</div>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-border">
                      {["Input", "Spot", "Sep '26 Fwd", "% Change", "COGS Exposure", "SYM Impact", "Signal"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-mono text-muted-foreground font-normal text-[9px] tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(Object.entries(FUTURES_CURVES) as [string, typeof FUTURES_CURVES.copper][]).map(([, c]) => {
                      const sep = c.curve.find((r) => r.month === "Sep'26")!;
                      return (
                        <tr key={c.label} className="border-b border-border/30 hover:bg-white/2">
                          <td className="px-3 py-2 text-foreground font-semibold text-[10px]">{c.label.split("(")[0].trim()}</td>
                          <td className="px-3 py-2 font-mono text-foreground">${c.spot.toLocaleString()}</td>
                          <td className="px-3 py-2 font-mono text-foreground">${sep.price.toLocaleString()}</td>
                          <td className={`px-3 py-2 font-mono ${sep.change >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {sep.change >= 0 ? "+" : ""}{sep.change.toFixed(1)}%
                          </td>
                          <td className={`px-3 py-2 font-mono ${Math.abs(c.cogsBps) > 30 ? "text-red-400" : "text-yellow-400"}`}>
                            {Math.abs(c.cogsBps)} bps
                          </td>
                          <td className={`px-3 py-2 font-mono ${c.symImpact >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {c.symImpact >= 0 ? "+" : ""}{c.symImpact}%
                          </td>
                          <td className={`px-3 py-2 font-mono text-[10px] ${sep.change < -5 ? "text-green-400" : sep.change > 5 ? "text-red-400" : "text-yellow-400"}`}>
                            {c.cogsBps > 0 ? (sep.change < -5 ? "bullish" : sep.change > 5 ? "bearish" : "neutral") : (sep.change > 5 ? "bullish" : "neutral")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── VALUATION TAB ── */}
        {activeTab === "valuation" && (
          <div className="grid grid-cols-2 gap-4">
            {/* Methodology */}
            <div className="cyber-panel p-4 col-span-2">
              <div className="text-[10px] font-mono text-muted-foreground tracking-wider mb-3">DERIVATIVES VALUATION METHODOLOGY</div>
              <div className="grid grid-cols-2 gap-6 text-[11px] text-muted-foreground">
                <div>
                  <div className="text-xs font-semibold text-primary mb-2">Options-Implied Target: ${optionsImplied.toFixed(2)}</div>
                  <p className="leading-relaxed">
                    Derives fair value from the log-normal put/call skew in open interest.
                    Current OI P/C Ratio ({OPTIONS_DATA.openInterestPCR}) implies a{" "}
                    <strong className="text-green-400">{pctUpside}% probability</strong> of upside vs. spot.
                    Gamma flip at <strong className="text-yellow-400">${OPTIONS_DATA.gammaFlipLevel}</strong> creates a
                    dealer-positioning headwind. Bullish skew adjustment: <strong className="text-primary">+{((1-OPTIONS_DATA.openInterestPCR)*5).toFixed(1)}%</strong>.
                  </p>
                </div>
                <div>
                  <div className="text-xs font-semibold text-secondary mb-2">Futures-Adjusted Target: ${futuresAdjusted.toFixed(2)}</div>
                  <p className="leading-relaxed">
                    Sep '26 forward curves imply COGS inflation/deflation.
                    Rare earths +{FUTURES_CURVES.rareEarths.curve[3].change.toFixed(1)}% and semis +{FUTURES_CURVES.semis.curve[3].change.toFixed(1)}%
                    are the largest factors. Net COGS impact on gross margin is estimated at{" "}
                    <strong className={futuresAdjusted > ensemble ? "text-green-400" : "text-red-400"}>
                      {futuresAdjusted > ensemble ? "+" : ""}{((futuresAdjusted / ensemble - 1) * 100).toFixed(1)}%
                    </strong>.
                  </p>
                </div>
              </div>
              <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
                <div className="text-xs font-semibold text-foreground">Derivatives Ensemble (50/50 blend)</div>
                <div className="price-target" style={{ fontSize: "1.6rem" }}>${pageTarget.toFixed(2)}</div>
              </div>
            </div>

            {/* Tornado */}
            <div className="cyber-panel p-4 col-span-2">
              <div className="text-[10px] font-mono text-muted-foreground mb-3 tracking-wider">
                TORNADO CHART — FUTURES/OPTIONS SHOCK IMPACT ON PRICE TARGET ($)
              </div>
              <div className="space-y-2">
                {tornadoData.map((d) => {
                  const maxPx = Math.max(...tornadoData.map((x) => Math.max(Math.abs(x.bull), Math.abs(x.bear))));
                  return (
                    <div key={d.label} className="flex items-center gap-2 text-[10px]">
                      <div className="w-32 text-right font-mono text-muted-foreground text-[9px] truncate">{d.label}</div>
                      <div className="flex-1 flex items-center gap-0.5 h-5">
                        <div
                          className="h-full rounded-l transition-all"
                          style={{
                            width: `${(Math.abs(d.bear) / maxPx) * 45}%`,
                            background: "hsl(0 72% 50% / 0.75)",
                          }}
                        />
                        <div className="w-px h-full bg-border/50" />
                        <div
                          className="h-full rounded-r transition-all"
                          style={{
                            width: `${(Math.abs(d.bull) / maxPx) * 45}%`,
                            background: "hsl(142 70% 45% / 0.75)",
                          }}
                        />
                      </div>
                      <div className="w-24 text-left font-mono text-[9px] flex gap-1">
                        {d.bear < 0 && <span className="text-red-400">-${Math.abs(d.bear).toFixed(2)}</span>}
                        {d.bull > 0 && <span className="text-green-400">+${d.bull.toFixed(2)}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sensitivity table */}
            <div className="cyber-panel p-4 col-span-2">
              <div className="text-[10px] font-mono text-muted-foreground mb-3 tracking-wider">
                SENSITIVITY TABLE — COPPER PRICE SHOCK × PUT/CALL RATIO
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px] font-mono">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-2 py-2 text-left text-muted-foreground">Copper Shock</th>
                      {[0.5, 0.65, 0.8, 1.0, 1.2].map((pcr) => (
                        <th key={pcr} className="px-2 py-2 text-center text-muted-foreground">P/C = {pcr}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[-20, -10, 0, 10, 20].map((shock) => {
                      return (
                        <tr key={shock} className={`border-b border-border/30 ${shock === 0 ? "bg-primary/5" : ""}`}>
                          <td className={`px-2 py-2 font-bold ${shock < 0 ? "text-green-400" : shock > 0 ? "text-red-400" : "text-primary"}`}>
                            {shock > 0 ? "+" : ""}{shock}%
                          </td>
                          {[0.5, 0.65, 0.8, 1.0, 1.2].map((pcr) => {
                            const copperAdj = (shock / 100) * FUTURES_CURVES.copper.symImpact;
                            const pcrAdj = (1 - pcr) * 0.05;
                            const target = ensemble * (1 + copperAdj / 10 + pcrAdj);
                            const diff = target - ensemble;
                            return (
                              <td
                                key={pcr}
                                className={`px-2 py-2 text-center ${diff > 1 ? "text-green-400" : diff < -1 ? "text-red-400" : "text-muted-foreground"}`}
                              >
                                ${target.toFixed(1)}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
