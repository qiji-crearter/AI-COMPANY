import { pgTable, uuid, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { projects } from "./projects.js";
import { agents } from "./agents.js";

export const projectDocuments = pgTable(
  "project_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id),
    agentId: uuid("agent_id").references(() => agents.id),
    title: text("title").notNull(),
    content: text("content").notNull(),
    version: integer("version").notNull().default(1),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectIdx: index("project_docs_project_idx").on(table.projectId),
    projectAgentIdx: index("project_docs_agent_idx").on(table.projectId, table.agentId),
  }),
);
