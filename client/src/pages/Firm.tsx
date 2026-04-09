import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNexusStore, getHeatmapClass } from "@/lib/store";
import { AssumptionCard } from "@/components/AssumptionCard";
import { apiRequest } from "@/lib/queryClient";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import { RotateCcw, Info } from "lucide-react";
import type { Assumption, Valuation } from "@/lib/store";

// Revenue growth year definitions
const REV_YEARS = [
  { key: "revenueGrowthY1", id: "rev-growth-y1", year: "Y1", fy: "FY2026", default: 35 },
  { key: "revenueGrowthY2", id: "rev-growth-y2", year: "Y2", fy: "FY2027", default: 28 },
  { key: "revenueGrowthY3", id: "rev-growth-y3", year: "Y3", fy: "FY2028", default: 22 },
  { key: "revenueGrowthY4", id: "rev-growth-y4", year: "Y4", fy: "FY2029", default: 18 },
  { key: "revenueGrowthY5", id: "rev-growth-y5", year: "Y5", fy: "FY2030", default: 14 },
];

// Build income chart data — now uses valuation engine outputs for all 5 projected years
function buildIncomeData(valuation: Valuation | null) {
  const actuals = [
    { year: "FY22", rev: 593,  ebitda: -98,  grossPct: 11, projected: false },
    { year: "FY23", rev: 1177, ebitda: -137, grossPct: 13, projected: false },
    { year: "FY24", rev: 1788, ebitda: 62,   grossPct: 17, projected: false },
    { year: "FY25", rev: 2247, ebitda: 147,  grossPct: 21, projected: false },
  ];

  const eM = (valuation as any)?.effectiveEbitdaM ?? 19.25; // fallback
  const projections = valuation
    ? [
        { year: "FY26E", rev: valuation.revenues.rev1, ebitda: valuation.fcfs?.fcf1 != null ? valuation.revenues.rev1 * (eM / 100) : valuation.revenues.rev1 * 0.19, grossPct: 28, projected: true },
        { year: "FY27E", rev: valuation.revenues.rev2, ebitda: valuation.revenues.rev2 * (eM / 100), grossPct: 32, projected: true },
        { year: "FY28E", rev: valuation.revenues.rev3, ebitda: valuation.revenues.rev3 * (eM / 100), grossPct: 35, projected: true },
        { year: "FY29E", rev: valuation.revenues.rev4, ebitda: valuation.revenues.rev4 * (eM / 100), grossPct: 37, projected: true },
        { year: "FY30E", rev: valuation.revenues.rev5, ebitda: valuation.revenues.rev5 * (eM / 100), grossPct: 38, projected: true },
      ]
    : [];

  return [...actuals, ...projections];
}

const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="nexus-tooltip">
      <div className="text-[11px] font-mono font-bold text-foreground mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color ?? p.fill }} className="text-[10px] font-mono">
          {p.name}: ${typeof p.value === "number" ? (Math.abs(p.value) / 1000).toFixed(2) : p.value}B
          {p.value < 0 ? " (loss)" : ""}
        </div>
      ))}
    </div>
  );
};

