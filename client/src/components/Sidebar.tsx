import { useNexusStore, PageId } from "@/lib/store";
import { Home, SlidersHorizontal, Building2, Network, Clock, Users, Globe, BookOpen, Landmark, BarChart3, BookMarked, TrendingUp } from "lucide-react";

const NAV_ITEMS: { id: PageId; label: string; icon: any; category?: string }[] = [
  { id: "landing", label: "Overview", icon: Home },
  { id: "assumptions", label: "Key Assumptions", icon: SlidersHorizontal, category: "MODELS" },
  { id: "firm", label: "Firm", icon: Building2 },
  { id: "ecosystem", label: "Ecosystem", icon: Network },
  { id: "historical", label: "Historical", icon: Clock },
  { id: "consumer", label: "Consumer", icon: Users },
  { id: "global", label: "Global", icon: Globe },
  { id: "academia", label: "Academia", icon: BookOpen },
  { id: "government", label: "Government", icon: Landmark },
  { id: "derivatives", label: "Derivatives", icon: TrendingUp },
  { id: "executive", label: "Executive Summary", icon: BarChart3, category: "SYNTHESIS" },
  { id: "appendix", label: "Appendix", icon: BookMarked },
];

export function Sidebar() {
  const { nexusOpen, currentPage, setCurrentPage } = useNexusStore();

  if (!nexusOpen) return null;

  return (
    <div
      className="fixed top-[52px] bottom-0 z-30 flex flex-col py-3"
      style={{
        left: 420,
        width: 180,
        background: "hsl(222 22% 5.5%)",
        borderRight: "1px solid hsl(196 100% 50% / 0.12)",
      }}
    >
      {NAV_ITEMS.map((item, i) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;
        const prevItem = i > 0 ? NAV_ITEMS[i - 1] : null;
        const showCategory = item.category && (!prevItem?.category || prevItem.category !== item.category);

        return (
          <div key={item.id}>
            {showCategory && (
              <div className="px-4 py-2 text-[9px] font-mono text-muted-foreground/50 tracking-[0.2em] pt-4">
                {item.category}
              </div>
            )}
            <button
              onClick={() => setCurrentPage(item.id)}
              data-testid={`nav-${item.id}`}
              className={`w-full flex items-center gap-2.5 px-4 py-2 text-[11px] font-sans transition-all ${
                isActive
                  ? "text-primary bg-primary/8 border-l-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/4 border-l-2 border-transparent"
              }`}
            >
              <Icon size={13} className={isActive ? "text-primary" : ""} />
              {item.label}
            </button>
          </div>
        );
      })}

      {/* SYM ticker */}
      <div className="mt-auto mx-3 p-3 bg-card rounded-lg border border-primary/20">
        <div className="text-[9px] font-mono text-muted-foreground">NASDAQ: SYM</div>
        <SymTickerMini />
      </div>
    </div>
  );
}

function SymTickerMini() {
  // FIX #3: Updated to Apr 1 2026 real-time price $56.83
  return (
    <div className="mt-1">
      <div className="text-sm font-mono font-bold text-primary">$56.83</div>
      <div className="text-[10px] font-mono text-red-400">−1.84 (−3.13%)</div>
      <div className="text-[9px] text-muted-foreground">Mkt Cap: ~$19.3B</div>
      <div className="text-[8px] text-red-400/70 font-mono mt-0.5">⚠ Hormuz impact</div>
    </div>
  );
}
