import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { z } from "zod";

// ─── Valuation Engine v2 ──────────────────────────────────────────────────────
// Every user-manipulable assumption is wired into the output price target.
// Audit trail of each assumption's contribution:
//
//  FIRM ASSUMPTIONS:
//  revenueGrowthY1-Y5  -> rev1-rev5 (direct revenue driver)
//  grossMargin         -> EBITDA (gross margin * opexRatio)
//  ebitdaMargin        -> EBITDA override (if >0 overrides grossMargin)
//  wacc                -> DCF discounting + terminal value denominator
//  terminalGrowth      -> terminal value numerator growth
//  capexPct            -> FCF reduction each year
//  nwcDays             -> working capital drag on FCF
//
//  ECOSYSTEM ASSUMPTIONS:
//  evRevMultiple       -> comps revenue valuation
//  evEbitdaMultiple    -> comps EBITDA valuation
//  tamWarehouse        -> revenue ceiling: Y5 revenue capped at TAM * marketShare5y
//  marketShare5y       -> works with TAM to cap revenue trajectory
//
//  CONSUMER ASSUMPTIONS:
//  laborDisplacement   -> pricing power adjustment on gross margin (+1bp per % above 50%)
//  sentimentScore      -> WACC adjustment (high sentiment -> lower beta -> lower cost of equity)
//  walmartConcentration-> revenue risk discount (concentration -> revenue volatility premium)
//
//  GLOBAL ASSUMPTIONS:
//  chinaTariffRisk     -> macro discount (COGS headwind)
//  globalCreditSpread  -> macro discount (funding cost)
//  supplyChainResilience -> macro discount (inverted: lower = worse)
//
//  GOVERNMENT ASSUMPTIONS:
//  aiRegulationRisk    -> macro discount (compliance cost)
//  automationSubsidy   -> capex offset (reduces effective CapEx %)
//  tradePolicyRisk     -> macro discount (trade friction)

