import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { createPoolAgentSchema, updatePoolAgentSchema } from "@paperclipai/shared";
import { AgentPoolService } from "../services/agent-pool.js";
import { assertBoard, assertCompanyAccess } from "./authz.js";
import { validate } from "../middleware/validate.js";
import { logActivity } from "../services/index.js";

export function agentPoolRoutes(db: Db) {
  const router = Router();
  const svc = new AgentPoolService(db);

  router.get("/companies/:companyId/pool/agents", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const agents = await svc.list(companyId);
    res.json(agents);
  });

  router.get("/companies/:companyId/pool/agents/:id", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const agent = await svc.getById(req.params.id as string);
    if (!agent) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(agent);
  });

  router.post("/companies/:companyId/pool/agents", validate(createPoolAgentSchema), async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const agent = await svc.create({ ...req.body, companyId });

    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: "pool_agent.created",
      entityType: "pool_agent",
      entityId: agent.id,
      details: { name: agent.name, role: agent.role },
    });

    res.status(201).json(agent);
  });

  router.put("/companies/:companyId/pool/agents/:id", validate(updatePoolAgentSchema), async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const agent = await svc.update(req.params.id as string, req.body);
    if (!agent) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: "pool_agent.updated",
      entityType: "pool_agent",
      entityId: agent.id,
      details: { name: agent.name },
    });

    res.json(agent);
  });

  router.delete("/companies/:companyId/pool/agents/:id", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    await svc.delete(req.params.id as string);

    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: "pool_agent.deleted",
      entityType: "pool_agent",
      entityId: req.params.id as string,
      details: {},
    });

    res.status(204).end();
  });

  return router;
}
