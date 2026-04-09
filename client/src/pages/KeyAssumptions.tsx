import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useNexusStore } from "@/lib/store";
import { AssumptionCard } from "@/components/AssumptionCard";
import { RotateCcw, SlidersHorizontal, Info } from "lucide-react";
import type { Assumption } from "@/lib/store";

// ── Revenue growth year config (matches Firm.tsx) ─────────────────────────────
const REV_YEARS = [
  { key: "revenueGrowthY1", id: "rev-growth-y1", year: "Y1", fy: "FY2026", default: 35 },
  { key: "revenueGrowthY2", id: "rev-growth-y2", year: "Y2", fy: "FY2027", default: 28 },
  { key: "revenueGrowthY3", id: "rev-growth-y3", year: "Y3", fy: "FY2028", default: 22 },
  { key: "revenueGrowthY4", id: "rev-growth-y4", year: "Y4", fy: "FY2029", default: 18 },
  { key: "revenueGrowthY5", id: "rev-growth-y5", year: "Y5", fy: "FY2030", default: 14 },
];
const REV_KEYS = new Set(REV_YEARS.map((r) => r.key));

// ── Inline revenue growth table (same logic as Firm.tsx) ─────────────────────
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
      await Promise.all(
        REV_YEARS.map(async (ry) => {
          const a = assumptions.find((x) => x.key === ry.key);
          if (a) {
            const res = await apiRequest("PATCH", `/api/assumptions/${a.id}`, { value: a.defaultValue });
            return res.json();
          }
        })
      );
    },
    onSuccess: () => {
      setLocalValues({});
      qc.invalidateQueries({ queryKey: ["/api/valuation"] });
      qc.invalidateQueries({ queryKey: ["/api/assumptions"] });
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
    <div className="col-span-2 border border-border rounded-lg overflow-hidden bg-card/50">
      {/* Sub-header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div>
          <div className="text-[10px] font-mono text-primary tracking-wider">REVENUE GROWTH FORECAST (Y1–Y5)</div>
          <div className="text-[9px] text-muted-foreground mt-0.5">Base: FY2025 = $2,247M · Text input · All years feed DCF</div>
        </div>
        <button
          onClick={() => resetMutation.mutate()}
          disabled={resetMutation.isPending || !hasChanges}
          className="flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-30 transition-all"
        >
          <RotateCcw size={8} className={resetMutation.isPending ? "animate-spin" : ""} />
          Reset
        </button>
      </div>

      {/* Table */}
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/60 bg-muted/10">
            {["Year", "Fiscal", "Growth %", "Default", "Projected Rev"].map((h) => (
              <th key={h} className="px-3 py-2 text-left text-[9px] font-mono text-muted-foreground font-normal tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {REV_YEARS.map((ry, i) => {
            const a = assumptions.find((x) => x.key === ry.key);
            const isModified = a ? Math.abs(a.value - a.defaultValue) > 0.001 : false;

            // Compound revenue
            let projRev = 2247;
            for (let j = 0; j <= i; j++) {
              const ya = assumptions.find((x) => x.key === REV_YEARS[j].key);
              projRev *= 1 + (ya?.value ?? REV_YEARS[j].default) / 100;
            }

            return (
              <tr key={ry.key} className="border-b border-border/30 hover:bg-white/2 transition-colors">
                <td className="px-3 py-2">
                  <span className="text-[10px] font-mono font-bold text-primary">{ry.year}</span>
                </td>
                <td className="px-3 py-2">
                  <span className="text-[10px] font-mono text-muted-foreground">{ry.fy}</span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
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
                      className={`w-14 bg-muted/30 border rounded px-2 py-1 text-[11px] font-mono text-center focus:outline-none focus:border-primary/60 transition-colors ${
                        isModified ? "border-yellow-500/60 text-yellow-400" : "border-border text-foreground"
                      }`}
                    />
                    <span className="text-[10px] text-muted-foreground">%</span>
                    {isModified && (
                      <button
                        onClick={() => a && mutation.mutate({ id: a.id, value: a.defaultValue })}
                        className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                        title={`Reset to ${ry.default}%`}
                      >
                        <RotateCcw size={8} />
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className="text-[10px] font-mono text-muted-foreground">{ry.default}%</span>
                </td>
                <td className="px-3 py-2">
                  <span className={`text-[10px] font-mono font-semibold ${
                    (a?.value ?? ry.default) >= 20 ? "text-green-400" :
                    (a?.value ?? ry.default) >= 10 ? "text-primary" : "text-yellow-400"
                  }`}>
                    ${(projRev / 1000).toFixed(2)}B
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="px-3 py-1.5 text-[8px] text-muted-foreground/40 font-mono bg-muted/5">
        Enter to confirm · Tab to advance · Y4/Y5 feed DCF terminal value
      </div>
    </div>
  );
}

// ── Category config ───────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: "firm",       label: "FIRM",       color: "hsl(262 83% 65%)", desc: "Revenue model, DCF, cost structure" },
  { key: "ecosystem",  label: "ECOSYSTEM",  color: "hsl(142 70% 45%)", desc: "TAM, market share, peer multiples" },
  { key: "consumer",   label: "CONSUMER",   color: "hsl(40 90% 55%)",  desc: "Sentiment, labor, customer concentration" },
  { key: "global",     label: "GLOBAL",     color: "hsl(196 80% 60%)", desc: "Macro risk, tariffs, credit spreads" },
  { key: "government", label: "GOVERNMENT", color: "hsl(0 72% 55%)",   desc: "Policy risk, regulation, incentives" },
];

// ── Main page ─────────────────────────────────────────────────────────────────
export function KeyAssumptions() {
  const { setAssumptions, assumptions: storeAssumptions } = useNexusStore();
  const qc = useQueryClient();

  const { data: serverAssumptions = [], isLoading } = useQuery<Assumption[]>({
    queryKey: ["/api/assumptions"],
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  useEffect(() => {
    if (serverAssumptions.length > 0) setAssumptions(serverAssumptions);
  }, [serverAssumptions, setAssumptions]);

  const assumptions = storeAssumptions.length > 0 ? storeAssumptions : serverAssumptions;

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/assumptions/reset", {});
      return res.json();
    },
    onSuccess: (data) => {
      const reset: Assumption[] = data.assumptions;
      setAssumptions(reset);
      qc.setQueryData(["/api/assumptions"], reset);
      qc.invalidateQueries({ queryKey: ["/api/valuation"] });
    },
  });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-primary font-mono text-xs animate-pulse">LOADING ASSUMPTIONS...</div>
      </div>
    );
  }

  const hasChanges = assumptions.some((a: Assumption) => Math.abs(a.value - a.defaultValue) > 0.001);
  const totalChanged = assumptions.filter((a: Assumption) => Math.abs(a.value - a.defaultValue) > 0.001).length;

  return (
    <div className="h-full overflow-y-auto page-enter">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SlidersHorizontal size={14} className="text-primary" />
              <h1 className="text-base font-semibold text-foreground">Key Assumptions</h1>
              {hasChanges && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                  MODIFIED
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Central control room. Every change cascades instantly to all pages, the Nexus graph, and heatmaps. Data current as of Apr 1 2026.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-[10px] font-mono text-yellow-400">{totalChanged} assumptions changed</span>
            )}
            <button
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending || !hasChanges}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono rounded-lg bg-muted/30 border border-border hover:border-primary/40 text-muted-foreground hover:text-foreground disabled:opacity-40 transition-all"
              data-testid="reset-all-assumptions"
            >
              <RotateCcw size={10} className={resetMutation.isPending ? "animate-spin" : ""} />
              RESET ALL TO DEFAULTS
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <Info size={10} className="flex-shrink-0" />
          <span>
            Revenue growth uses text inputs (Y1–Y5). All other assumptions use sliders.
            Every assumption is wired into the valuation engine — changes cascade instantly.
          </span>
        </div>

        {/* Categories */}
        {CATEGORIES.map((cat) => {
          const catAssumptions = assumptions.filter((a: Assumption) => a.category === cat.key);
          if (catAssumptions.length === 0) return null;

          // For FIRM: split rev growth from other assumptions
          const revAssumptions = cat.key === "firm"
            ? catAssumptions.filter((a: Assumption) => REV_KEYS.has(a.key))
            : [];
          const sliderAssumptions = cat.key === "firm"
            ? catAssumptions.filter((a: Assumption) => !REV_KEYS.has(a.key))
            : catAssumptions;

          const changedCount = catAssumptions.filter((a: Assumption) => Math.abs(a.value - a.defaultValue) > 0.001).length;

          return (
            <div key={cat.key} className="space-y-3">
              {/* Category header */}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                <h2 className="text-[10px] font-mono tracking-widest text-muted-foreground">{cat.label}</h2>
                <div className="text-[9px] text-muted-foreground/60 font-mono">— {cat.desc}</div>
                <div className="flex-1 h-px bg-border" />
                <span className="text-[9px] font-mono text-muted-foreground">{catAssumptions.length} vars</span>
                {changedCount > 0 && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400">
                    {changedCount} modified
                  </span>
                )}
              </div>

              {/* Revenue growth table (FIRM only) */}
              {cat.key === "firm" && revAssumptions.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <RevenueGrowthTable assumptions={assumptions} />
                </div>
              )}

              {/* Slider cards for everything else */}
              {sliderAssumptions.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {sliderAssumptions.map((a: Assumption) => (
                    <AssumptionCard key={a.id} assumption={a} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
