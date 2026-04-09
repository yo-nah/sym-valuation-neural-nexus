
import { useQuery } from "@tanstack/react-query";
import { useNexusStore } from "@/lib/store";
import { AssumptionCard } from "@/components/AssumptionCard";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import type { Assumption, Valuation } from "@/lib/store";

const YEARS = ["FY22", "FY23", "FY24", "FY25", "FY26E", "FY27E", "FY28E"];

function buildIncomeData(valuation: Valuation | null) {
  const actuals = [
    { rev: 593, ebitda: -98, grossPct: 11 },
    { rev: 1177, ebitda: -137, grossPct: 13 },
    { rev: 1788, ebitda: 62, grossPct: 17 },
    { rev: 2247, ebitda: 147, grossPct: 21 },
  ];
  const projections = valuation
    ? [
        { rev: valuation.revenues.rev1, ebitda: valuation.revenues.rev1 * 0.18, grossPct: 28 },
        { rev: valuation.revenues.rev2, ebitda: valuation.revenues.rev2 * 0.20, grossPct: 32 },
        { rev: valuation.revenues.rev3, ebitda: valuation.revenues.rev3 * 0.22, grossPct: 35 },
      ]
    : [
        { rev: 3033, ebitda: 546, grossPct: 28 },
        { rev: 3882, ebitda: 777, grossPct: 32 },
        { rev: 4736, ebitda: 1042, grossPct: 35 },
      ];

  return YEARS.map((year, i) => ({
    year,
    revenue: i < 4 ? actuals[i].rev : projections[i - 4].rev,
    ebitda: i < 4 ? actuals[i].ebitda : projections[i - 4].ebitda,
    grossPct: i < 4 ? actuals[i].grossPct : projections[i - 4].grossPct,
    projected: i >= 4,
  }));
}

const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="nexus-tooltip">
      <div className="text-[11px] font-mono font-bold text-foreground mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color }} className="text-[10px] font-mono">
          {p.name}: ${typeof p.value === "number" ? (p.value / 1000).toFixed(1) : p.value}B
        </div>
      ))}
    </div>
  );
};

