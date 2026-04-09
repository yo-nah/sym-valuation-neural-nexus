import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useNexusStore } from "@/lib/store";
import { AssumptionCard } from "@/components/AssumptionCard";
import { RotateCcw, SlidersHorizontal, Info } from "lucide-react";
import type { Assumption } from "@/lib/store";

const CATEGORIES = [
  { key: "firm",       label: "FIRM",       color: "hsl(262 83% 65%)", desc: "Revenue model, DCF, cost structure" },
  { key: "ecosystem",  label: "ECOSYSTEM",  color: "hsl(142 70% 45%)", desc: "TAM, market share, peer multiples" },
  { key: "consumer",   label: "CONSUMER",   color: "hsl(40 90% 55%)",  desc: "Sentiment, labor, customer concentration" },
  { key: "global",     label: "GLOBAL",     color: "hsl(196 80% 60%)", desc: "Macro risk, tariffs, credit spreads" },
  { key: "government", label: "GOVERNMENT", color: "hsl(0 72% 55%)",   desc: "Policy risk, regulation, incentives" },
];

export function KeyAssumptions() {
  const { setAssumptions, assumptions: storeAssumptions } = useNexusStore();
  const qc = useQueryClient();

  // FIX #5: always fetch fresh assumptions from server (source of truth for defaults)
  const { data: serverAssumptions = [], isLoading } = useQuery<Assumption[]>({
    queryKey: ["/api/assumptions"],
    refetchOnWindowFocus: true,
    staleTime: 0,  // always treat as stale so we get the real defaults
  });

  // Sync server → store whenever server data changes
  useEffect(() => {
    if (serverAssumptions.length > 0) {
      setAssumptions(serverAssumptions);
    }
  }, [serverAssumptions, setAssumptions]);

  // Use store assumptions (kept in sync), fall back to server
  const assumptions = storeAssumptions.length > 0 ? storeAssumptions : serverAssumptions;

  const resetMutation = useMutation({
    mutationFn: async () => {
      // FIX #5: POST to reset endpoint — server resets all values to defaultValue column
      const res = await apiRequest("POST", "/api/assumptions/reset", {});
      return res.json();
    },
    onSuccess: (data) => {
      // FIX #5: server returns the canonical default values — sync them to store
      const resetAssumptions: Assumption[] = data.assumptions;
      setAssumptions(resetAssumptions);
      qc.setQueryData(["/api/assumptions"], resetAssumptions);
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

  // Check if any assumption differs from its own defaultValue
  const hasChanges = assumptions.some((a: Assumption) => Math.abs(a.value - a.defaultValue) > 0.001);

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
              <span className="text-[10px] font-mono text-yellow-400">
                {assumptions.filter((a: Assumption) => Math.abs(a.value - a.defaultValue) > 0.001).length} assumptions changed
              </span>
            )}
            <button
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending || !hasChanges}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono rounded-lg bg-muted/30 border border-border hover:border-primary/40 text-muted-foreground hover:text-foreground disabled:opacity-40 transition-all"
              data-testid="reset-all-assumptions"
              title="Reset all assumptions to their default values"
            >
              <RotateCcw size={10} className={resetMutation.isPending ? "animate-spin" : ""} />
              RESET ALL TO DEFAULTS
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <Info size={10} className="flex-shrink-0" />
          <span>Sliders update in real time. The "default:" label on each slider shows the exact value that "Reset All" restores. All 22 assumptions store their canonical defaults server-side.</span>
        </div>

        {/* Categories */}
        {CATEGORIES.map((cat) => {
          const catAssumptions = assumptions.filter((a: Assumption) => a.category === cat.key);
          if (catAssumptions.length === 0) return null;
          const changedCount = catAssumptions.filter((a: Assumption) => Math.abs(a.value - a.defaultValue) > 0.001).length;
          return (
            <div key={cat.key} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                <h2 className="text-[10px] font-mono tracking-widest text-muted-foreground">{cat.label}</h2>
                <div className="text-[9px] text-muted-foreground/60 font-mono">— {cat.desc}</div>
                <div className="flex-1 h-px bg-border" />
                <span className="text-[9px] font-mono text-muted-foreground">{catAssumptions.length} vars</span>
                {changedCount > 0 && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400">{changedCount} modified</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {catAssumptions.map((a: Assumption) => (
                  <AssumptionCard key={a.id} assumption={a} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
