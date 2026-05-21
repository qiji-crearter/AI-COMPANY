import { eq, and, desc, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { projects } from "@paperclipai/db/schema/projects";
import { agents } from "@paperclipai/db/schema/agents";
import { projectDocuments } from "@paperclipai/db/schema/project_documents";
import { projectTeamMembers } from "@paperclipai/db/schema/project_team_members";

export class ProjectWorkspaceService {
  constructor(private db: Db) {}

  async createProject(data: {
    companyId: string;
    name: string;
    description: string;
    teamAgentIds: string[];
  }) {
    const [project] = await this.db.insert(projects).values({
      companyId: data.companyId,
      name: data.name,
      description: data.description,
      status: "active",
    }).returning();

    const team = [];
    for (const agentId of data.teamAgentIds) {
      const [agent] = await this.db.select().from(agents).where(eq(agents.id, agentId));
      if (!agent) continue;

      await this.db.insert(projectTeamMembers).values({
        projectId: project.id,
        agentId,
        role: agent.role,
        taskStatus: "idle",
      });

      team.push({ agentId: agent.id, name: agent.name, role: agent.role });
    }

    // Create initial project document
    await this.db.insert(projectDocuments).values({
      projectId: project.id,
      title: "Project Init",
      content: `# ${data.name}\n\n${data.description}\n\n## Team\n${team.map((t: { name: string; role: string }) => `- ${t.name} (${t.role})`).join("\n")}\n\n## Status\nStarted: ${new Date().toISOString()}`,
      version: 1,
    });

    return { projectId: project.id, team };
  }

  /**
   * Agent wakes up, reads latest doc, starts working.
   * This follows the "clean context" pattern:
   * fresh session → read doc → work → write doc → self-destruct
   */
  async agentStartSession(projectId: string, agentId: string, taskDescription: string) {
    // Get latest project document (agent reads this to understand context)
    const [latestDoc] = await this.db.select()
      .from(projectDocuments)
      .where(eq(projectDocuments.projectId, projectId))
      .orderBy(desc(projectDocuments.version))
      .limit(1);

    // Update agent state
    await this.db.update(agents).set({
      currentTasks: sql`${agents.currentTasks} + 1`,
      status: "working",
    }).where(eq(agents.id, agentId));

    // Update team member state
    await this.db.update(projectTeamMembers)
      .set({
        taskStatus: "working",
        taskDescription,
        sessionCount: sql`${projectTeamMembers.sessionCount} + 1`,
        lastSessionAt: new Date(),
      })
      .where(and(
        eq(projectTeamMembers.projectId, projectId),
        eq(projectTeamMembers.agentId, agentId),
      ));

    return {
      sessionContext: {
        projectId,
        latestDoc: latestDoc ? { title: latestDoc.title, content: latestDoc.content } : null,
      },
    };
  }

  /**
   * Agent completes task: writes doc, then "self-destructs" (clears session).
   * This keeps context clean - next session starts fresh by reading the latest doc.
   */
  async agentCompleteTask(projectId: string, agentId: string, docTitle: string, docContent: string, taskProgress: number) {
    // Get latest version
    const [latestDoc] = await this.db.select()
      .from(projectDocuments)
      .where(eq(projectDocuments.projectId, projectId))
      .orderBy(desc(projectDocuments.version))
      .limit(1);

    // Write new document version (this is what the next session will read)
    await this.db.insert(projectDocuments).values({
      projectId,
      agentId,
      title: docTitle,
      content: docContent,
      version: (latestDoc?.version ?? 0) + 1,
    });

    // Mark team member as completed
    await this.db.update(projectTeamMembers)
      .set({
        taskStatus: taskProgress >= 100 ? "completed" : "idle",
        taskProgress,
        lastSessionAt: new Date(),
      })
      .where(and(
        eq(projectTeamMembers.projectId, projectId),
        eq(projectTeamMembers.agentId, agentId),
      ));

    // Agent "self-destructs": release session, go back to idle
    await this.db.update(agents).set({
      currentTasks: sql`GREATEST(${agents.currentTasks} - 1, 0)`,
      status: sql`CASE WHEN ${agents.currentTasks} - 1 <= 0 THEN 'idle' ELSE 'working' END`,
      lastTaskCompletedAt: new Date(),
    }).where(eq(agents.id, agentId));
  }

  async getProjectStatus(projectId: string) {
    const [project] = await this.db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) return null;

    const team = await this.db.select()
      .from(projectTeamMembers)
      .where(eq(projectTeamMembers.projectId, projectId));

    const docs = await this.db.select()
      .from(projectDocuments)
      .where(eq(projectDocuments.projectId, projectId))
      .orderBy(desc(projectDocuments.version));

    // Enrich team with agent details
    const enrichedTeam = await Promise.all(team.map(async (member) => {
      const [agent] = await this.db.select({
        name: agents.name,
        role: agents.role,
        tags: agents.tags,
        modelBinding: agents.modelBinding,
        status: agents.status,
      }).from(agents).where(eq(agents.id, member.agentId));
      return { ...member, agent };
    }));

    const overallProgress = enrichedTeam.length > 0
      ? Math.round(enrichedTeam.reduce((sum, m) => sum + m.taskProgress, 0) / enrichedTeam.length)
      : 0;

    return {
      project,
      team: enrichedTeam,
      documents: docs,
      overallProgress,
    };
  }

  async listProjects(companyId: string) {
    return this.db.select().from(projects).where(eq(projects.companyId, companyId));
  }
}
