import { eq, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { apiKeys } from "@paperclipai/db/schema/api_keys";

export class ApiKeyService {
  constructor(private db: Db) {}

  async list(companyId: string) {
    return this.db.select().from(apiKeys).where(eq(apiKeys.companyId, companyId));
  }

  async getById(id: string) {
    const [result] = await this.db.select().from(apiKeys).where(eq(apiKeys.id, id));
    return result;
  }

  async create(data: {
    companyId: string;
    name: string;
    provider: string;
    keyValue: string;
    model: string;
    baseUrl?: string;
    capabilities: string[];
  }) {
    const [result] = await this.db.insert(apiKeys).values({
      companyId: data.companyId,
      name: data.name,
      provider: data.provider,
      keyValue: data.keyValue,
      model: data.model,
      baseUrl: data.baseUrl ?? null,
      capabilities: data.capabilities,
    }).returning();
    return result;
  }

  async delete(id: string) {
    await this.db.delete(apiKeys).where(eq(apiKeys.id, id));
  }

  async update(id: string, data: Partial<{
    name: string;
    isActive: boolean;
    rateLimit: number;
    baseUrl: string;
  }>) {
    const [result] = await this.db.update(apiKeys)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(apiKeys.id, id))
      .returning();
    return result;
  }

  async test(id: string): Promise<{ success: boolean; message: string }> {
    const key = await this.getById(id);
    if (!key) return { success: false, message: "Key not found" };

    try {
      const response = await fetch(
        key.baseUrl || `https://api.${key.provider}.com/v1/models`,
        { headers: { Authorization: `Bearer ${key.keyValue}` } },
      );
      if (response.ok) {
        await this.db.update(apiKeys).set({ lastTestedAt: new Date() }).where(eq(apiKeys.id, id));
        return { success: true, message: "Key is valid" };
      }
      return { success: false, message: `API returned ${response.status}` };
    } catch (err) {
      return { success: false, message: `Connection failed: ${err instanceof Error ? err.message : "Unknown error"}` };
    }
  }
}
