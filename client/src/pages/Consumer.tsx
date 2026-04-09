import { useQuery } from "@tanstack/react-query";
import { useNexusStore } from "@/lib/store";
import { AssumptionCard } from "@/components/AssumptionCard";
import {
  RadialBarChart, RadialBar, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import type { Assumption } from "@/lib/store";

const SENTIMENT_HISTORY = [
  { date: "Oct", bull: 52, bear: 28, neutral: 20 },
  { date: "Nov", bull: 58, bear: 24, neutral: 18 },
  { date: "Dec", bull: 48, bear: 32, neutral: 20 },
  { date: "Jan", bull: 65, bear: 18, neutral: 17 },
  { date: "Feb", bull: 71, bear: 15, neutral: 14 },
  { date: "Mar", bull: 68, bear: 17, neutral: 15 },
];

const LABOR_DATA = [
  { sector: "General Merch", automated: 42, manual: 58 },
  { sector: "Grocery DC", automated: 38, manual: 62 },
  { sector: "E-Commerce", automated: 55, manual: 45 },
  { sector: "Cold Chain", automated: 25, manual: 75 },
  { sector: "Pharma DC", automated: 18, manual: 82 },
];

const CUSTOMER_PIE = [
  { name: "Walmart", value: 72, color: "hsl(196 100% 50%)" },
  { name: "C&S Wholesale", value: 14, color: "hsl(262 83% 65%)" },
  { name: "GreenBox", value: 9, color: "hsl(142 70% 45%)" },
  { name: "Medline & Other", value: 5, color: "hsl(40 90% 55%)" },
];

export function Consumer() {
  const { valuation } = useNexusStore();
  const { data: assumptions = [] } = useQuery<Assumption[]>({
    queryKey: ["/api/assumptions"],
  });
  const consumerAssumptions = assumptions.filter((a: Assumption) => a.category === "consumer");

  return (
    <div className="h-full overflow-y-auto page-enter">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-foreground">Consumer & Sentiment</h1>
            <p className="text-xs text-muted-foreground">Labor stats · Social sentiment · Customer concentration · TAM demographics</p>
          </div>
          <div className="cyber-panel px-4 py-2 text-right">
            <div className="text-[9px] font-mono text-muted-foreground">CONSUMER TARGET</div>
            <div className="text-lg font-mono font-bold text-primary">${valuation ? (valuation.ensemble * 0.92).toFixed(2) : "—"}</div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          {/* Assumptions */}
          <div className="col-span-2 space-y-3">
            <h2 className="text-[10px] font-mono text-muted-foreground tracking-widest">CONSUMER ASSUMPTIONS</h2>
            <div className="space-y-2">
              {consumerAssumptions.map((a: Assumption) => (
                <AssumptionCard key={a.id} assumption={a} />
              ))}
            </div>

            {/* Sentiment gauge */}
            <div className="cyber-panel p-4 space-y-2">
              <div className="text-[10px] font-mono text-muted-foreground tracking-wider">LIVE SENTIMENT GAUGE</div>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={100} height={100}>
                  <RadialBarChart cx={50} cy={50} innerRadius={30} outerRadius={48} data={[{ value: 68, fill: "hsl(142 70% 45%)" }]}>
                    <RadialBar dataKey="value" cornerRadius={4} background={{ fill: "hsl(220 20% 12%)" }} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div>
                  <div className="text-2xl font-mono font-bold text-green-400">68</div>
                  <div className="text-[10px] text-muted-foreground">/ 100 Bullish</div>
                  <div className="text-[9px] text-muted-foreground mt-1">Fintwit/Stocktwits ML</div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="col-span-3 space-y-4">
            {/* Sentiment trend */}
            <div className="cyber-panel p-4">
              <h3 className="text-[10px] font-mono text-muted-foreground mb-3 tracking-wider">SOCIAL SENTIMENT BREAKDOWN (6-MO TRAILING)</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={SENTIMENT_HISTORY} margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
                  <CartesianGrid strokeDasharray="2 4" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="nexus-tooltip">
                          <div className="font-bold text-[11px] mb-1">{label}</div>
                          {payload.map((p: any) => (
                            <div key={p.name} style={{ color: p.fill }} className="text-[10px]">{p.name}: {p.value}%</div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="bull" name="Bullish" fill="hsl(142 70% 45% / 0.8)" stackId="a" />
                  <Bar dataKey="neutral" name="Neutral" fill="hsl(218 15% 40% / 0.8)" stackId="a" />
                  <Bar dataKey="bear" name="Bearish" fill="hsl(0 72% 50% / 0.8)" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Labor automation */}
            <div className="cyber-panel p-4">
              <h3 className="text-[10px] font-mono text-muted-foreground mb-3 tracking-wider">WAREHOUSE LABOR AUTOMATION PENETRATION BY SEGMENT</h3>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={LABOR_DATA} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 40 }}>
                  <CartesianGrid strokeDasharray="2 4" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9 }} unit="%" />
                  <YAxis type="category" dataKey="sector" tick={{ fontSize: 9 }} width={75} />
                  <Bar dataKey="automated" name="Automated" fill="hsl(196 100% 50% / 0.75)" stackId="a" />
                  <Bar dataKey="manual" name="Manual" fill="hsl(220 20% 18% / 0.8)" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Customer concentration */}
            <div className="cyber-panel p-4">
              <h3 className="text-[10px] font-mono text-muted-foreground mb-3 tracking-wider">REVENUE CONCENTRATION BY CUSTOMER</h3>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie data={CUSTOMER_PIE} cx={60} cy={60} innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0}>
                      {CUSTOMER_PIE.map((c, i) => <Cell key={i} fill={c.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {CUSTOMER_PIE.map((c) => (
                    <div key={c.name} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-sm" style={{ background: c.color }} />
                        <span className="text-[11px] text-muted-foreground">{c.name}</span>
                      </div>
                      <span className="font-mono text-xs text-foreground">{c.value}%</span>
                    </div>
                  ))}
                  <div className="pt-2 text-[10px] text-red-400 border-t border-border">
                    ⚠ High Walmart concentration = key risk
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
