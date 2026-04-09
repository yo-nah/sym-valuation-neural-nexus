import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNexusStore } from "@/lib/store";
import { AssumptionCard } from "@/components/AssumptionCard";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, CartesianGrid,
} from "recharts";
import { Download, ToggleLeft, ToggleRight, Activity } from "lucide-react";
import type { Assumption } from "@/lib/store";

// Base weights for each page (must sum to 1.0)
const PAGE_CONFIG: Record<string, { weight: number; label: string; color: string }> = {
  firm:        { weight: 0.30, label: "Firm / DCF",        color: "hsl(262 83% 65%)" },
  ecosystem:   { weight: 0.22, label: "Ecosystem / Comps", color: "hsl(142 70% 45%)" },
  historical:  { weight: 0.05, label: "Historical",        color: "hsl(40 90% 55%)"  },
  consumer:    { weight: 0.08, label: "Consumer",          color: "hsl(196 80% 60%)" },
  global:      { weight: 0.12, label: "Global Macro",      color: "hsl(196 100% 50%)" },
  academia:    { weight: 0.05, label: "Academia",          color: "hsl(40 70% 60%)"  },
  government:  { weight: 0.08, label: "Government",        color: "hsl(0 72% 55%)"   },
  derivatives: { weight: 0.10, label: "Derivatives",       color: "hsl(196 60% 65%)" },
};

// Page-specific price targets relative to base valuation
const PAGE_MULTIPLIERS: Record<string, number> = {
  firm:       1.00,
  ecosystem:  1.08,
  historical: 0.95,
  consumer:   0.92,
  global:     0.95,
  academia:   1.03,
  government:  0.97,
  derivatives: 1.02,  // slight bull from call/put skew
};

const SCENARIOS = [
  { name: "Base Case",     multiplier: 1.00, color: "hsl(196 100% 50%)" },
  { name: "Bull Case",     multiplier: 1.35, color: "hsl(142 70% 45%)" },
  { name: "Bear Case",     multiplier: 0.65, color: "hsl(0 72% 55%)"  },
  { name: "Walmart Exits", multiplier: 0.45, color: "hsl(0 85% 40%)"  },
  { name: "GreenBox 2x",   multiplier: 1.52, color: "hsl(142 80% 50%)" },
  { name: "Tariff War",    multiplier: 0.78, color: "hsl(40 80% 50%)"  },
  { name: "Hormuz -3mo",   multiplier: 0.72, color: "hsl(0 60% 48%)"  },
  { name: "Gamma Squeeze",  multiplier: 1.16, color: "hsl(196 60% 65%)" },
];

