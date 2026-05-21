import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { AgentPoolService } from "../services/agent-pool.js";
import { assertCompanyAccess } from "./authz.js";

export function agentPoolRoutes(db: Db) {
  const router = Router();
  const svc = new AgentPoolService(db);

  router.get("/companies/:companyId/pool/agents", async (req, res) => {
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    const agents = await svc.list(companyId);
    res.json(agents);
  });

  router.get("/companies/:companyId/pool/agents/:id", async (req, res) => {
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    const agent = await svc.getById(req.params.id);
    if (!agent) return res.status(404).json({ error: "Not found" });
    res.json(agent);
  });

  router.post("/companies/:companyId/pool/agents", async (req, res) => {
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    const agent = await svc.create({ ...req.body, companyId });
    res.status(201).json(agent);
  });

  router.put("/companies/:companyId/pool/agents/:id", async (req, res) => {
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    const agent = await svc.update(req.params.id, req.body);
    if (!agent) return res.status(404).json({ error: "Not found" });
    res.json(agent);
  });

  router.delete("/companies/:companyId/pool/agents/:id", async (req, res) => {
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    await svc.delete(req.params.id);
    res.status(204).end();
  });

  return router;
}
