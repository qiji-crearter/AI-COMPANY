import { pgTable, uuid, text, integer, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    name: text("name").notNull(),
    provider: text("provider").notNull(),
    keyValue: text("key_value").notNull(),
    model: text("model").notNull(),
    baseUrl: text("base_url"),
    capabilities: jsonb("capabilities").$type<string[]>().notNull().default([]),
    isActive: boolean("is_active").notNull().default(true),
    rateLimit: integer("rate_limit").notNull().default(60),
    monthlyCostCents: integer("monthly_cost_cents").notNull().default(0),
    lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyProviderIdx: index("api_keys_company_provider_idx").on(table.companyId, table.provider),
    companyActiveIdx: index("api_keys_company_active_idx").on(table.companyId, table.isActive),
  }),
);
