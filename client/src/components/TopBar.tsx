import { useNexusStore, HeatmapMode } from "@/lib/store";
import { Flame, TrendingDown, BarChart2, EyeOff, GitBranch } from "lucide-react";

const HEATMAP_OPTIONS: { mode: HeatmapMode; label: string; color: string; title: string }[] = [
  { mode: "bull", label: "BULL", color: "text-green-400",      title: "Bull mode: color-codes every assumption by how much it can lift the price target (green = biggest upside driver)" },
  { mode: "bear", label: "BEAR", color: "text-red-400",        title: "Bear mode: color-codes every assumption by how much downside risk it carries (red = biggest risk to watch)" },
  { mode: "net",  label: "NET",  color: "text-primary",        title: "Net mode: color-codes by overall price-sensitivity magnitude regardless of direction (green/red = highest-leverage lever)" },
  { mode: "off",  label: "OFF",  color: "text-muted-foreground", title: "Off: removes all color coding from assumption cards" },
];

export function TopBar() {
  const { heatmapMode, setHeatmapMode, nexusOpen, setNexusOpen, valuation } = useNexusStore();

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

      {/* Spacer */}
      <div className="flex-1" />

      {/* Heatmap mode selector */}
      <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
        <Flame size={10} className="text-muted-foreground mx-1" />
        {HEATMAP_OPTIONS.map(({ mode, label, color, title }) => (
          <button
            key={mode}
            onClick={() => setHeatmapMode(mode)}
            data-testid={`heatmap-mode-${mode}`}
            title={title}
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
