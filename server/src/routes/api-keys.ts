import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { ApiKeyService } from "../services/api-keys.js";
import { assertCompanyAccess } from "./authz.js";

export function apiKeyRoutes(db: Db) {
  const router = Router();
  const svc = new ApiKeyService(db);

  router.get("/companies/:companyId/keys", async (req, res) => {
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    const keys = await svc.list(companyId);
    // Mask key values for security
    const masked = keys.map(k => ({ ...k, keyValue: k.keyValue ? `****${k.keyValue.slice(-4)}` : null }));
    res.json(masked);
  });

  router.get("/companies/:companyId/keys/:id", async (req, res) => {
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    const key = await svc.getById(req.params.id);
    if (!key) return res.status(404).json({ error: "Not found" });
    key.keyValue = `****${key.keyValue.slice(-4)}`;
    res.json(key);
  });

  router.post("/companies/:companyId/keys", async (req, res) => {
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    const key = await svc.create({ ...req.body, companyId });
    res.status(201).json({ id: key.id, name: key.name, provider: key.provider, model: key.model });
  });

  router.put("/companies/:companyId/keys/:id", async (req, res) => {
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    const key = await svc.update(req.params.id, req.body);
    if (!key) return res.status(404).json({ error: "Not found" });
    res.json(key);
  });

  router.delete("/companies/:companyId/keys/:id", async (req, res) => {
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    await svc.delete(req.params.id);
    res.status(204).end();
  });

  router.post("/companies/:companyId/keys/:id/test", async (req, res) => {
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    const result = await svc.test(req.params.id);
    res.json(result);
  });

  return router;
}
