import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { assumptions, scenarios, queryLog } from "@shared/schema";
import type { Assumption, InsertAssumption, Scenario, InsertScenario, QueryLog, InsertQueryLog } from "@shared/schema";
import { v4 as uuidv4 } from "uuid";

const sqlite = new Database("nexus.db");
const db = drizzle(sqlite);

// Auto-create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS assumptions (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    key TEXT NOT NULL,
    label TEXT NOT NULL,
    value REAL NOT NULL,
    default_value REAL NOT NULL,
    min REAL NOT NULL,
    max REAL NOT NULL,
    unit TEXT NOT NULL,
    description TEXT NOT NULL,
    bull_impact REAL NOT NULL DEFAULT 0,
    bear_impact REAL NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS scenarios (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    assumptions TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS query_log (
    id TEXT PRIMARY KEY,
    query TEXT NOT NULL,
    result TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

export interface IStorage {
  // Assumptions
  getAssumptions(): Assumption[];
  getAssumptionsByCategory(category: string): Assumption[];
  upsertAssumption(data: InsertAssumption): Assumption;
  updateAssumptionValue(id: string, value: number): Assumption | undefined;
  resetAllAssumptions(): void;
  seedDefaults(): void;

  // Scenarios
  getScenarios(): Scenario[];
  createScenario(data: InsertScenario): Scenario;
  deleteScenario(id: string): void;

  // Query log
  logQuery(data: InsertQueryLog): QueryLog;
  getRecentQueries(limit?: number): QueryLog[];
}

const DEFAULT_ASSUMPTIONS: InsertAssumption[] = [
  // ── FIRM ──
  { id: "rev-growth-y1", category: "firm", key: "revenueGrowthY1", label: "Revenue Growth Y1", value: 35, defaultValue: 35, min: 5, max: 80, unit: "%", description: "YoY revenue growth for fiscal 2026", bullImpact: 18.2, bearImpact: -14.5 },
  { id: "rev-growth-y2", category: "firm", key: "revenueGrowthY2", label: "Revenue Growth Y2", value: 28, defaultValue: 28, min: 5, max: 70, unit: "%", description: "YoY revenue growth for fiscal 2027", bullImpact: 14.1, bearImpact: -11.2 },
  { id: "rev-growth-y3", category: "firm", key: "revenueGrowthY3", label: "Revenue Growth Y3", value: 22, defaultValue: 22, min: 5, max: 60, unit: "%", description: "YoY revenue growth for fiscal 2028", bullImpact: 10.8, bearImpact: -8.6 },
  { id: "gross-margin", category: "firm", key: "grossMargin", label: "Gross Margin (Terminal)", value: 35, defaultValue: 35, min: 10, max: 55, unit: "%", description: "Long-run gross profit margin target", bullImpact: 22.4, bearImpact: -19.8 },
  { id: "ebitda-margin", category: "firm", key: "ebitdaMargin", label: "Adj. EBITDA Margin", value: 18, defaultValue: 18, min: 5, max: 35, unit: "%", description: "Adjusted EBITDA margin at steady state", bullImpact: 16.3, bearImpact: -15.1 },
  { id: "wacc", category: "firm", key: "wacc", label: "WACC", value: 10.5, defaultValue: 10.5, min: 7, max: 16, unit: "%", description: "Weighted average cost of capital", bullImpact: -12.4, bearImpact: 9.8 },
  { id: "terminal-growth", category: "firm", key: "terminalGrowth", label: "Terminal Growth Rate", value: 3.5, defaultValue: 3.5, min: 1, max: 6, unit: "%", description: "Perpetuity growth rate in DCF", bullImpact: 8.9, bearImpact: -7.2 },
  { id: "capex-pct", category: "firm", key: "capexPct", label: "CapEx % Revenue", value: 8, defaultValue: 8, min: 2, max: 20, unit: "%", description: "Capital expenditure as % of revenue", bullImpact: -5.3, bearImpact: 4.1 },
  { id: "nwc-days", category: "firm", key: "nwcDays", label: "NWC Days", value: 45, defaultValue: 45, min: 10, max: 120, unit: "days", description: "Net working capital days", bullImpact: -2.1, bearImpact: 1.8 },
  // ── ECOSYSTEM ──
  { id: "tam-warehouse", category: "ecosystem", key: "tamWarehouse", label: "Warehouse TAM ($B)", value: 433, defaultValue: 433, min: 100, max: 800, unit: "$B", description: "Total addressable market for warehouse automation", bullImpact: 9.4, bearImpact: -7.6 },
  { id: "market-share-5y", category: "ecosystem", key: "marketShare5y", label: "Market Share in 5Y", value: 12, defaultValue: 12, min: 3, max: 30, unit: "%", description: "Symbotic's market share in 5 years", bullImpact: 17.2, bearImpact: -13.4 },
  { id: "ev-rev-multiple", category: "ecosystem", key: "evRevMultiple", label: "EV/Revenue Multiple", value: 8, defaultValue: 8, min: 2, max: 20, unit: "x", description: "Forward EV/Revenue for valuation", bullImpact: 11.6, bearImpact: -10.2 },
  { id: "ev-ebitda-multiple", category: "ecosystem", key: "evEbitdaMultiple", label: "EV/EBITDA Multiple", value: 45, defaultValue: 45, min: 15, max: 100, unit: "x", description: "Forward EV/EBITDA for valuation", bullImpact: 13.1, bearImpact: -11.4 },
  // ── CONSUMER ──
  { id: "labor-displacement", category: "consumer", key: "laborDisplacement", label: "Labor Displacement Rate", value: 65, defaultValue: 65, min: 20, max: 95, unit: "%", description: "% of warehouse labor replaced by robotics", bullImpact: 6.2, bearImpact: -5.1 },
  { id: "sentiment-score", category: "consumer", key: "sentimentScore", label: "Social Sentiment Score", value: 68, defaultValue: 68, min: 0, max: 100, unit: "", description: "Composite bullish sentiment from Fintwit/Stocktwits", bullImpact: 3.4, bearImpact: -2.8 },
  { id: "walmart-concentration", category: "consumer", key: "walmartConcentration", label: "Walmart Revenue %", value: 72, defaultValue: 72, min: 30, max: 90, unit: "%", description: "Walmart as % of total revenue (concentration risk)", bullImpact: -4.8, bearImpact: 3.6 },
  // ── GLOBAL ──
  { id: "china-tariff-risk", category: "global", key: "chinaTariffRisk", label: "China Tariff Risk (bps)", value: 150, defaultValue: 150, min: 0, max: 500, unit: "bps", description: "Spread add for China supply-chain tariff risk", bullImpact: -7.3, bearImpact: 5.9 },
  { id: "global-credit-spread", category: "global", key: "globalCreditSpread", label: "Global Credit Spread (bps)", value: 180, defaultValue: 180, min: 50, max: 400, unit: "bps", description: "IG credit spread proxy for macro risk", bullImpact: -4.6, bearImpact: 3.7 },
  { id: "supply-chain-resilience", category: "global", key: "supplyChainResilience", label: "Supply Chain Resilience", value: 72, defaultValue: 72, min: 20, max: 100, unit: "", description: "Index of supply-chain disruption risk (100 = no risk)", bullImpact: 5.8, bearImpact: -4.4 },
  // ── GOVERNMENT ──
  { id: "ai-regulation-risk", category: "government", key: "aiRegulationRisk", label: "AI Regulation Risk Score", value: 30, defaultValue: 30, min: 0, max: 100, unit: "", description: "Risk score for adverse AI/robotics regulation (100 = max risk)", bullImpact: -6.1, bearImpact: 4.9 },
  { id: "automation-subsidy", category: "government", key: "automationSubsidy", label: "Automation Incentive ($B)", value: 2.5, defaultValue: 2.5, min: 0, max: 10, unit: "$B", description: "Federal incentive/subsidy available to automation sector", bullImpact: 3.2, bearImpact: -1.8 },
  { id: "trade-policy-risk", category: "government", key: "tradePolicyRisk", label: "Trade Policy Risk Score", value: 40, defaultValue: 40, min: 0, max: 100, unit: "", description: "Risk from trade restrictions impacting robotics hardware", bullImpact: -5.4, bearImpact: 4.3 },
];

export const storage: IStorage = {
  seedDefaults() {
    const existing = db.select().from(assumptions).all();
    if (existing.length === 0) {
      for (const a of DEFAULT_ASSUMPTIONS) {
        db.insert(assumptions).values(a).run();
      }
    }
  },

  getAssumptions() {
    return db.select().from(assumptions).all();
  },

  getAssumptionsByCategory(category: string) {
    return db.select().from(assumptions).where(eq(assumptions.category, category)).all();
  },

  upsertAssumption(data: InsertAssumption) {
    db.insert(assumptions).values(data).run();
    return db.select().from(assumptions).where(eq(assumptions.id, data.id)).get()!;
  },

  updateAssumptionValue(id: string, value: number) {
    db.update(assumptions).set({ value }).where(eq(assumptions.id, id)).run();
    return db.select().from(assumptions).where(eq(assumptions.id, id)).get();
  },

  resetAllAssumptions() {
    db.update(assumptions).set({ value: assumptions.defaultValue as unknown as number }).run();
    // Individual resets
    for (const a of DEFAULT_ASSUMPTIONS) {
      db.update(assumptions).set({ value: a.defaultValue }).where(eq(assumptions.id, a.id)).run();
    }
  },

  getScenarios() {
    return db.select().from(scenarios).all();
  },

  createScenario(data: InsertScenario) {
    const id = uuidv4();
    const createdAt = Date.now();
    db.insert(scenarios).values({ ...data, id, createdAt }).run();
    return db.select().from(scenarios).where(eq(scenarios.id, id)).get()!;
  },

  deleteScenario(id: string) {
    db.delete(scenarios).where(eq(scenarios.id, id)).run();
  },

  logQuery(data: InsertQueryLog) {
    const id = uuidv4();
    const createdAt = Date.now();
    db.insert(queryLog).values({ ...data, id, createdAt }).run();
    return db.select().from(queryLog).where(eq(queryLog.id, id)).get()!;
  },

  getRecentQueries(limit = 10) {
    return db.select().from(queryLog).all().slice(-limit);
  },
};

// Seed on startup
storage.seedDefaults();
