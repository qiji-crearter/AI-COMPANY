import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { ProjectWorkspaceService } from "../services/project-workspace.js";
import { assertCompanyAccess } from "./authz.js";

export function projectWorkspaceRoutes(db: Db) {
  const router = Router();
  const svc = new ProjectWorkspaceService(db);

  // Create project
  router.post("/companies/:companyId/workspace/projects", async (req, res) => {
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    const result = await svc.createProject({ ...req.body, companyId });
    res.status(201).json(result);
  });

  // List projects
  router.get("/companies/:companyId/workspace/projects", async (req, res) => {
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    const projects = await svc.listProjects(companyId);
    res.json(projects);
  });

  // Get project status with full team details
  router.get("/companies/:companyId/workspace/projects/:id", async (req, res) => {
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    const status = await svc.getProjectStatus(req.params.id);
    if (!status) return res.status(404).json({ error: "Project not found" });
    res.json(status);
  });

  // Agent starts a session (reads doc, begins work)
  router.post("/companies/:companyId/workspace/projects/:id/sessions/start", async (req, res) => {
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    const { agentId, taskDescription } = req.body;
    const session = await svc.agentStartSession(req.params.id, agentId, taskDescription);
    res.json(session);
  });

  // Agent completes task (writes doc + self-destructs)
  router.post("/companies/:companyId/workspace/projects/:id/sessions/complete", async (req, res) => {
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);
    const { agentId, docTitle, docContent, taskProgress } = req.body;
    await svc.agentCompleteTask(req.params.id, agentId, docTitle, docContent, taskProgress ?? 100);
    res.json({ success: true });
  });

  return router;
}
