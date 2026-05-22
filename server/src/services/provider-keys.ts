import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { providerKeys, companySecrets } from "@paperclipai/db";
import type {
  CreateProviderKeyRequest,
  ProviderKeyWithSecret,
  UpdateProviderKeyRequest,
} from "@paperclipai/shared";
import { conflict, notFound } from "../errors.js";

export function providerKeyService(db: Db) {
  function maskApiKey(value: string): string {
    const cleaned = value.trim();
    if (cleaned.length <= 8) return cleaned.slice(0, 2) + "****";
    return cleaned.slice(0, 6) + "****" + cleaned.slice(-4);
  }

  return {
    list: async (companyId: string): Promise<ProviderKeyWithSecret[]> => {
      const rows = await db
        .select({
          key: providerKeys,
          secret: companySecrets,
        })
        .from(providerKeys)
        .leftJoin(companySecrets, eq(providerKeys.secretId, companySecrets.id))
        .where(eq(providerKeys.companyId, companyId))
        .orderBy(desc(providerKeys.createdAt));

      return rows.map(({ key, secret }) => ({
        id: key.id,
        companyId: key.companyId,
        name: key.name,
        provider: key.provider,
        status: key.status,
        baseUrlOpenai: key.baseUrlOpenai,
        baseUrlAnthropic: key.baseUrlAnthropic,
        secretId: key.secretId,
        lastTestedAt: key.lastTestedAt?.toISOString() ?? null,
        lastTestOk: key.lastTestOk,
        createdAt: key.createdAt.toISOString(),
        updatedAt: key.updatedAt.toISOString(),
        keyPrefix: secret?.latestVersion && secret.latestVersion > 0
          ? maskApiKey(secret.name)
          : null,
      }));
    },

    getById: async (id: string, companyId: string): Promise<ProviderKeyWithSecret | null> => {
      const row = await db
        .select({
          key: providerKeys,
          secret: companySecrets,
        })
        .from(providerKeys)
        .leftJoin(companySecrets, eq(providerKeys.secretId, companySecrets.id))
        .where(and(eq(providerKeys.id, id), eq(providerKeys.companyId, companyId)))
        .then((rows) => rows[0] ?? null);

      if (!row) return null;
      const { key, secret } = row;
      return {
        id: key.id,
        companyId: key.companyId,
        name: key.name,
        provider: key.provider,
        status: key.status,
        baseUrlOpenai: key.baseUrlOpenai,
        baseUrlAnthropic: key.baseUrlAnthropic,
        secretId: key.secretId,
        lastTestedAt: key.lastTestedAt?.toISOString() ?? null,
        lastTestOk: key.lastTestOk,
        createdAt: key.createdAt.toISOString(),
        updatedAt: key.updatedAt.toISOString(),
        keyPrefix: secret?.latestVersion && secret.latestVersion > 0
          ? maskApiKey(secret.name)
          : null,
      };
    },

    create: async (
      companyId: string,
      input: CreateProviderKeyRequest,
      secretSvc: { create: (companyId: string, opts: { name: string; provider: string; value: string; description?: string }, actor?: { userId?: string | null; agentId?: string | null }) => Promise<{ id: string }> },
      actor?: { userId?: string | null; agentId?: string | null },
    ): Promise<ProviderKeyWithSecret> => {
      const name = `${input.provider}:${input.name}`;
      const secret = await secretSvc.create(
        companyId,
        {
          name,
          provider: "local_encrypted",
          value: input.value,
          description: `API key for ${input.provider} provider (key pool)`,
        },
        actor,
      );

      const [key] = await db
        .insert(providerKeys)
        .values({
          companyId,
          name: input.name,
          provider: input.provider,
          baseUrlOpenai: input.baseUrlOpenai ?? null,
          baseUrlAnthropic: input.baseUrlAnthropic ?? null,
          secretId: secret.id,
        })
        .returning();

      return {
        id: key.id,
        companyId: key.companyId,
        name: key.name,
        provider: key.provider,
        status: key.status,
        baseUrlOpenai: key.baseUrlOpenai,
        baseUrlAnthropic: key.baseUrlAnthropic,
        secretId: key.secretId,
        lastTestedAt: null,
        lastTestOk: null,
        createdAt: key.createdAt.toISOString(),
        updatedAt: key.updatedAt.toISOString(),
        keyPrefix: maskApiKey(input.value),
      };
    },

    update: async (
      id: string,
      companyId: string,
      input: UpdateProviderKeyRequest,
    ): Promise<ProviderKeyWithSecret> => {
      const existing = await db
        .select()
        .from(providerKeys)
        .where(and(eq(providerKeys.id, id), eq(providerKeys.companyId, companyId)))
        .then((rows) => rows[0] ?? null);
      if (!existing) throw notFound("Provider key not found");

      const [updated] = await db
        .update(providerKeys)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.baseUrlOpenai !== undefined ? { baseUrlOpenai: input.baseUrlOpenai } : {}),
          ...(input.baseUrlAnthropic !== undefined ? { baseUrlAnthropic: input.baseUrlAnthropic } : {}),
          updatedAt: new Date(),
        })
        .where(eq(providerKeys.id, id))
        .returning();

      return {
        id: updated.id,
        companyId: updated.companyId,
        name: updated.name,
        provider: updated.provider,
        status: updated.status,
        baseUrlOpenai: updated.baseUrlOpenai,
        baseUrlAnthropic: updated.baseUrlAnthropic,
        secretId: updated.secretId,
        lastTestedAt: updated.lastTestedAt?.toISOString() ?? null,
        lastTestOk: updated.lastTestOk,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        keyPrefix: null,
      };
    },

    remove: async (id: string, companyId: string): Promise<void> => {
      const existing = await db
        .select()
        .from(providerKeys)
        .where(and(eq(providerKeys.id, id), eq(providerKeys.companyId, companyId)))
        .then((rows) => rows[0] ?? null);
      if (!existing) throw notFound("Provider key not found");

      await db.delete(providerKeys).where(eq(providerKeys.id, id));
    },
  };
}
