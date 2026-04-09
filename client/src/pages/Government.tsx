import { useQuery } from "@tanstack/react-query";
import { useNexusStore } from "@/lib/store";
import { AssumptionCard } from "@/components/AssumptionCard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Landmark, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import type { Assumption } from "@/lib/store";

const REG_EVENTS = [
  { date: "2024-03", title: "EU AI Act Passed", jurisdiction: "EU", type: "regulation", impact: "bear", status: "enacted", desc: "Classifies warehouse AI as 'limited risk'; minimal compliance burden for SYM but sets precedent for GDPR-style extraterritorial reach." },
  { date: "2024-09", title: "CHIPS & Science Act Deployment", jurisdiction: "US", type: "incentive", impact: "bull", status: "active", desc: "Semiconductor supply chain reshoring; benefits SYM's US-based robotics manufacturing and reduces input cost volatility." },
  { date: "2025-01", title: "Executive Order on AI Safety", jurisdiction: "US", type: "regulation", impact: "neutral", status: "active", desc: "Requires safety testing for AI in critical infrastructure. Warehouse automation in gray zone — likely neutral short-term." },
  { date: "2025-04", title: "IRA Tax Credits — Automation", jurisdiction: "US", type: "incentive", impact: "bull", status: "proposed", desc: "Proposed extension of IRA credits to include industrial automation equipment. Could reduce customer payback periods by ~18 months." },
  { date: "2025-07", title: "China Tariff Escalation", jurisdiction: "US/China", type: "trade", impact: "bear", status: "active", desc: "15% tariff on Chinese-origin robotics components; SYM sources ~30% of COGS from APAC supply chain. Gross margin headwind estimated at 80-120bps." },
  { date: "2026-02", title: "Labor Displacement Hearings", jurisdiction: "US", type: "regulation", impact: "bear", status: "pending", desc: "Senate Commerce Committee hearings on automation unemployment insurance. Possible robot tax proposals could increase customer TCO." },
];

const INCENTIVE_DATA = [
  { name: "IRA Credits", value: 2.5, type: "bull" },
  { name: "CHIPS Act", value: 1.8, type: "bull" },
  { name: "State Incentives", value: 0.9, type: "bull" },
  { name: "China Tariffs", value: -1.4, type: "bear" },
  { name: "Robot Tax Risk", value: -0.6, type: "bear" },
];

const STATUS_COLORS: Record<string, string> = {
  enacted: "hsl(142 70% 45%)",
  active: "hsl(196 100% 50%)",
  proposed: "hsl(40 90% 55%)",
  pending: "hsl(262 83% 65%)",
};

const STATUS_ICONS: Record<string, any> = {
  enacted: CheckCircle,
  active: CheckCircle,
  proposed: Clock,
  pending: AlertTriangle,
};

export function Government() {
  const { valuation } = useNexusStore();
  const { data: assumptions = [] } = useQuery<Assumption[]>({
    queryKey: ["/api/assumptions"],
  });
  const govAssumptions = assumptions.filter((a: Assumption) => a.category === "government");

  return (
    <div className="h-full overflow-y-auto page-enter">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-foreground">Government & Policy</h1>
            <p className="text-xs text-muted-foreground">AI regulation · Trade policy · Automation incentives · Geopolitical risk</p>
          </div>
          <div className="cyber-panel px-4 py-2 text-right">
            <div className="text-[9px] font-mono text-muted-foreground">GOV-ADJUSTED TARGET</div>
            <div className="text-lg font-mono font-bold text-primary">${valuation ? (valuation.ensemble * 0.97).toFixed(2) : "—"}</div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          {/* Timeline */}
          <div className="col-span-3 space-y-4">
            <div className="text-[10px] font-mono text-muted-foreground tracking-widest">REGULATORY & POLICY TIMELINE</div>
            <div className="space-y-2">
              {REG_EVENTS.map((e) => {
                const StatusIcon = STATUS_ICONS[e.status];
                return (
                  <div key={e.title} className="cyber-panel p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
                        <StatusIcon size={12} style={{ color: STATUS_COLORS[e.status] }} />
                        <div className="font-mono text-[9px] text-muted-foreground">{e.date.slice(0, 7)}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-foreground">{e.title}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">{e.jurisdiction}</span>
                          <span
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                            style={{
                              background: e.impact === "bull" ? "hsl(142 70% 45% / 0.15)" : e.impact === "bear" ? "hsl(0 72% 55% / 0.15)" : "hsl(218 15% 40% / 0.2)",
                              color: e.impact === "bull" ? "hsl(142 70% 55%)" : e.impact === "bear" ? "hsl(0 72% 60%)" : "hsl(218 15% 60%)",
                            }}
                          >
                            {e.impact}
                          </span>
                          <span
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded ml-auto"
                            style={{ color: STATUS_COLORS[e.status] }}
                          >
                            {e.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{e.desc}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Net policy impact chart */}
            <div className="cyber-panel p-4">
              <div className="text-[10px] font-mono text-muted-foreground mb-3 tracking-wider">NET POLICY IMPACT ON VALUATION ($B)</div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={INCENTIVE_DATA} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 60 }}>
                  <CartesianGrid strokeDasharray="2 4" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} unit="B" domain={[-2, 3]} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={90} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="nexus-tooltip">
                          <div className="font-mono text-[11px]">${payload[0].value}B impact</div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="hsl(196 100% 50%)"
                    radius={[0, 3, 3, 0]}
                    label={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Assumptions */}
          <div className="col-span-2 space-y-3">
            <h2 className="text-[10px] font-mono text-muted-foreground tracking-widest">GOVERNMENT ASSUMPTIONS</h2>
            <div className="space-y-2">
              {govAssumptions.map((a: Assumption) => (
                <AssumptionCard key={a.id} assumption={a} />
              ))}
            </div>

            {/* Policy risk matrix */}
            <div className="cyber-panel p-3 space-y-2">
              <div className="text-[10px] font-mono text-muted-foreground tracking-wider">POLICY RISK MATRIX</div>
              <div className="grid grid-cols-2 gap-1 text-[9px] font-mono">
                <div className="p-2 rounded bg-green-500/10 border border-green-500/20 text-green-400">
                  <div className="font-bold mb-1">BULL POLICY</div>
                  <div className="text-[9px] leading-relaxed">IRA credits extended, CHIPS Act full deployment, automation depreciation accelerated</div>
                </div>
                <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-red-400">
                  <div className="font-bold mb-1">BEAR POLICY</div>
                  <div className="text-[9px] leading-relaxed">Robot tax enacted, China tariffs 25%+, EU-style AI regulation adopted by US</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
