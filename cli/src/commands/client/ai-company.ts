import { Command } from "commander";
import * as p from "@clack/prompts";
import pc from "picocolors";

const API_BASE = "http://localhost:3100/api";

async function apiRequest(method: string, path: string, body?: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function registerAiCompanyCommands(program: Command) {
  const ai = program.command("ai-company")
    .description("AI Company 框架管理命令");

  // ── key ──
  const keyCmd = ai.command("key").description("管理 API Key 池");

  keyCmd.command("list")
    .option("--company <id>", "Company ID")
    .action(async (opts) => {
      const companyId = opts.company || "default";
      try {
        const keys = await apiRequest("GET", `/companies/${companyId}/keys`);
        if (keys.length === 0) {
          console.log(pc.yellow("暂无 API Key"));
          return;
        }
        console.log(pc.bold("\n已配置的 API Key:"));
        for (const k of keys) {
          console.log(`  ${pc.green(k.id?.slice(0, 8))}  ${k.provider}/${k.model}  ${k.name}  ${k.isActive ? pc.green("✓") : pc.red("✗")}`);
        }
      } catch (err) {
        console.error(pc.red(`Error: ${err instanceof Error ? err.message : "Unknown"}`));
      }
    });

  keyCmd.command("add")
    .argument("<provider>", "模型供应商 (openai/anthropic/google)")
    .requiredOption("--key <key>", "API Key")
    .option("--model <model>", "模型名称")
    .option("--name <name>", "Key 名称")
    .option("--company <id>", "Company ID")
    .action(async (provider, opts) => {
      const companyId = opts.company || "default";
      const model = opts.model || (await p.text({ message: "输入模型名称", defaultValue: "" }).then(r => { if (p.isCancel(r)) process.exit(0); return r; }));
      const name = opts.name || (await p.text({ message: "输入 Key 名称", defaultValue: provider }).then(r => { if (p.isCancel(r)) process.exit(0); return r; }));
      try {
        const result = await apiRequest("POST", `/companies/${companyId}/keys`, {
          name, provider, keyValue: opts.key, model, capabilities: [model],
        });
        console.log(pc.green(`✓ Key 添加成功: ${result.id?.slice(0, 8)}`));
      } catch (err) {
        console.error(pc.red(`Error: ${err instanceof Error ? err.message : "Unknown"}`));
      }
    });

  keyCmd.command("delete <id>")
    .option("--company <id>", "Company ID")
    .action(async (id, opts) => {
      const companyId = opts.company || "default";
      try {
        await apiRequest("DELETE", `/companies/${companyId}/keys/${id}`);
        console.log(pc.green(`✓ Key ${id.slice(0, 8)} 已删除`));
      } catch (err) {
        console.error(pc.red(`Error: ${err instanceof Error ? err.message : "Unknown"}`));
      }
    });

  keyCmd.command("test <id>")
    .option("--company <id>", "Company ID")
    .action(async (id, opts) => {
      const companyId = opts.company || "default";
      console.log(pc.blue(`测试 Key ${id.slice(0, 8)}...`));
      try {
        const result = await apiRequest("POST", `/companies/${companyId}/keys/${id}/test`);
        if (result.success) {
          console.log(pc.green(`✓ ${result.message}`));
        } else {
          console.log(pc.red(`✗ ${result.message}`));
        }
      } catch (err) {
        console.error(pc.red(`Error: ${err instanceof Error ? err.message : "Unknown"}`));
      }
    });

  // ── agent ──
  const agentCmd = ai.command("agent").description("管理 AI 员工");

  agentCmd.command("list")
    .option("--company <id>", "Company ID")
    .action(async (opts) => {
      const companyId = opts.company || "default";
      try {
        const agents = await apiRequest("GET", `/companies/${companyId}/pool/agents`);
        if (agents.length === 0) {
          console.log(pc.yellow("暂无 AI 员工"));
          return;
        }
        console.log(pc.bold("\nAI 员工列表:"));
        for (const a of agents) {
          const tags = (a.tags || []).join(", ");
          console.log(`  ${pc.green(a.name)}  ${a.role}  [${tags}]  ${a.status}`);
        }
      } catch (err) {
        console.error(pc.red(`Error: ${err instanceof Error ? err.message : "Unknown"}`));
      }
    });

  agentCmd.command("create")
    .argument("<name>", "员工名称")
    .option("--role <role>", "角色")
    .option("--tags <tags>", "能力标签 (逗号分隔)")
    .option("--model-binding <id>", "绑定模型 Key ID")
    .option("--company <id>", "Company ID")
    .action(async (name, opts) => {
      const companyId = opts.company || "default";
      const tags = opts.tags ? opts.tags.split(",").map((t: string) => t.trim()) : [];
      const role = opts.role || (await p.text({ message: "输入角色", defaultValue: "general" }).then(r => { if (p.isCancel(r)) process.exit(0); return r; }));
      try {
        const result = await apiRequest("POST", `/companies/${companyId}/pool/agents`, {
          name, role, tags, modelBinding: opts.modelBinding,
          adapterType: "process",
        });
        console.log(pc.green(`✓ 员工 ${result.name} 创建成功 (ID: ${result.id?.slice(0, 8)})`));
      } catch (err) {
        console.error(pc.red(`Error: ${err instanceof Error ? err.message : "Unknown"}`));
      }
    });

  agentCmd.command("delete <id>")
    .option("--company <id>", "Company ID")
    .action(async (id, opts) => {
      const companyId = opts.company || "default";
      try {
        await apiRequest("DELETE", `/companies/${companyId}/pool/agents/${id}`);
        console.log(pc.green(`✓ 员工 ${id.slice(0, 8)} 已解雇`));
      } catch (err) {
        console.error(pc.red(`Error: ${err instanceof Error ? err.message : "Unknown"}`));
      }
    });

  // ── project ──
  const projectCmd = ai.command("project").description("管理项目");

  projectCmd.command("new")
    .argument("<description>", "项目描述")
    .option("--mode <mode>", "模式 (auto/confirm)", "auto")
    .option("--company <id>", "Company ID")
    .action(async (description, opts) => {
      const companyId = opts.company || "default";
      console.log(pc.blue("分析项目需求..."));
      try {
        // Step 1: HR analysis
        const hrResult = await apiRequest("POST", `/companies/${companyId}/hr/analyze`, { description });
        console.log(pc.cyan(`\n项目类型: ${hrResult.analysis.projectType}`));
        console.log(pc.cyan(`所需技能: ${hrResult.analysis.requiredSkills.join(", ")}`));
        console.log(pc.cyan(`建议团队: ${hrResult.analysis.suggestedTeamSize} 人`));
        console.log(pc.cyan(`预估成本: $${(hrResult.cost.estimatedCents / 100).toFixed(2)}`));

        if (hrResult.needsConfirmation && opts.mode !== "auto") {
          console.log(pc.yellow(`\n⚠ 预估成本超过阈值 ($${(hrResult.cost.thresholdCents / 100).toFixed(2)})`));
          const confirm = await p.confirm({ message: "是否继续?" });
          if (p.isCancel(confirm) || !confirm) {
            console.log(pc.yellow("项目已取消"));
            return;
          }
        }

        const recommendedAgents = hrResult.recommendation.team.map((t: any) => t.agentId);
        // Step 2: Create project
        const project = await apiRequest("POST", `/companies/${companyId}/workspace/projects`, {
          name: hrResult.analysis.projectType,
          description,
          teamAgentIds: recommendedAgents,
        });
        console.log(pc.green(`\n✓ 项目创建成功!`));
        console.log(`  ID: ${project.projectId?.slice(0, 8)}`);
        console.log(`  团队成员: ${project.team.map((t: any) => t.name).join(", ")}`);
      } catch (err) {
        console.error(pc.red(`Error: ${err instanceof Error ? err.message : "Unknown"}`));
      }
    });

  projectCmd.command("list")
    .option("--company <id>", "Company ID")
    .action(async (opts) => {
      const companyId = opts.company || "default";
      try {
        const projects = await apiRequest("GET", `/companies/${companyId}/workspace/projects`);
        if (projects.length === 0) {
          console.log(pc.yellow("暂无项目"));
          return;
        }
        console.log(pc.bold("\n项目列表:"));
        for (const p of projects) {
          console.log(`  ${pc.green(p.id?.slice(0, 8))}  ${p.name}  [${p.status}]`);
        }
      } catch (err) {
        console.error(pc.red(`Error: ${err instanceof Error ? err.message : "Unknown"}`));
      }
    });

  projectCmd.command("status <id>")
    .option("--company <id>", "Company ID")
    .action(async (id, opts) => {
      const companyId = opts.company || "default";
      try {
        const status = await apiRequest("GET", `/companies/${companyId}/workspace/projects/${id}`);
        if (!status) {
          console.log(pc.red("项目未找到"));
          return;
        }
        console.log(pc.bold(`\n项目: ${status.project.name}`));
        console.log(`  状态: ${status.project.status}`);
        console.log(`  整体进度: ${status.overallProgress}%`);
        console.log(pc.bold(`\n团队成员:`));
        for (const m of status.team) {
          console.log(`  ${pc.green(m.agent?.name || m.agentId?.slice(0, 8))}  ${m.taskStatus}  ${m.taskProgress}%  ${m.taskDescription || ""}`);
        }
        console.log(pc.bold(`\n文档版本: ${status.documents?.[0]?.version || 0}`));
      } catch (err) {
        console.error(pc.red(`Error: ${err instanceof Error ? err.message : "Unknown"}`));
      }
    });

  // ── config ──
  ai.command("config")
    .command("show")
    .action(() => {
      console.log(pc.blue("\nAI Company 配置:"));
      console.log("  API 地址: http://localhost:3100");
      console.log("  配置管理功能开发中 - 请使用 Dashboard 管理");
    });

  // ── dashboard ──
  ai.command("dashboard")
    .command("open")
    .action(() => {
      console.log(pc.green("打开 Dashboard: http://localhost:3100"));
    });

  return ai;
}
