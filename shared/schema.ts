import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Assumptions Table ────────────────────────────────────────────────────────
export const assumptions = sqliteTable("assumptions", {
  id: text("id").primaryKey(),
  category: text("category").notNull(), // firm | ecosystem | consumer | global | government
  key: text("key").notNull(),
  label: text("label").notNull(),
  value: real("value").notNull(),
  defaultValue: real("default_value").notNull(),
  min: real("min").notNull(),
  max: real("max").notNull(),
  unit: text("unit").notNull(), // %, $, x, bps
  description: text("description").notNull(),
  bullImpact: real("bull_impact").notNull().default(0),  // % change in price target
  bearImpact: real("bear_impact").notNull().default(0),
});

export const insertAssumptionSchema = createInsertSchema(assumptions);
export type InsertAssumption = z.infer<typeof insertAssumptionSchema>;
export type Assumption = typeof assumptions.$inferSelect;

// ─── Scenarios Table ─────────────────────────────────────────────────────────
export const scenarios = sqliteTable("scenarios", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  assumptions: text("assumptions").notNull(), // JSON
  createdAt: integer("created_at").notNull(),
});

export const insertScenarioSchema = createInsertSchema(scenarios).omit({ createdAt: true });
export type InsertScenario = z.infer<typeof insertScenarioSchema>;
export type Scenario = typeof scenarios.$inferSelect;

// ─── Query Log Table ─────────────────────────────────────────────────────────
export const queryLog = sqliteTable("query_log", {
  id: text("id").primaryKey(),
  query: text("query").notNull(),
  result: text("result").notNull(), // JSON
  createdAt: integer("created_at").notNull(),
});

export const insertQueryLogSchema = createInsertSchema(queryLog).omit({ createdAt: true });
export type InsertQueryLog = z.infer<typeof insertQueryLogSchema>;
export type QueryLog = typeof queryLog.$inferSelect;
