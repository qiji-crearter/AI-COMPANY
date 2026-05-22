import { boolean, pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { companySecrets } from "./company_secrets.js";

export const providerKeys = pgTable(
  "provider_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    name: text("name").notNull(),
    provider: text("provider").notNull(),
    status: text("status").notNull().default("active"),
    baseUrlOpenai: text("base_url_openai"),
    baseUrlAnthropic: text("base_url_anthropic"),
    secretId: uuid("secret_id").notNull().references(() => companySecrets.id),
    lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
    lastTestOk: boolean("last_test_ok"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index("provider_keys_company_idx").on(table.companyId),
    companyProviderIdx: index("provider_keys_company_provider_idx").on(table.companyId, table.provider),
  }),
);