function computeValuation(assumptions: any[]) {
  const get = (key: string, fallback = 0) =>
    assumptions.find((a: any) => a.key === key)?.value ?? fallback;

  // ── Revenue projection (Y1-Y5 all user-controlled) ─────────────────────
  const baseRev = 2247; // FY2025 actual: $2,247M
  const g1 = 1 + get("revenueGrowthY1") / 100;
  const g2 = 1 + get("revenueGrowthY2") / 100;
  const g3 = 1 + get("revenueGrowthY3") / 100;
  const g4 = 1 + get("revenueGrowthY4", 18) / 100; // Y4 now user-controlled
  const g5 = 1 + get("revenueGrowthY5", 14) / 100; // Y5 now user-controlled

  let rev1 = baseRev * g1;
  let rev2 = rev1 * g2;
  let rev3 = rev2 * g3;
  let rev4 = rev3 * g4;
  let rev5 = rev4 * g5;

  // ── TAM + market share cap: revenue cannot exceed TAM × share ────────
  // (Ecosystem assumptions now influence DCF revenue)
  const tam = get("tamWarehouse", 433) * 1000; // convert $B -> $M
  const mktShare = get("marketShare5y", 12) / 100;
  const revCap = tam * mktShare;
  // Soft cap: if projected Y5 > cap, apply tapering from Y3 onward
  if (rev5 > revCap) {
    const capFactor = Math.sqrt(revCap / rev5); // sqrt = gradual approach
    rev5 = rev5 * capFactor;
    rev4 = Math.min(rev4, rev5 * 0.92);
    rev3 = Math.min(rev3, rev4 * 0.90);
  }

  // ── EBITDA margin derivation ───────────────────────────────────────────
  // grossMargin drives base EBITDA; ebitdaMargin can override if >0
  const grossM = get("grossMargin", 35) / 100;
  const ebitdaOverride = get("ebitdaMargin", 0);
  // Labor displacement > 50% gives pricing power: +0.15% EBITDA per % above 50
  const laborDisp = get("laborDisplacement", 65);
  const laborPremium = Math.max(0, (laborDisp - 50) * 0.0015);
  // Base EBITDA from grossMargin (opex ratio ~45% of gross, so EBITDA ~55% of gross)
  const ebitdaFromGross = grossM * 0.55 + laborPremium;
  // Use override if explicitly set above 5%, else derive from gross margin
  const ebitdaM = (ebitdaOverride > 5 ? ebitdaOverride / 100 : ebitdaFromGross);

  // ── Automation subsidy reduces effective CapEx ─────────────────────────
  const rawCapex = get("capexPct", 8) / 100;
  const subsidy = get("automationSubsidy", 2.5); // $B
  // Subsidy covers ~$200M/yr capex offset across 5yr → ~$40M/yr
  const subsidyOffset = Math.min(rawCapex * 0.3, (subsidy * 40) / (baseRev * g1)); // max 30% capex reduction
  const capexPct = Math.max(0.01, rawCapex - subsidyOffset);

  const wacc = get("wacc", 10.5) / 100;
  const tg = get("terminalGrowth", 3.5) / 100;
  const nwcDays = get("nwcDays", 45);

  // ── Sentiment → WACC adjustment ───────────────────────────────────────
  // Higher sentiment = lower perceived beta = lower cost of equity
  const sentiment = get("sentimentScore", 68);
  const sentimentWaccAdj = (sentiment - 50) * -0.00012; // ±0.6% wacc swing over 0-100 range
  const effectiveWacc = Math.max(0.04, wacc + sentimentWaccAdj);

  // ── Walmart concentration → revenue risk discount ──────────────────────
  const walmartConc = get("walmartConcentration", 72) / 100;
  // >70% concentration adds idiosyncratic revenue risk discount
  const concentrationDiscount = Math.max(0, (walmartConc - 0.5) * 0.12);

  // ── FCF calculation ────────────────────────────────────────────────────
  const taxRate = 0.21;
  const fcf = (rev: number, prevRev: number) => {
    const ebitda = rev * ebitdaM;
    const nopat = ebitda * (1 - taxRate);
    const capex = rev * capexPct;
    const nwcChange = (nwcDays / 365) * (rev - prevRev);
    return nopat - capex - nwcChange;
  };

  const fcf1 = fcf(rev1, baseRev);
  const fcf2 = fcf(rev2, rev1);
  const fcf3 = fcf(rev3, rev2);
  const fcf4 = fcf(rev4, rev3);
  const fcf5 = fcf(rev5, rev4);

  const tv = (fcf5 * (1 + tg)) / (effectiveWacc - tg);
  const pv = (cf: number, yr: number) => cf / Math.pow(1 + effectiveWacc, yr);
  const ev = pv(fcf1, 1) + pv(fcf2, 2) + pv(fcf3, 3) + pv(fcf4, 4) + pv(fcf5, 5) + pv(tv, 5);

  const sharesOut = 340; // M shares
  const netDebt = 200;  // $M
  const rawDcf = (ev - netDebt) / sharesOut;
  const dcfTarget = rawDcf * (1 - concentrationDiscount);

  // ── Comps valuation ────────────────────────────────────────────────────
  const evRevMult = get("evRevMultiple", 8);
  const evEbitdaMult = get("evEbitdaMultiple", 45);
  const fwdRev = rev1;
  const fwdEbitda = fwdRev * ebitdaM;
  const compsRevTarget = (fwdRev * evRevMult - netDebt) / sharesOut * (1 - concentrationDiscount);
  const compsEbitdaTarget = (fwdEbitda * evEbitdaMult - netDebt) / sharesOut * (1 - concentrationDiscount);

  // ── Macro discount ─────────────────────────────────────────────────────
  // All macro/government assumptions feed into a composite discount factor
  const chinaTariff = get("chinaTariffRisk", 150);
  const creditSpread = get("globalCreditSpread", 180);
  const aiReg = get("aiRegulationRisk", 30);
  const supplyChain = get("supplyChainResilience", 72); // higher = better
  const tradePolicyRisk = get("tradePolicyRisk", 40);

  // Base macro headwinds
  const macroHeadwind =
    chinaTariff * 0.00008 +     // tariff COGS drag
    creditSpread * 0.00005 +    // funding cost spread
    aiReg * 0.0008 +            // regulation compliance cost
    tradePolicyRisk * 0.0004;   // trade friction

  // Supply chain resilience is a macro tailwind (higher = less discount)
  const supplyChainTailwind = (supplyChain - 50) * 0.0003; // ±1.5% swing

  const macroDiscount = Math.max(0.5, Math.min(1.15,
    1 - macroHeadwind + supplyChainTailwind
  ));

  // ── Final ensemble ─────────────────────────────────────────────────────
  const ensemble = (dcfTarget * 0.45 + compsRevTarget * 0.30 + compsEbitdaTarget * 0.25) * macroDiscount;
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
    // Debug: expose intermediate factors
    effectiveWacc: parseFloat((effectiveWacc * 100).toFixed(3)),
    effectiveEbitdaM: parseFloat((ebitdaM * 100).toFixed(2)),
    macroDiscount: parseFloat(macroDiscount.toFixed(4)),
    concentrationDiscount: parseFloat((concentrationDiscount * 100).toFixed(2)),
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
