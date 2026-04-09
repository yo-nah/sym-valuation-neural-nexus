import { useNexusStore } from "@/lib/store";
import { ArrowRight, Cpu, Globe, BarChart3, Zap, Shield, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const PAGE_CARDS = [
  { id: "assumptions", label: "Key Assumptions", desc: "Central control room for all model levers", icon: Zap, color: "hsl(196 100% 50%)" },
  { id: "firm", label: "Firm", desc: "Three-statement model, DCF, LBO sensitivity", icon: BarChart3, color: "hsl(262 83% 65%)" },
  { id: "ecosystem", label: "Ecosystem", desc: "Peer multiples, TAM, competitive positioning", icon: Cpu, color: "hsl(142 70% 45%)" },
  { id: "global", label: "Global", desc: "3D holographic globe with macro risk overlays", icon: Globe, color: "hsl(196 80% 60%)" },
  { id: "consumer", label: "Consumer", desc: "Sentiment, labor stats, social signal ML scores", icon: TrendingUp, color: "hsl(40 90% 55%)" },
  { id: "government", label: "Government", desc: "AI regulation, trade policy, automation incentives", icon: Shield, color: "hsl(0 72% 55%)" },
];

const METRICS = [
  { label: "Revenue FY2025", value: "$2.25B", change: "+26% YoY" },
  { label: "Backlog", value: "$22.5B", change: "Contracted" },
  { label: "Adj. EBITDA", value: "$147M", change: "+139% YoY" },
  { label: "Free Cash Flow", value: "$788M", change: "Record" },
  { label: "SYM Price (Apr 1)", value: "$56.83", change: "⚠ -17% from ATH" },
  { label: "Market Cap", value: "~$19.3B", change: "Hormuz headwind" },
];

export function Landing() {
  const { setCurrentPage } = useNexusStore();

  return (
    <div className="h-full overflow-y-auto page-enter">
      <div className="p-8 space-y-8 max-w-5xl">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2 text-[10px] font-mono text-primary tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            VALUATION NEURAL NEXUS — SYMBOTIC INC.
          </div>

          <h1 className="text-4xl font-bold leading-tight">
            <span className="animate-holographic">SYM</span>
            <span className="text-foreground"> Valuation</span>
            <br />
            <span className="text-muted-foreground text-2xl font-normal">Neural Nexus Dashboard</span>
          </h1>

          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            A living, causally-connected valuation brain for <strong className="text-foreground">Symbotic Inc. (NASDAQ: SYM)</strong> — the AI-powered warehouse robotics leader. Every assumption, every macro variable, every peer multiple is interlinked in real time through the Nexus graph. Change one lever and watch the entire valuation universe recalibrate.
          </p>
          <div className="flex items-center gap-2 text-[10px] font-mono text-red-400 bg-red-500/8 border border-red-500/25 rounded-lg px-3 py-2 w-fit">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            LIVE: 2026 Iran War / Strait of Hormuz crisis integrated — data current as of Apr 1, 2026
          </div>
        </motion.div>

        {/* Key metrics strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="grid grid-cols-3 gap-3"
        >
          {METRICS.map((m) => (
            <div key={m.label} className="cyber-panel p-4">
              <div className="text-[10px] font-mono text-muted-foreground">{m.label}</div>
              <div className="text-xl font-mono font-bold text-primary mt-1">{m.value}</div>
              <div className="text-[10px] font-mono text-muted-foreground/70">{m.change}</div>
            </div>
          ))}
        </motion.div>

        {/* Business overview */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="cyber-panel p-6 space-y-4"
        >
          <h2 className="text-sm font-semibold text-foreground tracking-wide">Business Overview</h2>
          <div className="grid grid-cols-2 gap-6 text-xs text-muted-foreground leading-relaxed">
            <div className="space-y-3">
              <p>
                <strong className="text-foreground">Symbotic Inc.</strong> is a full-stack AI robotics company that automates warehouse and distribution center operations. Its systems deploy autonomous mobile robots, vision-enabled de-palletizing cells, and AI-powered software to handle cases and eaches at scale — replacing manual labor with machine precision.
              </p>
              <p>
                The company's crown jewel partnership with <strong className="text-foreground">Walmart</strong> spans 42 regional distribution centers and 400+ committed micro-fulfillment systems. The <strong className="text-foreground">GreenBox JV</strong> with SoftBank adds a $7.5B committed purchase pipeline over six years.
              </p>
            </div>
            <div className="space-y-3">
              <p>
                <strong className="text-foreground">$22.5B contracted backlog</strong> as of FY2025 provides exceptional revenue visibility. The company's first foray into healthcare (Medline) signals TAM expansion beyond retail/wholesale.
              </p>
              <p>
                With a <strong className="text-foreground">$433B+ warehouse automation TAM</strong> and an additional $305B US micro-fulfillment opportunity, Symbotic is positioned at the epicenter of the labor-substitution megatrend. AI software revenue creates a high-margin recurring layer on top of hardware deployments.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Navigation cards */}
        <div>
          <h2 className="text-xs font-mono text-muted-foreground tracking-widest mb-4">EXPLORE THE NEXUS</h2>
          <div className="grid grid-cols-3 gap-3">
            {PAGE_CARDS.map((card, i) => {
              const Icon = card.icon;
              return (
                <motion.button
                  key={card.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i + 0.4, duration: 0.4 }}
                  onClick={() => setCurrentPage(card.id as any)}
                  className="cyber-panel p-4 text-left hover:border-primary/40 transition-all group"
                  data-testid={`landing-card-${card.id}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-md" style={{ background: `${card.color}20` }}>
                      <Icon size={14} style={{ color: card.color }} />
                    </div>
                    <ArrowRight size={12} className="ml-auto text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div className="text-xs font-semibold text-foreground">{card.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{card.desc}</div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Feature callouts */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { title: "Impact Heatmap Layer", desc: "Every assumption color-coded by its bull/bear impact on the final price target. Switch modes in the top bar." },
            { title: "Nexus Graph", desc: "Live causal graph shows how every assumption flows through the model. Nodes pulse when values change." },
            { title: "NL Query Engine", desc: 'Ask: "What if China tariffs rise 15%?" — the orchestrator agent reruns the entire model instantly.' },
          ].map((f) => (
            <div key={f.title} className="bg-muted/20 border border-border rounded-lg p-4 space-y-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <div className="text-xs font-semibold text-foreground">{f.title}</div>
              <div className="text-[11px] text-muted-foreground leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