export function Firm() {
  const { valuation } = useNexusStore();

  const { data: assumptions = [] } = useQuery<Assumption[]>({
    queryKey: ["/api/assumptions"],
  });

  const firmAssumptions = assumptions.filter((a: Assumption) => a.category === "firm");
  const incomeData = buildIncomeData(valuation);

  const dcfTarget = valuation?.dcf ?? 0;
  const compsTarget = ((valuation?.compsRev ?? 0) + (valuation?.compsEbitda ?? 0)) / 2;

  // FIX: normalize tornado bars relative to the max magnitude so bars accurately
  // reflect relative sensitivity. Labels use ± signs and consistent format.
  const tornadoRaw = firmAssumptions.map((a) => ({
    label: a.label,
    bull: a.bullImpact,    // positive = price target goes up
    bear: a.bearImpact,    // negative = price target goes down
  })).sort((a, b) => (Math.abs(b.bull) + Math.abs(b.bear)) - (Math.abs(a.bull) + Math.abs(a.bear)));

  // Max absolute impact for normalized bar width
  const maxImpact = Math.max(...tornadoRaw.map((d) => Math.max(Math.abs(d.bull), Math.abs(d.bear))), 1);

  return (
    <div className="h-full overflow-y-auto page-enter">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-foreground">Firm Analysis</h1>
            <p className="text-xs text-muted-foreground">Three-statement model · DCF · Multiples · Tornado chart</p>
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
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          {/* Left: Assumptions */}
          <div className="col-span-2 space-y-3">
            <h2 className="text-[10px] font-mono text-muted-foreground tracking-widest">MODEL ASSUMPTIONS</h2>
            <div className="space-y-2">
              {firmAssumptions.map((a: Assumption) => (
                <AssumptionCard key={a.id} assumption={a} />
              ))}
            </div>
          </div>

          {/* Right: Charts */}
          <div className="col-span-3 space-y-4">
            {/* Revenue & EBITDA */}
            <div className="cyber-panel p-4">
              <h3 className="text-[10px] font-mono text-muted-foreground mb-3 tracking-wider">REVENUE & ADJ. EBITDA ($M)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={incomeData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                  <CartesianGrid strokeDasharray="2 4" />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<CUSTOM_TOOLTIP />} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="revenue" name="Revenue" fill="hsl(196 100% 50% / 0.7)" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="ebitda" name="EBITDA" fill="hsl(262 83% 65% / 0.7)" radius={[2, 2, 0, 0]} />
                  <ReferenceLine x="FY25" stroke="hsl(196 100% 50% / 0.3)" strokeDasharray="4 4" label={{ value: "Actual", fontSize: 9, fill: "hsl(196 100% 50%)" }} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Gross margin trend */}
            <div className="cyber-panel p-4">
              <h3 className="text-[10px] font-mono text-muted-foreground mb-3 tracking-wider">GROSS MARGIN EXPANSION (%)</h3>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={incomeData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                  <CartesianGrid strokeDasharray="2 4" />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, 50]} />
                  <Tooltip content={<CUSTOM_TOOLTIP />} />
                  <defs>
                    <linearGradient id="gmGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(142 70% 45%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(142 70% 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area dataKey="grossPct" name="Gross Margin %" fill="url(#gmGrad)" stroke="hsl(142 70% 45%)" strokeWidth={2} dot={{ fill: "hsl(142 70% 45%)", r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* FIXED Tornado Chart */}
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
                  {/* Bear side ruler */}
                  <div className="flex-1 flex justify-between pr-0.5 text-[8px] font-mono text-muted-foreground/50">
                    <span>{(-maxImpact).toFixed(0)}%</span>
                    <span>{(-maxImpact / 2).toFixed(0)}%</span>
                  </div>
                  <div className="w-px h-3 bg-border/60" />
                  {/* Bull side ruler */}
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
                  // Normalize width to 45% max (bear fills left, bull fills right)
                  const bearWidth = (Math.abs(d.bear) / maxImpact) * 45;
                  const bullWidth = (Math.abs(d.bull) / maxImpact) * 45;
                  // Correct sign display: bear is always negative impact, bull positive
                  // Let the number's own sign carry through — no manual prefix injection
                  const bearLabel = `${d.bear > 0 ? "+" : ""}${d.bear.toFixed(1)}%`;
                  const bullLabel = `${d.bull > 0 ? "+" : ""}${d.bull.toFixed(1)}%`;

                  return (
                    <div key={d.label} className="flex items-center gap-2 text-[10px]">
                      <div className="w-28 text-right font-mono text-muted-foreground truncate text-[9px]" title={d.label}>
                        {d.label}
                      </div>
                      {/* Bar track: position:relative so we can size bars from center */}
                      <div className="flex-1 relative" style={{ height: 14 }}>
                        {/* Bear bar: anchored at 50%, grows left */}
                        <div
                          className="absolute rounded-l transition-all"
                          style={{
                            right: "50%",
                            top: 0,
                            height: 14,
                            width: `${bearWidth}%`,
                            background: d.bear < 0
                              ? `hsl(0 72% ${42 + (Math.abs(d.bear) / maxImpact) * 18}% / 0.85)`
                              : "hsl(142 60% 40% / 0.7)",
                          }}
                        />
                        {/* Center divider */}
                        <div
                          className="absolute bg-muted-foreground/30"
                          style={{ left: "50%", top: 0, width: 1, height: 14 }}
                        />
                        {/* Bull bar: anchored at 50%, grows right */}
                        <div
                          className="absolute rounded-r transition-all"
                          style={{
                            left: "50%",
                            top: 0,
                            height: 14,
                            width: `${bullWidth}%`,
                            background: d.bull > 0
                              ? `hsl(142 ${55 + (d.bull / maxImpact) * 20}% ${40 + (d.bull / maxImpact) * 12}% / 0.85)`
                              : "hsl(0 72% 40% / 0.7)",
                          }}
                        />
                      </div>
                      {/* FIX: proper ± labels — bear always shows negative, bull positive */}
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
