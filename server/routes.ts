import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { z } from "zod";

// ─── Valuation Engine ─────────────────────────────────────────────────────────
function computeValuation(assumptions: any[]) {
  const get = (key: string) => assumptions.find((a: any) => a.key === key)?.value ?? 0;

  // Base revenue (FY2025 = $2.25B)
  const baseRev = 2250;
  const g1 = 1 + get("revenueGrowthY1") / 100;
  const g2 = 1 + get("revenueGrowthY2") / 100;
  const g3 = 1 + get("revenueGrowthY3") / 100;
  const g4 = 1.18; const g5 = 1.14;
  const rev1 = baseRev * g1;
  const rev2 = rev1 * g2;
  const rev3 = rev2 * g3;
  const rev4 = rev3 * g4;
  const rev5 = rev4 * g5;

  const ebitdaM = get("ebitdaMargin") / 100;
  const capexPct = get("capexPct") / 100;
  const wacc = get("wacc") / 100;
  const tg = get("terminalGrowth") / 100;
  const nwcDays = get("nwcDays");

  // FCF = EBITDA * (1 - tax_rate) - CapEx - NWC change
  const taxRate = 0.21;
  const fcf = (rev: number, prevRev: number) => {
    const ebitda = rev * ebitdaM;
    const nopat = ebitda * (1 - taxRate);
    const capex = rev * capexPct;
    const nwc = ((nwcDays / 365) * (rev - prevRev));
    return nopat - capex - nwc;
  };

  const fcf1 = fcf(rev1, baseRev);
  const fcf2 = fcf(rev2, rev1);
  const fcf3 = fcf(rev3, rev2);
  const fcf4 = fcf(rev4, rev3);
  const fcf5 = fcf(rev5, rev4);

  const tv = (fcf5 * (1 + tg)) / (wacc - tg);

  const pv = (cf: number, yr: number) => cf / Math.pow(1 + wacc, yr);
  const ev = pv(fcf1, 1) + pv(fcf2, 2) + pv(fcf3, 3) + pv(fcf4, 4) + pv(fcf5, 5) + pv(tv, 5);

  const sharesOut = 340; // M shares outstanding approx
  const netDebt = 200; // $M net debt approx
  const dcfTarget = (ev - netDebt) / sharesOut;

  // Comps valuation
  const evRevMult = get("evRevMultiple");
  const evEbitdaMult = get("evEbitdaMultiple");
  const fwdRev = rev1;
  const fwdEbitda = fwdRev * ebitdaM;
  const compsRevTarget = (fwdRev * evRevMult - netDebt) / sharesOut;
  const compsEbitdaTarget = (fwdEbitda * evEbitdaMult - netDebt) / sharesOut;

  // Macro adjustments
  const chinaTariff = get("chinaTariffRisk");
  const creditSpread = get("globalCreditSpread");
  const aiReg = get("aiRegulationRisk");
  const macroDiscount = 1 - (chinaTariff * 0.00008 + creditSpread * 0.00005 + aiReg * 0.0008);

  // Ensemble (Bayesian-weighted)
  const ensemble = (dcfTarget * 0.45 + compsRevTarget * 0.30 + compsEbitdaTarget * 0.25) * macroDiscount;

  // Confidence interval
  const bull = ensemble * 1.35;
  const bear = ensemble * 0.65;

  return {
    dcf: Math.max(0, dcfTarget),
    compsRev: Math.max(0, compsRevTarget),
    compsEbitda: Math.max(0, compsEbitdaTarget),
    ensemble: Math.max(0, ensemble),
    bull: Math.max(0, bull),
    bear: Math.max(0, bear),
    revenues: { rev1, rev2, rev3, rev4, rev5 },
    fcfs: { fcf1, fcf2, fcf3, fcf4, fcf5 },
    terminalValue: tv,
    enterpriseValue: ev,
  };
}

