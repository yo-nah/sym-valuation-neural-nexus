import { useState, useRef } from "react";
import { useNexusStore, HeatmapMode } from "@/lib/store";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Search, Flame, TrendingDown, BarChart2, EyeOff, Zap, GitBranch } from "lucide-react";

const HEATMAP_OPTIONS: { mode: HeatmapMode; icon: any; label: string; color: string }[] = [
  { mode: "bull", icon: TrendingDown, label: "BULL", color: "text-green-400" },
  { mode: "bear", icon: TrendingDown, label: "BEAR", color: "text-red-400" },
  { mode: "net", icon: BarChart2, label: "NET", color: "text-primary" },
  { mode: "off", icon: EyeOff, label: "OFF", color: "text-muted-foreground" },
];

export function TopBar() {
  const { heatmapMode, setHeatmapMode, nexusOpen, setNexusOpen, valuation, addPulse } = useNexusStore();
  const [query, setQuery] = useState("");
  const [queryResult, setQueryResult] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const queryMutation = useMutation({
    mutationFn: async (q: string) => {
      const res = await apiRequest("POST", "/api/query", { query: q });
      return res.json();
    },
    onSuccess: (data) => {
      setQueryResult(data.message);
      setIsQuerying(false);
      // Trigger pulse on all nodes
      ["assumptions", "firm", "ecosystem", "global"].forEach((id) => addPulse(id));
      qc.invalidateQueries({ queryKey: ["/api/assumptions"] });
      qc.invalidateQueries({ queryKey: ["/api/valuation"] });
    },
    onError: () => setIsQuerying(false),
  });

  const handleQuery = () => {
    if (!query.trim()) return;
    setIsQuerying(true);
    setQueryResult("");
    queryMutation.mutate(query);
  };

  return (
    <div
      className="fixed top-0 right-0 z-50 flex items-center gap-3 px-4 py-2"
      style={{
        left: nexusOpen ? 420 : 0,
        height: 52,
        background: "hsl(220 20% 4% / 0.95)",
        borderBottom: "1px solid hsl(196 100% 50% / 0.15)",
        backdropFilter: "blur(12px)",
        transition: "left 0.3s ease",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2">
        <NexusLogo />
        <div>
          <div className="text-[11px] font-mono font-bold text-primary tracking-widest">SYM NEXUS</div>
          <div className="text-[9px] text-muted-foreground font-mono tracking-wider">VALUATION NEURAL NEXUS</div>
        </div>
      </div>

      {/* NL Query Bar */}
      <div className="flex-1 max-w-xl relative">
        <div className="flex items-center gap-2 bg-card border border-primary/20 rounded-lg px-3 py-1.5 focus-within:border-primary/50 transition-colors">
          <Search size={12} className="text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleQuery()}
            placeholder='Ask anything... "What if China tariffs rise 15% and WACC drops 1%?"'
            className="flex-1 bg-transparent text-xs font-mono text-foreground placeholder:text-muted-foreground/50 outline-none"
            data-testid="nl-query-input"
          />
          <button
            onClick={handleQuery}
            disabled={isQuerying || !query.trim()}
            className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-40 transition-colors"
          >
            <Zap size={10} />
            {isQuerying ? "..." : "RUN"}
          </button>
        </div>
        {queryResult && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-primary/30 rounded-lg px-3 py-2 text-[11px] font-mono text-primary z-50">
            <Zap size={10} className="inline mr-1" />
            {queryResult}
          </div>
        )}
      </div>

      {/* Heatmap mode selector */}
      <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
        <Flame size={10} className="text-muted-foreground mx-1" />
        {HEATMAP_OPTIONS.map(({ mode, label, color }) => (
          <button
            key={mode}
            onClick={() => setHeatmapMode(mode)}
            data-testid={`heatmap-mode-${mode}`}
            className={`text-[10px] font-mono px-2 py-0.5 rounded transition-all ${
              heatmapMode === mode
                ? `bg-primary/20 ${color} font-bold`
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Price target */}
      {valuation && (
        <div className="flex items-center gap-2 bg-card border border-primary/20 rounded-lg px-3 py-1.5">
          <div className="text-[9px] font-mono text-muted-foreground">TARGET</div>
          <div className="font-mono font-bold text-primary" style={{ fontSize: "13px" }}>
            ${valuation.ensemble.toFixed(2)}
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="text-[10px] font-mono text-green-400">${valuation.bull.toFixed(0)}</div>
          <div className="text-[9px] text-muted-foreground">/</div>
          <div className="text-[10px] font-mono text-red-400">${valuation.bear.toFixed(0)}</div>
        </div>
      )}

      {/* Nexus toggle */}
      <button
        onClick={() => setNexusOpen(!nexusOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all ${
          nexusOpen ? "bg-primary/20 text-primary border border-primary/40" : "bg-card border border-border text-muted-foreground hover:text-foreground"
        }`}
        data-testid="nexus-toggle"
      >
        <GitBranch size={10} />
        NEXUS
      </button>
    </div>
  );
}

function NexusLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="SYM Nexus Logo">
      <circle cx="14" cy="14" r="13" stroke="hsl(196 100% 50%)" strokeWidth="1" opacity="0.4" />
      <circle cx="14" cy="14" r="4" fill="hsl(196 100% 50%)" opacity="0.9" />
      <circle cx="14" cy="14" r="8" stroke="hsl(262 83% 65%)" strokeWidth="0.5" strokeDasharray="2 3" />
      <line x1="14" y1="1" x2="14" y2="6" stroke="hsl(196 100% 50%)" strokeWidth="1.5" />
      <line x1="14" y1="22" x2="14" y2="27" stroke="hsl(196 100% 50%)" strokeWidth="1.5" />
      <line x1="1" y1="14" x2="6" y2="14" stroke="hsl(196 100% 50%)" strokeWidth="1.5" />
      <line x1="22" y1="14" x2="27" y2="14" stroke="hsl(196 100% 50%)" strokeWidth="1.5" />
      <circle cx="6.5" cy="6.5" r="1.5" fill="hsl(262 83% 65%)" opacity="0.8" />
      <circle cx="21.5" cy="6.5" r="1.5" fill="hsl(262 83% 65%)" opacity="0.8" />
      <circle cx="6.5" cy="21.5" r="1.5" fill="hsl(262 83% 65%)" opacity="0.8" />
      <circle cx="21.5" cy="21.5" r="1.5" fill="hsl(262 83% 65%)" opacity="0.8" />
    </svg>
  );
}
