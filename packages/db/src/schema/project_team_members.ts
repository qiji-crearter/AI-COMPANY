import { pgTable, uuid, text, timestamp, integer, index, unique } from "drizzle-orm/pg-core";
import { projects } from "./projects.js";
import { agents } from "./agents.js";

export const projectTeamMembers = pgTable(
  "project_team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id),
    agentId: uuid("agent_id").notNull().references(() => agents.id),
    role: text("role").notNull().default("member"),
    taskDescription: text("task_description"),
    taskProgress: integer("task_progress").notNull().default(0),
    taskStatus: text("task_status").notNull().default("idle"),
    sessionCount: integer("session_count").notNull().default(0),
    lastSessionAt: timestamp("last_session_at", { withTimezone: true }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectAgentUnique: unique("project_agent_unique").on(table.projectId, table.agentId),
    projectIdx: index("team_project_idx").on(table.projectId),
    statusIdx: index("team_status_idx").on(table.projectId, table.taskStatus),
  }),
);
