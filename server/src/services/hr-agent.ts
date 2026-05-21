import { eq, and, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agents } from "@paperclipai/db/schema/agents";
import { apiKeys } from "@paperclipai/db/schema/api_keys";

export class HRAgentService {
  constructor(private db: Db) {}

  async analyzeProject(description: string) {
    // For now, use keyword-based analysis (LLM integration planned for later)
    const techKeywords = {
      frontend: ["react", "vue", "angular", "ui", "frontend", "web", "css", "html", "javascript", "typescript"],
      backend: ["node", "python", "go", "rust", "java", "api", "backend", "server", "database", "sql"],
      design: ["design", "ui/ux", "figma", "mockup", "prototype", "layout"],
      data: ["data", "analysis", "ml", "ai", "machine learning", "analytics", "report"],
      mobile: ["mobile", "ios", "android", "react native", "flutter", "app"],
      devops: ["devops", "deploy", "ci/cd", "docker", "kubernetes", "cloud"],
    };

    const lowerDesc = description.toLowerCase();
    const detectedSkills: string[] = [];

    for (const [skill, keywords] of Object.entries(techKeywords)) {
      if (keywords.some(k => lowerDesc.includes(k))) {
        detectedSkills.push(skill);
      }
    }

    if (detectedSkills.length === 0) {
      detectedSkills.push("general");
    }

    const wordCount = description.split(/\s+/).length;
    const complexity = wordCount > 100 ? "high" : wordCount > 50 ? "medium" : "low";
    const teamSize = detectedSkills.length > 3 ? 4 : detectedSkills.length > 1 ? 3 : 2;

    return {
      projectType: this.inferProjectType(lowerDesc, detectedSkills),
      techStack: this.inferTechStack(lowerDesc),
      complexity,
      requiredSkills: detectedSkills,
      suggestedTeamSize: teamSize,
    };
  }

  async recommendTeam(companyId: string, requiredSkills: string[]) {
    // Find available agents that match required skills
    const availableAgents = await this.db.select().from(agents).where(
      and(
        eq(agents.companyId, companyId),
        eq(agents.status, "idle"),
        sql`${agents.currentTasks} < ${agents.maxConcurrency}`,
      ),
    );

    // Score agents by skill match
    const scoredAgents = availableAgents.map(agent => {
      const agentTags = (agent.tags as string[]) ?? [];
      const matchedSkills = agentTags.filter(t => requiredSkills.includes(t));
      return { agent, score: matchedSkills.length, matchedSkills };
    });

    scoredAgents.sort((a, b) => b.score - a.score);

    // Pick top agents up to suggested team size
    const teamSize = Math.min(requiredSkills.length + 1, scoredAgents.length);
    const selected = scoredAgents.slice(0, teamSize);

    const team = selected.map(s => ({
      agentId: s.agent.id,
      name: s.agent.name,
      role: s.agent.role,
      reason: s.matchedSkills.length > 0
        ? `Skills match: ${s.matchedSkills.join(", ")}`
        : "General availability",
    }));

    // Estimate cost (simple heuristic: $0.10 per agent per task)
    const estimatedCostCents = team.length * 10 * (requiredSkills.length > 3 ? 3 : requiredSkills.length);
    const riskLevel = team.length < requiredSkills.length ? "medium" : "low";

    return {
      team,
      estimatedCostCents,
      riskLevel,
      recommendationNote: `Selected ${team.length} agents matching ${requiredSkills.length} required skill areas`,
    };
  }

  async estimateCost(teamSize: number, complexity: string) {
    const thresholdCents = 500; // $5 default threshold
    const baseCost = teamSize * 50;
    const complexityMultiplier = complexity === "high" ? 3 : complexity === "medium" ? 2 : 1;
    const estimatedCents = baseCost * complexityMultiplier;

    return {
      estimatedCents,
      needsConfirmation: estimatedCents > thresholdCents,
      thresholdCents,
    };
  }

  private inferProjectType(description: string, skills: string[]): string {
    if (skills.includes("mobile")) return "mobile_development";
    if (skills.includes("frontend") || skills.includes("backend")) return "web_development";
    if (skills.includes("data") || skills.includes("ml")) return "data_analysis";
    if (skills.includes("design")) return "design";
    if (skills.includes("devops")) return "infrastructure";
    return "general";
  }

  private inferTechStack(description: string): string[] {
    const techs = ["react", "vue", "angular", "node.js", "python", "go", "rust", "docker", "postgresql", "mongodb", "redis", "aws", "gcp", "azure"];
    return techs.filter(t => description.includes(t));
  }
}