// ── Revenue Growth consolidated table ────────────────────────────────────────
function RevenueGrowthTable({ assumptions }: { assumptions: Assumption[] }) {
  const qc = useQueryClient();
  const { addPulse } = useNexusStore();
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: number }) => {
      const res = await apiRequest("PATCH", `/api/assumptions/${id}`, { value });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/valuation"] });
      qc.invalidateQueries({ queryKey: ["/api/assumptions"] });
      addPulse("firm");
      addPulse("assumptions");
      addPulse("executive");
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      // Reset just revenue growth assumptions
      const resets = REV_YEARS.map(async (ry) => {
        const a = assumptions.find((x) => x.key === ry.key);
        if (a) {
          const res = await apiRequest("PATCH", `/api/assumptions/${a.id}`, { value: a.defaultValue });
          return res.json();
        }
      });
      await Promise.all(resets);
    },
    onSuccess: () => {
      setLocalValues({});
      qc.invalidateQueries({ queryKey: ["/api/valuation"] });
      qc.invalidateQueries({ queryKey: ["/api/assumptions"] });
      addPulse("firm");
    },
  });

  const handleBlur = useCallback((ry: typeof REV_YEARS[0], raw: string) => {
    const parsed = parseFloat(raw);
    if (isNaN(parsed)) return;
    const clamped = Math.max(-20, Math.min(120, parsed));
    const a = assumptions.find((x) => x.key === ry.key);
    if (a) mutation.mutate({ id: a.id, value: clamped });
  }, [assumptions, mutation]);

  const getDisplayValue = (ry: typeof REV_YEARS[0]) => {
    if (localValues[ry.key] !== undefined) return localValues[ry.key];
    const a = assumptions.find((x) => x.key === ry.key);
    return a ? String(a.value) : String(ry.default);
  };

  const hasChanges = REV_YEARS.some((ry) => {
    const a = assumptions.find((x) => x.key === ry.key);
    return a && Math.abs(a.value - a.defaultValue) > 0.001;
  });

  return (
    <div className="cyber-panel p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-mono text-primary tracking-wider">REVENUE GROWTH FORECAST (Y1–Y5)</div>
          <div className="text-[9px] text-muted-foreground mt-0.5">Base: FY2025 = $2,247M · Enter % per year · All years feed DCF</div>
        </div>
        <button
          onClick={() => resetMutation.mutate()}
          disabled={resetMutation.isPending || !hasChanges}
          className="flex items-center gap-1 text-[9px] font-mono px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-30 transition-all"
          title="Reset all revenue growth to defaults"
        >
          <RotateCcw size={9} className={resetMutation.isPending ? "animate-spin" : ""} />
          Reset
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {["Year", "Fiscal", "Growth %", "Default", "Projected Rev"].map((h) => (
                <th key={h} className="px-2 py-1.5 text-left text-[9px] font-mono text-muted-foreground font-normal tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {REV_YEARS.map((ry, i) => {
              const a = assumptions.find((x) => x.key === ry.key);
              const currentVal = a?.value ?? ry.default;
              const isModified = a ? Math.abs(a.value - a.defaultValue) > 0.001 : false;

              // Project revenue for this year
              let projRev = 2247;
              for (let j = 0; j <= i; j++) {
                const ya = assumptions.find((x) => x.key === REV_YEARS[j].key);
                const g = 1 + (ya?.value ?? REV_YEARS[j].default) / 100;
                projRev = projRev * g;
              }

              return (
                <tr key={ry.key} className="border-b border-border/30 hover:bg-white/2">
                  <td className="px-2 py-2">
                    <span className="text-[10px] font-mono font-bold text-primary">{ry.year}</span>
                  </td>
                  <td className="px-2 py-2">
                    <span className="text-[10px] font-mono text-muted-foreground">{ry.fy}</span>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={getDisplayValue(ry)}
                        onChange={(e) => setLocalValues((prev) => ({ ...prev, [ry.key]: e.target.value }))}
                        onBlur={(e) => {
                          handleBlur(ry, e.target.value);
                          setLocalValues((prev) => {
                            const n = { ...prev };
                            delete n[ry.key];
                            return n;
                          });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        }}
                        step={0.5}
                        className={`w-16 bg-muted/30 border rounded px-2 py-1 text-[11px] font-mono text-center focus:outline-none focus:border-primary/60 transition-colors ${
                          isModified ? "border-yellow-500/60 text-yellow-400" : "border-border text-foreground"
                        }`}
                        data-testid={`rev-growth-input-${ry.year}`}
                      />
                      <span className="text-[10px] text-muted-foreground">%</span>
                      {isModified && (
                        <button
                          onClick={() => {
                            if (a) mutation.mutate({ id: a.id, value: a.defaultValue });
                          }}
                          className="text-muted-foreground/50 hover:text-muted-foreground"
                          title={`Reset to ${ry.default}%`}
                        >
                          <RotateCcw size={8} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <span className="text-[10px] font-mono text-muted-foreground">{ry.default}%</span>
                  </td>
                  <td className="px-2 py-2">
                    <span className={`text-[10px] font-mono font-semibold ${currentVal >= 20 ? "text-green-400" : currentVal >= 10 ? "text-primary" : "text-yellow-400"}`}>
                      ${(projRev / 1000).toFixed(2)}B
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-[8px] text-muted-foreground/50 font-mono">
        Enter to confirm · Click ↺ to reset individual year · Tab to advance · Y4/Y5 now feed DCF terminal value
      </div>
    </div>
  );
}

export function Firm() {
  const { valuation } = useNexusStore();
  const qc = useQueryClient();

  const { data: assumptions = [] } = useQuery<Assumption[]>({
    queryKey: ["/api/assumptions"],
  });

  // Non-revenue firm assumptions (revenue growth handled separately above)
  const revKeys = new Set(REV_YEARS.map((r) => r.key));
  const otherFirmAssumptions = assumptions.filter(
    (a: Assumption) => a.category === "firm" && !revKeys.has(a.key)
  );

  const incomeData = buildIncomeData(valuation);
  const dcfTarget = valuation?.dcf ?? 0;
  const compsTarget = ((valuation?.compsRev ?? 0) + (valuation?.compsEbitda ?? 0)) / 2;

  // Tornado — all firm assumptions (include rev growth years summarized)
  const tornadoRaw = assumptions
    .filter((a: Assumption) => a.category === "firm")
    .map((a) => ({ label: a.label, bull: a.bullImpact, bear: a.bearImpact }))
    .sort((a, b) => (Math.abs(b.bull) + Math.abs(b.bear)) - (Math.abs(a.bull) + Math.abs(a.bear)));

  const maxImpact = Math.max(...tornadoRaw.map((d) => Math.max(Math.abs(d.bull), Math.abs(d.bear))), 1);

  return (
    <div className="h-full overflow-y-auto page-enter">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-foreground">Firm Analysis</h1>
            <p className="text-xs text-muted-foreground">
              5-year DCF · Comps · All assumptions wired to output · v2 engine
            </p>
          </div>
          <div className="flex gap-3">
            {[
              { label: "DCF Target", value: dcfTarget, color: "text-primary" },
              { label: "Comps Target", value: compsTarget, color: "text-secondary" },
            ].map((t) => (
              <div key={t.label} className="cyber-panel px-4 py-2 text-right">
                <div className="text-[9px] font-mono text-muted-foreground">{t.label}</div>
                <div className={`text-lg font-mono font-bold ${t.color}`}>${t.value.toFixed(2)}</div>
              </div>
            ))}
            {/* Engine diagnostics */}
            {valuation && (
              <div className="cyber-panel px-3 py-2 text-right text-[9px] font-mono space-y-0.5">
                <div className="text-muted-foreground">Eff. WACC: <span className="text-primary">{(valuation as any).effectiveWacc?.toFixed(2)}%</span></div>
                <div className="text-muted-foreground">Eff. EBITDA: <span className="text-primary">{(valuation as any).effectiveEbitdaM?.toFixed(1)}%</span></div>
                <div className="text-muted-foreground">Macro disc: <span className="text-yellow-400">{((valuation as any).macroDiscount * 100)?.toFixed(1)}%</span></div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          {/* Left: Revenue growth table + other assumptions */}
          <div className="col-span-2 space-y-4">
            {/* Consolidated revenue growth table */}
            <RevenueGrowthTable assumptions={assumptions} />

            {/* Other firm assumptions (sliders) */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono text-muted-foreground tracking-widest">OTHER FIRM ASSUMPTIONS</div>
              {otherFirmAssumptions.map((a: Assumption) => (
                <AssumptionCard key={a.id} assumption={a} />
              ))}
            </div>
          </div>

          {/* Right: Charts */}
          <div className="col-span-3 space-y-4">
            {/* Revenue & EBITDA — now 9 years (FY22–FY30E) */}
            <div className="cyber-panel p-4">
              <h3 className="text-[10px] font-mono text-muted-foreground mb-3 tracking-wider">
                REVENUE & ADJ. EBITDA ($M) — FY22–FY30E
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={incomeData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                  <CartesianGrid strokeDasharray="2 4" />
                  <XAxis dataKey="year" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${Math.abs(v) >= 1000 ? (v/1000).toFixed(0)+"B" : v}`} />
                  <Tooltip content={<CUSTOM_TOOLTIP />} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="rev" name="Revenue" fill="hsl(196 100% 50% / 0.7)" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="ebitda" name="EBITDA" fill="hsl(262 83% 65% / 0.7)" radius={[2, 2, 0, 0]} />
                  <ReferenceLine x="FY25" stroke="hsl(196 100% 50% / 0.3)" strokeDasharray="4 4"
                    label={{ value: "Actual", fontSize: 9, fill: "hsl(196 100% 50%)" }} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Gross margin expansion */}
            <div className="cyber-panel p-4">
              <h3 className="text-[10px] font-mono text-muted-foreground mb-3 tracking-wider">GROSS MARGIN EXPANSION (%)</h3>
              <ResponsiveContainer width="100%" height={130}>
                <AreaChart data={incomeData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                  <CartesianGrid strokeDasharray="2 4" />
                  <XAxis dataKey="year" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, 50]} />
                  <Tooltip content={<CUSTOM_TOOLTIP />} />
                  <defs>
                    <linearGradient id="gmGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(142 70% 45%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(142 70% 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area dataKey="grossPct" name="Gross Margin %" fill="url(#gmGrad)"
                    stroke="hsl(142 70% 45%)" strokeWidth={2} dot={{ fill: "hsl(142 70% 45%)", r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Tornado chart */}
            <div className="cyber-panel p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-mono text-muted-foreground tracking-wider">
                  TORNADO CHART — PRICE TARGET SENSITIVITY
                </h3>
                <div className="flex items-center gap-3 text-[9px] font-mono">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-2 rounded-sm bg-red-500/70" />
                    <span className="text-red-400">Bear (−%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-2 rounded-sm bg-green-500/70" />
                    <span className="text-green-400">Bull (+%)</span>
                  </div>
                </div>
              </div>

              {/* Scale header */}
              <div className="flex items-center mb-2">
                <div className="w-28" />
                <div className="flex-1 flex items-center">
                  <div className="flex-1 flex justify-between pr-0.5 text-[8px] font-mono text-muted-foreground/50">
                    <span>{(-maxImpact).toFixed(0)}%</span>
                    <span>{(-maxImpact / 2).toFixed(0)}%</span>
                  </div>
                  <div className="w-px h-3 bg-border/60" />
                  <div className="flex-1 flex justify-between pl-0.5 text-[8px] font-mono text-muted-foreground/50">
                    <span>0</span>
                    <span>+{(maxImpact / 2).toFixed(0)}%</span>
                    <span>+{maxImpact.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="w-20" />
              </div>

              <div className="space-y-1.5">
                {tornadoRaw.map((d) => {
                  const bearWidth = (Math.abs(d.bear) / maxImpact) * 45;
                  const bullWidth = (Math.abs(d.bull) / maxImpact) * 45;
                  const bearLabel = `${d.bear > 0 ? "+" : ""}${d.bear.toFixed(1)}%`;
                  const bullLabel = `${d.bull > 0 ? "+" : ""}${d.bull.toFixed(1)}%`;
                  return (
                    <div key={d.label} className="flex items-center gap-2 text-[10px]">
                      <div className="w-28 text-right font-mono text-muted-foreground truncate text-[9px]" title={d.label}>
                        {d.label}
                      </div>
                      <div className="flex-1 relative" style={{ height: 14 }}>
                        <div
                          className="absolute rounded-l transition-all"
                          style={{
                            right: "50%", top: 0, height: 14,
                            width: `${bearWidth}%`,
                            background: d.bear < 0
                              ? `hsl(0 72% ${42 + (Math.abs(d.bear) / maxImpact) * 18}% / 0.85)`
                              : "hsl(142 60% 40% / 0.7)",
                          }}
                        />
                        <div className="absolute bg-muted-foreground/30" style={{ left: "50%", top: 0, width: 1, height: 14 }} />
                        <div
                          className="absolute rounded-r transition-all"
                          style={{
                            left: "50%", top: 0, height: 14,
                            width: `${bullWidth}%`,
                            background: d.bull > 0
                              ? `hsl(142 ${55 + (d.bull / maxImpact) * 20}% ${40 + (d.bull / maxImpact) * 12}% / 0.85)`
                              : "hsl(0 72% 40% / 0.7)",
                          }}
                        />
                      </div>
                      <div className="w-20 text-left font-mono text-[9px] flex gap-0.5">
                        <span className={d.bear < 0 ? "text-red-400" : "text-green-400"}>{bearLabel}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className={d.bull > 0 ? "text-green-400" : "text-red-400"}>{bullLabel}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