export function ExecutiveSummary() {
  // ── FIX #4: derive ensemble directly from active toggles ──────────────────
  const { valuation, pageToggles, setPageToggle } = useNexusStore();
  const baseEnsemble = valuation?.ensemble ?? 56.83;

  const { ensemble, waterfallData, activeWeightSum } = useMemo(() => {
    const activePages = Object.entries(PAGE_CONFIG).filter(([k]) => pageToggles[k as keyof typeof pageToggles]);
    const activeWeightSum = activePages.reduce((s, [, v]) => s + v.weight, 0);

    // Recalculate ensemble: weighted average of page-specific targets, renormalized
    let weightedSum = 0;
    const wData = Object.entries(PAGE_CONFIG).map(([k, v]) => {
      const isActive = pageToggles[k as keyof typeof pageToggles];
      const pageTarget = baseEnsemble * PAGE_MULTIPLIERS[k];
      const normalizedWeight = isActive ? v.weight / activeWeightSum : 0;
      const contribution = normalizedWeight * pageTarget;
      if (isActive) weightedSum += contribution;
      return { name: v.label, value: contribution, active: isActive, color: v.color, weight: v.weight };
    });

    return { ensemble: weightedSum || baseEnsemble, waterfallData: wData, activeWeightSum };
  }, [baseEnsemble, pageToggles]);

  const bull = ensemble * 1.35;
  const bear = ensemble * 0.65;

  const { data: assumptions = [] } = useQuery<Assumption[]>({
    queryKey: ["/api/assumptions"],
  });

  // Distribution curve
  const distData = Array.from({ length: 22 }, (_, i) => {
    const x = ensemble * 0.35 + (i / 21) * ensemble * 1.5;
    const mu = ensemble;
    const sigma = ensemble * 0.24;
    const y = Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));
    return { price: x.toFixed(0), prob: y };
  });

  const topAssumptions = assumptions
    .filter((a: Assumption) => Math.abs(a.bullImpact) > 5)
    .sort((a: Assumption, b: Assumption) => Math.abs(b.bullImpact) - Math.abs(a.bullImpact))
    .slice(0, 6);

  const currentPrice = 56.83;
  const upsideToBull = ((bull / currentPrice - 1) * 100).toFixed(1);
  const downsideToBear = ((bear / currentPrice - 1) * 100).toFixed(1);

  return (
    <div className="h-full overflow-y-auto page-enter">
      <div className="p-6 space-y-6">
        {/* Hero — FIX: this now uses the recalculated ensemble */}
        <div className="cyber-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-muted-foreground tracking-widest mb-2">
                ENSEMBLE PRICE TARGET — {Object.values(pageToggles).filter(Boolean).length}/8 PAGES ACTIVE
              </div>
              <div className="price-target">${ensemble.toFixed(2)}</div>
              <div className="flex items-center gap-4 mt-2">
                <div className="text-sm font-mono text-green-400">Bull: ${bull.toFixed(2)}</div>
                <div className="text-muted-foreground text-xs">|</div>
                <div className="text-sm font-mono text-foreground">Base: ${ensemble.toFixed(2)}</div>
                <div className="text-muted-foreground text-xs">|</div>
                <div className="text-sm font-mono text-red-400">Bear: ${bear.toFixed(2)}</div>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                Current: ${currentPrice} · Upside to Bull: {parseFloat(upsideToBull) > 0 ? "+" : ""}{upsideToBull}% · Downside to Bear: {downsideToBear}%
              </div>
              {Object.values(pageToggles).filter(Boolean).length < 8 && (
                <div className="text-[10px] font-mono text-yellow-400 mt-1">
                  ⚠ {8 - Object.values(pageToggles).filter(Boolean).length} page(s) disabled — weights renormalized to {(activeWeightSum * 100).toFixed(0)}%
                </div>
              )}
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-primary/15 border border-primary/40 rounded-lg text-primary text-xs font-mono hover:bg-primary/25 transition-all"
            >
              <Download size={12} />
              EXPORT THESIS
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Page toggles — FIX: each toggle instantly updates ensemble above */}
          <div className="col-span-1 cyber-panel p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Activity size={12} className="text-primary" />
              <span className="text-[10px] font-mono text-muted-foreground tracking-wider">PAGE TOGGLES</span>
            </div>
            {Object.entries(PAGE_CONFIG).map(([k, v]) => {
              const active = pageToggles[k as keyof typeof pageToggles];
              const Toggle = active ? ToggleRight : ToggleLeft;
              const pageTarget = baseEnsemble * PAGE_MULTIPLIERS[k];
              return (
                <div key={k} className="flex items-center gap-2">
                  <button
                    onClick={() => setPageToggle(k as any, !active)}
                    className="flex items-center gap-2 w-full group"
                    data-testid={`toggle-${k}`}
                  >
                    <Toggle size={18} style={{ color: active ? v.color : "hsl(218 15% 40%)" }} />
                    <div className="flex-1 text-left">
                      <span className={`text-[11px] ${active ? "text-foreground" : "text-muted-foreground/40"}`}>{v.label}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] font-mono text-muted-foreground">{(v.weight * 100).toFixed(0)}%</div>
                      <div className={`text-[10px] font-mono ${active ? "text-foreground" : "text-muted-foreground/30"}`}>
                        ${pageTarget.toFixed(0)}
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
            <div className="pt-2 border-t border-border">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-muted-foreground">Ensemble:</span>
                <span className="text-primary font-bold">${ensemble.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Waterfall chart */}
          <div className="col-span-2 cyber-panel p-4">
            <div className="text-[10px] font-mono text-muted-foreground mb-3 tracking-wider">PRICE TARGET CONTRIBUTION BY PAGE (RENORMALIZED)</div>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={waterfallData} margin={{ top: 4, right: 8, bottom: 24, left: 4 }}>
                <CartesianGrid strokeDasharray="2 4" />
                <XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-25} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v.toFixed(0)}`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="nexus-tooltip">
                        <div className="font-mono text-[11px]">{d.active ? `$${payload[0].value.toFixed(2)}` : "DISABLED"}</div>
                        <div className="text-[10px] text-muted-foreground">Base weight: {(d.weight * 100).toFixed(0)}%</div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {waterfallData.map((d, i) => (
                    <Cell key={i} fill={d.active ? d.color : "hsl(220 20% 20%)"} opacity={d.active ? 0.85 : 0.25} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution + Scenarios */}
        <div className="grid grid-cols-2 gap-4">
          <div className="cyber-panel p-4">
            <div className="text-[10px] font-mono text-muted-foreground mb-3 tracking-wider">PROBABILITY DISTRIBUTION (σ = 24% of ensemble)</div>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={distData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="2 4" />
                <XAxis dataKey="price" tick={{ fontSize: 9 }} tickFormatter={(v) => `$${v}`} />
                <YAxis hide />
                <defs>
                  <linearGradient id="distGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(196 100% 50%)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(196 100% 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area dataKey="prob" stroke="hsl(196 100% 50%)" fill="url(#distGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="cyber-panel p-4">
            <div className="text-[10px] font-mono text-muted-foreground mb-3 tracking-wider">SCENARIO EXPLORER (vs ENSEMBLE ${ensemble.toFixed(0)})</div>
            <div className="space-y-2">
              {SCENARIOS.map((s) => {
                const t = ensemble * s.multiplier;
                return (
                  <div key={s.name} className="flex items-center gap-3">
                    <div className="w-22 text-[10px] text-muted-foreground font-mono w-24 flex-shrink-0">{s.name}</div>
                    <div className="flex-1 h-5 bg-muted/30 rounded-sm overflow-hidden">
                      <div
                        className="h-full rounded-sm flex items-center justify-end pr-2 transition-all"
                        style={{ width: `${Math.min((t / (ensemble * 1.7)) * 100, 100)}%`, background: s.color, opacity: 0.85 }}
                      >
                        <span className="text-[9px] font-mono text-white font-bold">${t.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Traceback */}
        <div>
          <h2 className="text-[10px] font-mono text-muted-foreground tracking-widest mb-3">HIGHEST-IMPACT ASSUMPTIONS (TRACEBACK)</h2>
          <div className="grid grid-cols-3 gap-3">
            {topAssumptions.map((a: Assumption) => (
              <AssumptionCard key={a.id} assumption={a} compact />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
