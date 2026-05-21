import { eq, and, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agents } from "@paperclipai/db/schema/agents";

export class AgentPoolService {
  constructor(private db: Db) {}

  async list(companyId: string) {
    return this.db.select().from(agents).where(eq(agents.companyId, companyId));
  }

  async getById(id: string) {
    const [result] = await this.db.select().from(agents).where(eq(agents.id, id));
    return result;
  }

  async create(data: {
    companyId: string;
    name: string;
    role: string;
    title?: string;
    tags: string[];
    modelBinding?: string;
    adapterType: string;
    maxConcurrency?: number;
    temperature?: number;
    maxTokens?: number;
  }) {
    const [result] = await this.db.insert(agents).values({
      companyId: data.companyId,
      name: data.name,
      role: data.role,
      title: data.title ?? null,
      tags: data.tags,
      modelBinding: data.modelBinding ?? null,
      adapterType: data.adapterType,
      maxConcurrency: data.maxConcurrency ?? 3,
      temperature: data.temperature ?? 70,
      maxTokens: data.maxTokens ?? null,
    }).returning();
    return result;
  }

  async update(id: string, data: Partial<{
    name: string;
    role: string;
    title: string;
    tags: string[];
    modelBinding: string;
    adapterType: string;
    maxConcurrency: number;
    temperature: number;
    maxTokens: number;
    status: string;
  }>) {
    const [result] = await this.db.update(agents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(agents.id, id))
      .returning();
    return result;
  }

  async delete(id: string) {
    await this.db.update(agents)
      .set({ status: "deleted", updatedAt: new Date() })
      .where(eq(agents.id, id));
  }

  async findByTags(companyId: string, requiredTags: string[]) {
    return this.db.select().from(agents).where(
      and(
        eq(agents.companyId, companyId),
        eq(agents.status, "idle"),
        sql`${agents.tags} && ARRAY[${sql.join(requiredTags, sql`, `)}]::text[]`,
        sql`${agents.currentTasks} < ${agents.maxConcurrency}`,
      ),
    );
  }

  async incrementTasks(id: string) {
    await this.db.update(agents)
      .set({
        currentTasks: sql`${agents.currentTasks} + 1`,
        status: "working",
        updatedAt: new Date(),
      })
      .where(eq(agents.id, id));
  }

  async decrementTasks(id: string) {
    await this.db.update(agents)
      .set({
        currentTasks: sql`GREATEST(${agents.currentTasks} - 1, 0)`,
        status: sql`CASE WHEN ${agents.currentTasks} - 1 <= 0 THEN 'idle' ELSE 'working' END`,
        lastTaskCompletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(agents.id, id));
  }
}
