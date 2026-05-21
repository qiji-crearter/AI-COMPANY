import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { HRAgentService } from "../services/hr-agent.js";
import { assertCompanyAccess } from "./authz.js";

export function hrAgentRoutes(db: Db) {
  const router = Router();
  const svc = new HRAgentService(db);

  router.post("/companies/:companyId/hr/analyze", async (req, res) => {
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);

    const { description } = req.body;
    if (!description) return res.status(400).json({ error: "Project description required" });

    const analysis = await svc.analyzeProject(description);
    const recommendation = await svc.recommendTeam(companyId, analysis.requiredSkills);
    const cost = await svc.estimateCost(analysis.suggestedTeamSize, analysis.complexity);

    res.json({
      analysis,
      recommendation,
      cost,
      needsConfirmation: cost.needsConfirmation,
    });
  });

  return router;
}
