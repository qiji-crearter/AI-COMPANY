import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { createProviderKeySchema, updateProviderKeySchema } from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { assertBoard, assertCompanyAccess } from "./authz.js";
import { logActivity, secretService } from "../services/index.js";
import { providerKeyService } from "../services/provider-keys.js";

export function providerKeyRoutes(db: Db) {
  const router = Router();
  const svc = providerKeyService(db);
  const secretsSvc = secretService(db);

  router.get("/companies/:companyId/provider-keys", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const result = await svc.list(companyId);
    res.json(result);
  });

  router.get("/companies/:companyId/provider-keys/:id", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const key = await svc.getById(req.params.id as string, companyId);
    if (!key) {
      res.status(404).json({ error: "Provider key not found" });
      return;
    }
    res.json(key);
  });

  router.post("/companies/:companyId/provider-keys", validate(createProviderKeySchema), async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const created = await svc.create(
      companyId,
      req.body,
      secretsSvc,
      { userId: req.actor.userId ?? "board", agentId: null },
    );

    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: "provider_key.created",
      entityType: "provider_key",
      entityId: created.id,
      details: { name: created.name, provider: created.provider },
    });

    res.status(201).json(created);
  });

  router.patch("/companies/:companyId/provider-keys/:id", validate(updateProviderKeySchema), async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const updated = await svc.update(req.params.id as string, companyId, req.body);

    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: "provider_key.updated",
      entityType: "provider_key",
      entityId: updated.id,
      details: { name: updated.name },
    });

    res.json(updated);
  });

  router.delete("/companies/:companyId/provider-keys/:id", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    await svc.remove(req.params.id as string, companyId);

    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: "provider_key.deleted",
      entityType: "provider_key",
      entityId: req.params.id as string,
      details: {},
    });

    res.status(204).end();
  });

  return router;
}