// ─── NLP Query Parser ────────────────────────────────────────────────────────
function parseNLQuery(query: string) {
  const updates: { key: string; value: number; label: string }[] = [];
  const lq = query.toLowerCase();

  const matchers: Array<{ pattern: RegExp; key: string; label: string; transform?: (v: number) => number }> = [
    { pattern: /revenue.growth.+?(\d+(?:\.\d+)?)\s*%/, key: "revenueGrowthY1", label: "Revenue Growth Y1" },
    { pattern: /china.tariff.+?(\d+(?:\.\d+)?)\s*%/, key: "chinaTariffRisk", label: "China Tariff Risk", transform: v => v * 100 },
    { pattern: /labor.cost.+?(?:fall|drop|declin).+?(\d+(?:\.\d+)?)\s*%/, key: "laborDisplacement", label: "Labor Displacement Rate" },
    { pattern: /wacc.+?(\d+(?:\.\d+)?)\s*%/, key: "wacc", label: "WACC" },
    { pattern: /gross.margin.+?(\d+(?:\.\d+)?)\s*%/, key: "grossMargin", label: "Gross Margin" },
    { pattern: /market.share.+?(\d+(?:\.\d+)?)\s*%/, key: "marketShare5y", label: "Market Share" },
    { pattern: /tariff.+?(\d+(?:\.\d+)?)\s*%/, key: "chinaTariffRisk", label: "China Tariff Risk", transform: v => v * 100 },
    { pattern: /ebitda.margin.+?(\d+(?:\.\d+)?)\s*%/, key: "ebitdaMargin", label: "EBITDA Margin" },
    // Derivatives queries
    { pattern: /copper.+?(\d+(?:\.\d+)?)\s*%/, key: "chinaTariffRisk", label: "China Tariff Risk", transform: (v: number) => v * 20 },
    { pattern: /supply.chain.resilience.+?(\d+)/, key: "supplyChainResilience", label: "Supply Chain Resilience" },
    { pattern: /put.call.+?(\d+(?:\.\d+)?)/, key: "sentimentScore", label: "Social Sentiment Score", transform: (v: number) => Math.max(0, Math.min(100, (1 - v) * 80)) },
  ];

  for (const { pattern, key, label, transform } of matchers) {
    const m = lq.match(pattern);
    if (m) {
      const raw = parseFloat(m[1]);
      updates.push({ key, label, value: transform ? transform(raw) : raw });
    }
  }

  return updates;
}

export function registerRoutes(httpServer: Server, app: Express) {
  // ── GET all assumptions ────────────────────────────────────────────────────
  app.get("/api/assumptions", (_req, res) => {
    const all = storage.getAssumptions();
    res.json(all);
  });

  // ── GET assumptions by category ───────────────────────────────────────────
  app.get("/api/assumptions/:category", (req, res) => {
    const data = storage.getAssumptionsByCategory(req.params.category);
    res.json(data);
  });

  // ── PATCH a single assumption value ───────────────────────────────────────
  app.patch("/api/assumptions/:id", (req, res) => {
    const schema = z.object({ value: z.number() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid value" });
    const updated = storage.updateAssumptionValue(req.params.id, parsed.data.value);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  // ── POST reset all assumptions ─────────────────────────────────────────────
  // FIX #5: reset sets value = defaultValue for every row, then returns all rows
  // so the frontend can sync the slider UI to the canonical defaults.
  app.post("/api/assumptions/reset", (_req, res) => {
    storage.resetAllAssumptions();
    const fresh = storage.getAssumptions();
    // Verify each value matches its defaultValue
    res.json({ ok: true, assumptions: fresh });
  });

  // ── GET valuation ─────────────────────────────────────────────────────────
  app.get("/api/valuation", (_req, res) => {
    const all = storage.getAssumptions();
    const result = computeValuation(all);
    res.json(result);
  });

  // ── POST NL query ─────────────────────────────────────────────────────────
  app.post("/api/query", (req, res) => {
    const schema = z.object({ query: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid query" });

    const updates = parseNLQuery(parsed.data.query);

    // Apply updates
    const allAssumptions = storage.getAssumptions();
    for (const upd of updates) {
      const assumption = allAssumptions.find((a: any) => a.key === upd.key);
      if (assumption) {
        storage.updateAssumptionValue(assumption.id, upd.value);
      }
    }

    const refreshed = storage.getAssumptions();
    const valuation = computeValuation(refreshed);

    const result = {
      message: updates.length > 0
        ? `Updated ${updates.map(u => u.label).join(", ")}. New ensemble target: $${valuation.ensemble.toFixed(2)}`
        : `No specific assumptions detected. Current ensemble target: $${valuation.ensemble.toFixed(2)}`,
      updates,
      valuation,
      assumptions: refreshed,
    };

    storage.logQuery({ query: parsed.data.query, result: JSON.stringify(result) });
    res.json(result);
  });

  // ── GET scenarios ─────────────────────────────────────────────────────────
  app.get("/api/scenarios", (_req, res) => {
    res.json(storage.getScenarios());
  });

  // ── POST create scenario ──────────────────────────────────────────────────
  app.post("/api/scenarios", (req, res) => {
    const schema = z.object({ name: z.string(), description: z.string(), assumptions: z.string() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid scenario" });
    res.json(storage.createScenario(parsed.data));
  });

  // ── DELETE scenario ───────────────────────────────────────────────────────
  app.delete("/api/scenarios/:id", (req, res) => {
    storage.deleteScenario(req.params.id);
    res.json({ ok: true });
  });

  // ── GET recent queries ────────────────────────────────────────────────────
  app.get("/api/queries/recent", (_req, res) => {
    res.json(storage.getRecentQueries(5));
  });
}
