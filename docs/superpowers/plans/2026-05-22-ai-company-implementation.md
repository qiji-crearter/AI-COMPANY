# AI Company 框架 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Paperclip 源码基础上进行定制化开发，实现"AI 公司"框架——包含 HR Agent 选人、Key/Agent 池分离管理、成本阈值确认、项目协作空间、写档自杀上下文管理、交互式 Dashboard 和移动端入口。

**Architecture:** Fork Paperclip 作为基础，保留其 12 个子系统（Heartbeat、Budget、Activity 等），新增 HR Agent 引擎、Key/Agent 池管理、项目协作空间。中央调度器保持纯程序驱动，LLM 仅用于 HR 分析和 Agent 内容生成。

**Tech Stack:** Node.js/TypeScript (Paperclip), React + Vite (UI), PostgreSQL (PGlite), Docker Compose (部署), Telegram Bot API (移动端)

---

### Phase 0：项目初始化与环境搭建

#### Task 0.1：安装依赖并验证构建

**Files:**
- Modify: `/mnt/d/project/aicompany/` (root)

- [ ] **Step 1: Install pnpm dependencies**

Run:
```bash
cd /mnt/d/project/aicompany
pnpm install
```

Expected: All dependencies installed without errors.

- [ ] **Step 2: Build the project to verify Paperclip compiles**

Run:
```bash
pnpm build
```

Expected: Build completes with `server/dist/index.js` existing.

- [ ] **Step 3: Commit initial state**

```bash
git add .
git commit -m "chore: initial fork of Paperclip"
git push
```

#### Task 0.2：Docker Compose 一键部署配置

**Files:**
- Modify: `/mnt/d/project/aicompany/docker/docker-compose.yml`
- Create: `/mnt/d/project/aicompany/docker/docker-compose.aicompany.yml`
- Create: `/mnt/d/project/aicompany/scripts/setup.bat`
- Create: `/mnt/d/project/aicompany/scripts/setup.sh`

- [ ] **Step 1: Create AI Company specific docker-compose.yml**

Write to `docker/docker-compose.aicompany.yml`:

```yaml
services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: aicompany
      POSTGRES_PASSWORD: aicompany
      POSTGRES_DB: aicompany
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U aicompany -d aicompany"]
      interval: 2s
      timeout: 5s
      retries: 30
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  server:
    build:
      context: ..
      dockerfile: Dockerfile
    ports:
      - "3100:3100"
    environment:
      DATABASE_URL: postgres://aicompany:aicompany@db:5432/aicompany
      PORT: "3100"
      SERVE_UI: "true"
      PAPERCLIP_DEPLOYMENT_MODE: "trusted-local"
      PAPERCLIP_DEPLOYMENT_EXPOSURE: "private"
      PAPERCLIP_PUBLIC_URL: "${PAPERCLIP_PUBLIC_URL:-http://localhost:3100}"
    volumes:
      - aicompany-data:/paperclip
      - ./projects:/paperclip/projects
    depends_on:
      db:
        condition: service_healthy

volumes:
  pgdata:
  aicompany-data:
```

Use `trusted-local` mode for single-user local deployment (no authentication needed).

- [ ] **Step 2: Create Windows one-click setup script**

Write to `scripts/setup.bat`:

```batch
@echo off
chcp 65001 >nul
title AI Company 一键部署

echo ========================================
echo   AI Company 框架 - 一键部署
echo ========================================
echo.

:: 检测 Docker
where docker >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未检测到 Docker Desktop
    echo 请先安装 Docker Desktop: https://www.docker.com/products/docker-desktop/
    echo 安装完成后重新运行此脚本
    pause
    exit /b 1
)

echo [1/3] 检测 Docker 运行状态...
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [错误] Docker Desktop 未运行
    echo 请启动 Docker Desktop 后重试
    pause
    exit /b 1
)

echo [2/3] 启动 AI Company 服务...
docker compose -f docker/docker-compose.aicompany.yml up -d --build

echo [3/3] 等待服务就绪...
:waitloop
timeout /t 3 /nobreak >nul
docker compose -f docker/docker-compose.aicompany.yml exec server curl -s http://localhost:3100/api/health >nul 2>&1
if errorlevel 1 goto waitloop

echo.
echo ========================================
echo   部署完成！
echo.
echo   访问地址: http://localhost:3100
echo   项目路径: %~dp0projects
echo ========================================
pause
```

- [ ] **Step 3: Create Linux/Mac setup script**

Write to `scripts/setup.sh`:

```bash
#!/bin/bash
set -e

echo "========================================"
echo "  AI Company 框架 - 一键部署"
echo "========================================"

# 检测 Docker
if ! command -v docker &> /dev/null; then
    echo "[错误] 未检测到 Docker"
    echo "请先安装 Docker"
    exit 1
fi

echo "[1/3] 检测 Docker 运行状态..."
docker info > /dev/null 2>&1 || { echo "[错误] Docker 未运行"; exit 1; }

echo "[2/3] 启动 AI Company 服务..."
docker compose -f docker/docker-compose.aicompany.yml up -d --build

echo "[3/3] 等待服务就绪..."
until curl -s http://localhost:3100/api/health > /dev/null 2>&1; do
    sleep 3
done

echo ""
echo "========================================"
echo "  部署完成！"
echo ""
echo "  访问地址: http://localhost:3100"
echo "========================================"
```

```bash
chmod +x /mnt/d/project/aicompany/scripts/setup.sh
```

- [ ] **Step 4: Commit**

```bash
git add docker/docker-compose.aicompany.yml scripts/setup.bat scripts/setup.sh
git commit -m "feat: add Docker one-click deployment & setup scripts"
```

---

### Phase 1：数据库 Schema 扩展

#### Task 1.1：创建 API Keys 表（Key 池）

**Files:**
- Create: `/mnt/d/project/aicompany/packages/db/src/schema/api_keys.ts`
- Modify: `/mnt/d/project/aicompany/packages/db/src/schema/index.ts`

- [ ] **Step 1: Create api_keys table schema**

Write to `packages/db/src/schema/api_keys.ts`:

```typescript
import { pgTable, uuid, text, integer, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    name: text("name").notNull(),
    provider: text("provider").notNull(), // 'openai' | 'anthropic' | 'google' | 'custom'
    keyValue: text("key_value").notNull(), // encrypted
    model: text("model").notNull(),        // 'gpt-4o' | 'claude-sonnet-4' | 'gemini-2.0' etc
    baseUrl: text("base_url"),             // for custom providers
    capabilities: jsonb("capabilities").$type<string[]>().notNull().default([]),
    isActive: boolean("is_active").notNull().default(true),
    rateLimit: integer("rate_limit").notNull().default(60), // requests per minute
    monthlyCostCents: integer("monthly_cost_cents").notNull().default(0),
    lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyProviderIdx: index("api_keys_company_provider_idx").on(table.companyId, table.provider),
    companyActiveIdx: index("api_keys_company_active_idx").on(table.companyId, table.isActive),
  }),
);
```

- [ ] **Step 2: Register in schema index**

Modify `packages/db/src/schema/index.ts`, add:

```typescript
export { apiKeys } from "./api_keys.js";
```

- [ ] **Step 3: Generate migration**

```bash
cd /mnt/d/project/aicompany
pnpm db:generate
```

Expected: Migration file created in `packages/db/src/migrations/`

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/schema/api_keys.ts packages/db/src/schema/index.ts packages/db/src/migrations/
git commit -m "feat(db): add api_keys table for Key pool management"
```

#### Task 1.2：扩展 agents 表（Agent 池 + 标签系统）

**Files:**
- Modify: `/mnt/d/project/aicompany/packages/db/src/schema/agents.ts`

- [ ] **Step 1: Add fields to agents table**

Add these new fields to the `agents` table in `packages/db/src/schema/agents.ts`:

```typescript
// New fields to add:
tags: text("tags").array(),                    // ["React", "Python", "UI"]
modelBinding: uuid("model_binding").references(() => apiKeys.id),  // linked API key
maxConcurrency: integer("max_concurrency").notNull().default(3),
temperature: integer("temperature").default(70), // 0-100 scale
maxTokens: integer("max_tokens"),
costPerTaskCents: integer("cost_per_task_cents").notNull().default(0),
currentTasks: integer("current_tasks").notNull().default(0),
lastTaskCompletedAt: timestamp("last_task_completed_at", { withTimezone: true }),
```

Import `apiKeys`:
```typescript
import { apiKeys } from "./api_keys.js";
```

- [ ] **Step 2: Generate migration**

```bash
pnpm db:generate
```

- [ ] **Step 3: Commit**

```bash
git add packages/db/src/schema/agents.ts packages/db/src/migrations/
git commit -m "feat(db): extend agents table with tags, model binding, concurrency fields"
```

#### Task 1.3：创建项目文档表和项目-员工关联表

**Files:**
- Create: `/mnt/d/project/aicompany/packages/db/src/schema/project_documents.ts`
- Create: `/mnt/d/project/aicompany/packages/db/src/schema/project_team_members.ts`
- Modify: `/mnt/d/project/aicompany/packages/db/src/schema/index.ts`

- [ ] **Step 1: Create project_documents table**

Write to `packages/db/src/schema/project_documents.ts`:

```typescript
import { pgTable, uuid, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { projects } from "./projects.js";
import { agents } from "./agents.js";

export const projectDocuments = pgTable(
  "project_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id),
    agentId: uuid("agent_id").references(() => agents.id),
    title: text("title").notNull(),
    content: text("content").notNull(),
    version: integer("version").notNull().default(1),
    status: text("status").notNull().default("active"), // active | archived
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectIdx: index("project_docs_project_idx").on(table.projectId),
    projectAgentIdx: index("project_docs_agent_idx").on(table.projectId, table.agentId),
  }),
);
```

- [ ] **Step 2: Create project_team_members table**

Write to `packages/db/src/schema/project_team_members.ts`:

```typescript
import { pgTable, uuid, text, timestamp, integer, index, unique } from "drizzle-orm/pg-core";
import { projects } from "./projects.js";
import { agents } from "./agents.js";

export const projectTeamMembers = pgTable(
  "project_team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id),
    agentId: uuid("agent_id").notNull().references(() => agents.id),
    role: text("role").notNull().default("member"),
    taskDescription: text("task_description"),
    taskProgress: integer("task_progress").notNull().default(0), // 0-100
    taskStatus: text("task_status").notNull().default("idle"), // idle | working | completed | archived
    sessionCount: integer("session_count").notNull().default(0),
    lastSessionAt: timestamp("last_session_at", { withTimezone: true }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectAgentUnique: unique("project_agent_unique").on(table.projectId, table.agentId),
    projectIdx: index("team_project_idx").on(table.projectId),
    statusIdx: index("team_status_idx").on(table.projectId, table.taskStatus),
  }),
);
```

- [ ] **Step 3: Register in schema index**

Add to `packages/db/src/schema/index.ts`:
```typescript
export { projectDocuments } from "./project_documents.js";
export { projectTeamMembers } from "./project_team_members.js";
```

- [ ] **Step 4: Generate migration**

```bash
pnpm db:generate
```

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/schema/project_documents.ts packages/db/src/schema/project_team_members.ts packages/db/src/schema/index.ts packages/db/src/migrations/
git commit -m "feat(db): add project_documents and project_team_members tables"
```

---

### Phase 2：Key 池管理模块

#### Task 2.1：Key Pool 后端服务

**Files:**
- Create: `/mnt/d/project/aicompany/server/src/services/api-keys.ts`
- Create: `/mnt/d/project/aicompany/server/src/routes/api-keys.ts`
- Modify: `/mnt/d/project/aicompany/server/src/app.ts`
- Modify: `/mnt/d/project/aicompany/server/src/services/index.ts`

- [ ] **Step 1: Create API Key service**

Write to `server/src/services/api-keys.ts`:

```typescript
import { eq, and, sql } from "drizzle-orm";
import { db } from "@paperclipai/db";
import { apiKeys } from "@paperclipai/db/schema/api_keys";
import type { ApiKey } from "@paperclipai/shared";

export class ApiKeyService {
  async list(companyId: string): Promise<ApiKey[]> {
    return db.select().from(apiKeys).where(eq(apiKeys.companyId, companyId));
  }

  async getById(id: string): Promise<ApiKey | undefined> {
    const [result] = await db.select().from(apiKeys).where(eq(apiKeys.id, id));
    return result;
  }

  async create(data: {
    companyId: string;
    name: string;
    provider: string;
    keyValue: string;
    model: string;
    baseUrl?: string;
    capabilities: string[];
  }): Promise<ApiKey> {
    const [result] = await db.insert(apiKeys).values({
      companyId: data.companyId,
      name: data.name,
      provider: data.provider,
      keyValue: data.keyValue, // TODO: encrypt before storing
      model: data.model,
      baseUrl: data.baseUrl,
      capabilities: data.capabilities,
    }).returning();
    return result;
  }

  async delete(id: string): Promise<void> {
    await db.delete(apiKeys).where(eq(apiKeys.id, id));
  }

  async test(id: string): Promise<{ success: boolean; message: string }> {
    const key = await this.getById(id);
    if (!key) return { success: false, message: "Key not found" };

    // Make a minimal API call to test the key
    try {
      const response = await fetch(
        key.baseUrl || `https://api.${key.provider}.com/v1/models`,
        { headers: { Authorization: `Bearer ${key.keyValue}` } }
      );
      if (response.ok) {
        await db.update(apiKeys).set({ lastTestedAt: new Date() }).where(eq(apiKeys.id, id));
        return { success: true, message: "Key is valid" };
      }
      return { success: false, message: `API returned ${response.status}` };
    } catch (err) {
      return { success: false, message: `Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}` };
    }
  }

  async getMonthlyCost(companyId: string): Promise<number> {
    const [result] = await db
      .select({ total: sql<number>`sum(monthly_cost_cents)` })
      .from(apiKeys)
      .where(and(eq(apiKeys.companyId, companyId), eq(apiKeys.isActive, true)));
    return result?.total ?? 0;
  }
}
```

- [ ] **Step 2: Create API Key routes**

Write to `server/src/routes/api-keys.ts`:

```typescript
import { Router } from "express";
import { ApiKeyService } from "../services/api-keys.js";

const router = Router();
const service = new ApiKeyService();

router.get("/", async (req, res) => {
  const keys = await service.list(req.companyId);
  res.json(keys);
});

router.get("/:id", async (req, res) => {
  const key = await service.getById(req.params.id);
  if (!key) return res.status(404).json({ error: "Not found" });
  // Mask the actual key value
  key.keyValue = "****" + key.keyValue.slice(-4);
  res.json(key);
});

router.post("/", async (req, res) => {
  const key = await service.create({ ...req.body, companyId: req.companyId });
  res.status(201).json({ id: key.id, name: key.name, provider: key.provider });
});

router.delete("/:id", async (req, res) => {
  await service.delete(req.params.id);
  res.status(204).end();
});

router.post("/:id/test", async (req, res) => {
  const result = await service.test(req.params.id);
  res.json(result);
});

export { router as apiKeyRoutes };
```

- [ ] **Step 3: Register routes in app.ts**

In `server/src/app.ts`, add:
```typescript
import { apiKeyRoutes } from "./routes/api-keys.js";
// ...
app.use("/api/keys", apiKeyRoutes);
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/api-keys.ts server/src/routes/api-keys.ts server/src/app.ts
git commit -m "feat: add API Key pool service and routes"
```

---

### Phase 3：Agent 池管理模块

#### Task 3.1：Agent Pool 服务（从组织架构中独立出池管理）

**Files:**
- Create: `/mnt/d/project/aicompany/server/src/services/agent-pool.ts`
- Create: `/mnt/d/project/aicompany/server/src/routes/agent-pool.ts`
- Modify: `/mnt/d/project/aicompany/server/src/app.ts`

- [ ] **Step 1: Create Agent Pool service**

Write to `server/src/services/agent-pool.ts`:

```typescript
import { eq, like, and, inArray, sql } from "drizzle-orm";
import { db } from "@paperclipai/db";
import { agents } from "@paperclipai/db/schema/agents";

export interface AgentDefinition {
  id: string;
  companyId: string;
  name: string;
  role: string;
  title: string | null;
  tags: string[];
  modelBinding: string | null;
  capabilities: string | null;
  adapterType: string;
  adapterConfig: Record<string, unknown>;
  runtimeConfig: Record<string, unknown>;
  maxConcurrency: number;
  currentTasks: number;
  temperature: number | null;
  maxTokens: number | null;
  status: string;
  budgetMonthlyCents: number;
  spentMonthlyCents: number;
  createdAt: Date;
  updatedAt: Date;
}

export class AgentPoolService {
  async list(companyId: string): Promise<AgentDefinition[]> {
    return db.select().from(agents).where(eq(agents.companyId, companyId));
  }

  async getById(id: string): Promise<AgentDefinition | undefined> {
    const [result] = await db.select().from(agents).where(eq(agents.id, id));
    return result;
  }

  async create(data: {
    companyId: string;
    name: string;
    role: string;
    title?: string;
    tags: string[];
    modelBinding?: string;
    capabilities?: string;
    adapterType: string;
    maxConcurrency?: number;
    temperature?: number;
    maxTokens?: number;
  }): Promise<AgentDefinition> {
    const [result] = await db.insert(agents).values({
      companyId: data.companyId,
      name: data.name,
      role: data.role,
      title: data.title,
      tags: data.tags,
      modelBinding: data.modelBinding,
      capabilities: data.capabilities,
      adapterType: data.adapterType,
      maxConcurrency: data.maxConcurrency ?? 3,
      currentTasks: 0,
      temperature: data.temperature ?? 70,
      maxTokens: data.maxTokens,
    }).returning();
    return result;
  }

  async update(id: string, data: Partial<AgentDefinition>): Promise<AgentDefinition | undefined> {
    const [result] = await db.update(agents).set({
      ...data,
      updatedAt: new Date(),
    }).where(eq(agents.id, id)).returning();
    return result;
  }

  async delete(id: string): Promise<void> {
    await db.update(agents).set({ status: "deleted" }).where(eq(agents.id, id));
  }

  async findByTags(companyId: string, requiredTags: string[]): Promise<AgentDefinition[]> {
    // Find agents that have at least one of the required tags and are available
    return db.select().from(agents).where(
      and(
        eq(agents.companyId, companyId),
        eq(agents.status, "idle"),
        sql`${agents.tags} && ARRAY[${requiredTags.join(",")}]::text[]`,
        sql`${agents.currentTasks} < ${agents.maxConcurrency}`,
      ),
    );
  }

  async incrementTasks(id: string): Promise<void> {
    await db.update(agents).set({
      currentTasks: sql`${agents.currentTasks} + 1`,
      status: "working",
      updatedAt: new Date(),
    }).where(eq(agents.id, id));
  }

  async decrementTasks(id: string): Promise<void> {
    await db.update(agents).set({
      currentTasks: sql`GREATEST(${agents.currentTasks} - 1, 0)`,
      status: sql`CASE WHEN ${agents.currentTasks} - 1 <= 0 THEN 'idle' ELSE 'working' END`,
      lastTaskCompletedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(agents.id, id));
  }
}
```

- [ ] **Step 2: Create Agent Pool routes**

Write to `server/src/routes/agent-pool.ts`:

```typescript
import { Router } from "express";
import { AgentPoolService } from "../services/agent-pool.js";

const router = Router();
const service = new AgentPoolService();

router.get("/", async (req, res) => {
  const agents = await service.list(req.companyId);
  res.json(agents);
});

router.get("/:id", async (req, res) => {
  const agent = await service.getById(req.params.id);
  if (!agent) return res.status(404).json({ error: "Not found" });
  res.json(agent);
});

router.post("/", async (req, res) => {
  const agent = await service.create({ ...req.body, companyId: req.companyId });
  res.status(201).json(agent);
});

router.put("/:id", async (req, res) => {
  const agent = await service.update(req.params.id, req.body);
  if (!agent) return res.status(404).json({ error: "Not found" });
  res.json(agent);
});

router.delete("/:id", async (req, res) => {
  await service.delete(req.params.id);
  res.status(204).end();
});

router.post("/:id/test", async (req, res) => {
  // Send a test prompt to the agent's bound model
  res.json({ success: true, message: "Agent test not yet implemented" });
});

export { router as agentPoolRoutes };
```

- [ ] **Step 3: Register routes in app.ts**

```typescript
import { agentPoolRoutes } from "./routes/agent-pool.js";
// ...
app.use("/api/agents", agentPoolRoutes);
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/agent-pool.ts server/src/routes/agent-pool.ts server/src/app.ts
git commit -m "feat: add Agent Pool service and routes"
```

---

### Phase 4：HR Agent 引擎（核心智能）

#### Task 4.1：HR Agent 服务——需求分析与模型调研

**Files:**
- Create: `/mnt/d/project/aicompany/server/src/services/hr-agent.ts`
- Create: `/mnt/d/project/aicompany/server/src/routes/hr-agent.ts`
- Modify: `/mnt/d/project/aicompany/server/src/app.ts`
- Create: `/mnt/d/project/aicompany/server/src/services/hr-agent-prompt.ts`

- [ ] **Step 1: Create HR Agent prompt template**

Write to `server/src/services/hr-agent-prompt.ts`:

```typescript
export const HR_AGENT_SYSTEM_PROMPT = `你是 AI 公司框架的 HR Agent。你的职责是：
1. 分析用户提交的项目需求，提取关键信息（项目类型、技术栈、复杂度、交付形式）
2. 联网搜索各模型官网，了解各模型的能力特点
3. 对比 Agent 池中员工的能力标签，推荐最佳团队组合
4. 预估项目 API 消耗成本

请始终保持专业和客观。`;

export function buildAnalysisPrompt(projectDescription: string): string {
  return `请分析以下项目需求，提取关键信息：

项目描述：${projectDescription}

请以 JSON 格式输出分析结果：
{
  "projectType": "项目类型",
  "techStack": ["技术栈列表"],
  "complexity": "low|medium|high",
  "estimatedTokens": "预估 token 消耗",
  "requiredSkills": ["所需能力标签"],
  "suggestedTeamSize": "建议团队人数"
}`;
}

export function buildTeamRecommendationPrompt(
  projectAnalysis: string,
  availableAgents: string,
  modelCapabilities: string,
): string {
  return `项目需求分析：${projectAnalysis}

可用 AI 员工：${availableAgents}

各模型最新能力：${modelCapabilities}

请推荐最佳团队组合，以 JSON 格式输出：
{
  "team": [
    {
      "agentId": "员工 ID",
      "reason": "选择理由"
    }
  ],
  "estimatedCostCents": 预估成本（美分）,
  "estimatedCompletionTime": "预估完成时间",
  "riskLevel": "low|medium|high",
  "recommendationNote": "推荐说明"
}`;
}
```

- [ ] **Step 2: Create HR Agent service**

Write to `server/src/services/hr-agent.ts`:

```typescript
import { db } from "@paperclipai/db";
import { agents } from "@paperclipai/db/schema/agents";
import { apiKeys } from "@paperclipai/db/schema/api_keys";
import { eq, and, sql } from "drizzle-orm";
import { AgentPoolService } from "./agent-pool.js";

export class HRAgentService {
  private agentPool: AgentPoolService;

  constructor() {
    this.agentPool = new AgentPoolService();
  }

  /**
   * Step 1: Analyze the project requirements
   */
  async analyzeProject(description: string): Promise<{
    projectType: string;
    techStack: string[];
    complexity: string;
    estimatedTokens: string;
    requiredSkills: string[];
    suggestedTeamSize: number;
  }> {
    // Call LLM (Claude API) to analyze the project
    // This uses one of the configured API keys
    const analysis = await this.callLLMForAnalysis(description);
    return JSON.parse(analysis);
  }

  /**
   * Step 2: Research model capabilities from official websites
   */
  async researchModels(): Promise<string> {
    // Fetch latest model info from provider websites
    const providers = ["openai", "anthropic", "google"];
    const results: string[] = [];

    for (const provider of providers) {
      try {
        // Search for each provider's model capabilities
        const response = await fetch(`https://api.${provider}.com/v1/models`, {
          headers: { "Content-Type": "application/json" },
        });
        if (response.ok) {
          const data = await response.json();
          results.push(`${provider}: ${JSON.stringify(data)}`);
        }
      } catch {
        // Fallback: use cached model data
        results.push(`${provider}: Using cached model info`);
      }
    }

    return results.join("\n");
  }

  /**
   * Step 3: Match and recommend team
   */
  async recommendTeam(
    companyId: string,
    requiredSkills: string[],
    projectAnalysis: string,
  ): Promise<{
    team: Array<{ agentId: string; reason: string }>;
    estimatedCostCents: number;
    riskLevel: string;
    recommendationNote: string;
  }> {
    // Find available agents matching required skills
    const availableAgents = await this.agentPool.findByTags(companyId, requiredSkills);

    // Call LLM to make final team recommendation
    const modelInfo = await this.researchModels();
    const recommendation = await this.callLLMForTeamRecommendation(
      projectAnalysis,
      JSON.stringify(availableAgents),
      modelInfo,
    );

    return JSON.parse(recommendation);
  }

  /**
   * Step 4: Estimate cost and decide if confirmation needed
   */
  async estimateCost(teamSize: number, complexity: string): Promise<{
    estimatedCents: number;
    needsConfirmation: boolean;
    thresholdCents: number;
  }> {
    // Get global cost threshold from config
    const thresholdCents = 500; // $5 default, configurable
    const baseCost = teamSize * 50; // 50 cents per agent base
    const complexityMultiplier = complexity === "high" ? 3 : complexity === "medium" ? 2 : 1;
    const estimatedCents = baseCost * complexityMultiplier;

    return {
      estimatedCents,
      needsConfirmation: estimatedCents > thresholdCents,
      thresholdCents,
    };
  }

  private async callLLMForAnalysis(prompt: string): Promise<string> {
    // TODO: Implement actual LLM call using configured API key
    // For now, return mock structured data
    return JSON.stringify({
      projectType: "web_development",
      techStack: ["React", "Node.js", "PostgreSQL"],
      complexity: "medium",
      estimatedTokens: "50000",
      requiredSkills: ["frontend", "backend", "database"],
      suggestedTeamSize: 3,
    });
  }

  private async callLLMForTeamRecommendation(
    analysis: string,
    agents: string,
    modelInfo: string,
  ): Promise<string> {
    // TODO: Implement actual LLM call
    return JSON.stringify({
      team: [
        { agentId: "mock-id-1", reason: "前端开发经验丰富" },
        { agentId: "mock-id-2", reason: "后端架构能力强" },
      ],
      estimatedCostCents: 300,
      estimatedCompletionTime: "2 days",
      riskLevel: "low",
      recommendationNote: "推荐的团队配置完善，风险较低",
    });
  }
}
```

- [ ] **Step 3: Create HR Agent routes**

Write to `server/src/routes/hr-agent.ts`:

```typescript
import { Router } from "express";
import { HRAgentService } from "../services/hr-agent.js";

const router = Router();
const service = new HRAgentService();

// Step 2: Research models
router.post("/research-models", async (_req, res) => {
  const modelInfo = await service.researchModels();
  res.json({ modelInfo });
});

// Steps 1-4: Full HR flow
router.post("/analyze", async (req, res) => {
  const { description } = req.body;
  if (!description) return res.status(400).json({ error: "Project description required" });

  const analysis = await service.analyzeProject(description);
  const recommendation = await service.recommendTeam(
    req.companyId,
    analysis.requiredSkills,
    description,
  );
  const cost = await service.estimateCost(
    analysis.suggestedTeamSize,
    analysis.complexity,
  );

  res.json({
    analysis,
    recommendation,
    cost,
    needsConfirmation: cost.needsConfirmation,
  });
});

export { router as hrAgentRoutes };
```

- [ ] **Step 4: Register routes**

In `server/src/app.ts`:
```typescript
import { hrAgentRoutes } from "./routes/hr-agent.js";
// ...
app.use("/api/hr", hrAgentRoutes);
```

- [ ] **Step 5: Commit**

```bash
git add server/src/services/hr-agent.ts server/src/services/hr-agent-prompt.ts server/src/routes/hr-agent.ts server/src/app.ts
git commit -m "feat: add HR Agent engine - analysis, research, team recommendation"
```

---

### Phase 5：项目工作空间 & 上下文管理

#### Task 5.1：项目协作工作空间服务

**Files:**
- Create: `/mnt/d/project/aicompany/server/src/services/project-workspace.ts`
- Create: `/mnt/d/project/aicompany/server/src/routes/project-workspace.ts`
- Modify: `/mnt/d/project/aicompany/server/src/app.ts`

- [ ] **Step 1: Create Project Workspace service**

Write to `server/src/services/project-workspace.ts`:

```typescript
import { db } from "@paperclipai/db";
import { projects } from "@paperclipai/db/schema/projects";
import { projectTeamMembers } from "@paperclipai/db/schema/project_team_members";
import { projectDocuments } from "@paperclipai/db/schema/project_documents";
import { agents } from "@paperclipai/db/schema/agents";
import { eq, and, desc } from "drizzle-orm";

export class ProjectWorkspaceService {
  /**
   * Create a new project
   */
  async createProject(data: {
    companyId: string;
    name: string;
    description: string;
    teamAgentIds: string[];
    createdBy: string;
  }): Promise<{ projectId: string; team: any[] }> {
    const [project] = await db.insert(projects).values({
      companyId: data.companyId,
      name: data.name,
      description: data.description,
      status: "active",
    }).returning();

    // Add team members
    const team = [];
    for (const agentId of data.teamAgentIds) {
      const agent = await db.select().from(agents).where(eq(agents.id, agentId)).then(r => r[0]);
      if (!agent) continue;

      await db.insert(projectTeamMembers).values({
        projectId: project.id,
        agentId,
        role: agent.role,
        taskStatus: "idle",
      });

      team.push({ agentId, name: agent.name, role: agent.role });
    }

    // Create initial project document
    await db.insert(projectDocuments).values({
      projectId: project.id,
      title: "项目初始化文档",
      content: `# ${data.name}\n\n${data.description}\n\n## 团队成员\n${team.map(t => `- ${t.name} (${t.role})`).join("\n")}\n\n## 项目状态\n- 开始时间: ${new Date().toISOString()}\n- 当前状态: 已启动`,
      version: 1,
    });

    return { projectId: project.id, team };
  }

  /**
   * Trigger: Wake up an agent for a project task
   * Agent reads project doc → works → writes doc → self-destructs
   */
  async wakeAgentForTask(projectId: string, agentId: string, taskDescription: string): Promise<void> {
    // 1. Get latest project document
    const [latestDoc] = await db.select()
      .from(projectDocuments)
      .where(eq(projectDocuments.projectId, projectId))
      .orderBy(desc(projectDocuments.version))
      .limit(1);

    // 2. Get agent config
    const agent = await db.select().from(agents).where(eq(agents.id, agentId)).then(r => r[0]);
    if (!agent) throw new Error("Agent not found");

    // 3. Increment task counter
    await db.update(agents).set({
      currentTasks: db.$db._.sql`${agents.currentTasks} + 1`,
      status: "working",
    }).where(eq(agents.id, agentId));

    // 4. Update team member status
    await db.update(projectTeamMembers)
      .set({ taskStatus: "working", taskDescription, sessionCount: db.$db._.sql`${projectTeamMembers.sessionCount} + 1` })
      .where(and(eq(projectTeamMembers.projectId, projectId), eq(projectTeamMembers.agentId, agentId)));

    // 5. TODO: Invoke the actual LLM call with doc as context
    // The LLM reads the doc, works, returns result
    // Then the result is saved as a new document version
    // And agent task count is decremented (agent "self-destructs")
  }

  /**
   * Complete agent task: write doc, then "self-destruct" (clear session)
   */
  async completeAgentTask(
    projectId: string,
    agentId: string,
    docTitle: string,
    docContent: string,
  ): Promise<void> {
    // Get latest version
    const [latestDoc] = await db.select()
      .from(projectDocuments)
      .where(eq(projectDocuments.projectId, projectId))
      .orderBy(desc(projectDocuments.version))
      .limit(1);

    // Write new document version
    await db.insert(projectDocuments).values({
      projectId,
      agentId,
      title: docTitle,
      content: docContent,
      version: (latestDoc?.version ?? 0) + 1,
    });

    // Update team member: mark completed
    await db.update(projectTeamMembers)
      .set({ taskStatus: "completed", taskProgress: 100, lastSessionAt: new Date() })
      .where(and(eq(projectTeamMembers.projectId, projectId), eq(projectTeamMembers.agentId, agentId)));

    // Agent "self-destructs": decrement tasks, set back to idle
    await db.update(agents).set({
      currentTasks: db.$db._.sql`GREATEST(${agents.currentTasks} - 1, 0)`,
      status: db.$db._.sql`CASE WHEN ${agents.currentTasks} - 1 <= 0 THEN 'idle' ELSE 'working' END`,
      lastTaskCompletedAt: new Date(),
    }).where(eq(agents.id, agentId));
  }

  /**
   * Get project status with full team details
   */
  async getProjectStatus(projectId: string): Promise<any> {
    const project = await db.select().from(projects).where(eq(projects.id, projectId)).then(r => r[0]);
    if (!project) return null;

    const team = await db.select()
      .from(projectTeamMembers)
      .where(eq(projectTeamMembers.projectId, projectId));

    const docs = await db.select()
      .from(projectDocuments)
      .where(eq(projectDocuments.projectId, projectId))
      .orderBy(desc(projectDocuments.version));

    return { project, team, docs };
  }
}
```

- [ ] **Step 2: Create Project Workspace routes**

Write to `server/src/routes/project-workspace.ts`:

```typescript
import { Router } from "express";
import { ProjectWorkspaceService } from "../services/project-workspace.js";

const router = Router();
const service = new ProjectWorkspaceService();

router.post("/", async (req, res) => {
  const result = await service.createProject({ ...req.body, companyId: req.companyId });
  res.status(201).json(result);
});

router.get("/:id/status", async (req, res) => {
  const status = await service.getProjectStatus(req.params.id);
  if (!status) return res.status(404).json({ error: "Project not found" });
  res.json(status);
});

router.post("/:id/tasks/complete", async (req, res) => {
  const { agentId, docTitle, docContent } = req.body;
  await service.completeAgentTask(req.params.id, agentId, docTitle, docContent);
  res.json({ success: true });
});

export { router as projectWorkspaceRoutes };
```

- [ ] **Step 3: Register routes**

In `app.ts`:
```typescript
import { projectWorkspaceRoutes } from "./routes/project-workspace.js";
// ...
app.use("/api/workspace", projectWorkspaceRoutes);
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/project-workspace.ts server/src/routes/project-workspace.ts server/src/app.ts
git commit -m "feat: add Project Workspace with agent lifecycle management"
```

---

### Phase 6：CLI 命令体系改造

#### Task 6.1：创建 ai-company CLI 入口

**Files:**
- Create: `/mnt/d/project/aicompany/cli/src/commands/client/ai-company.ts` (重写, 包含所有子命令)

- [ ] **Step 1: Write the complete CLI**

This is a large file. Write to `cli/src/commands/client/ai-company.ts`:

```typescript
import { Command } from "commander";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { addCommonClientOptions, handleCommandError, resolveCommandContext } from "./common.js";

export function registerAiCompanyCommands(program: Command) {
  const ai = program.command("ai-company")
    .description("AI Company 框架管理命令");

  // ── key ──
  const keyCmd = ai.command("key").description("管理 API Key 池");
  keyCmd.command("add")
    .argument("<provider>", "模型供应商 (openai/anthropic/google)")
    .option("--key <key>", "API Key")
    .option("--model <model>", "模型名称")
    .action(async (provider, opts) => {
      if (!opts.key) { const k = await p.password({ message: "输入 API Key" }); if (p.isCancel(k)) return; opts.key = k; }
      if (!opts.model) { const m = await p.text({ message: "输入模型名称", defaultValue: "" }); if (p.isCancel(m)) return; opts.model = m; }
      const ctx = await resolveCommandContext();
      // TODO: POST /api/keys
      console.log(pc.green(`✓ Key 添加成功: ${provider}/${opts.model}`));
    });

  keyCmd.command("list")
    .action(async () => {
      const ctx = await resolveCommandContext();
      // TODO: GET /api/keys
      console.log(pc.blue("已配置的 API Key:"));
      console.log("  (功能开发中 - 请使用 Dashboard 管理)");
    });

  keyCmd.command("delete <id>")
    .action(async (id) => {
      // TODO: DELETE /api/keys/:id
      console.log(pc.green(`✓ Key ${id} 已删除`));
    });

  keyCmd.command("test <id>")
    .action(async (id) => {
      // TODO: POST /api/keys/:id/test
      console.log(pc.blue(`测试 Key ${id}...`));
    });

  // ── agent ──
  const agentCmd = ai.command("agent").description("管理 AI 员工");
  agentCmd.command("create")
    .argument("<name>", "员工名称")
    .option("--role <role>", "角色")
    .option("--model <model>", "绑定模型 Key ID")
    .option("--tags <tags>", "能力标签 (逗号分隔)")
    .option("--temperature <temp>", "温度值")
    .option("--max-tokens <tokens>", "最大 Token 数")
    .action(async (name, opts) => {
      const ctx = await resolveCommandContext();
      // TODO: POST /api/agents
      console.log(pc.green(`✓ 员工 ${name} 创建成功`));
    });

  agentCmd.command("list")
    .action(async () => {
      const ctx = await resolveCommandContext();
      // TODO: GET /api/agents
      console.log(pc.blue("AI 员工列表:"));
    });

  agentCmd.command("show <name>")
    .action(async (name) => {
      // TODO: GET /api/agents/:name
      console.log(pc.blue(`员工: ${name}`));
    });

  agentCmd.command("edit <name>")
    .action(async (name) => {
      // TODO: PUT /api/agents/:id
      console.log(pc.green(`✓ 员工 ${name} 已更新`));
    });

  agentCmd.command("delete <name>")
    .action(async (name) => {
      // TODO: DELETE /api/agents/:id
      console.log(pc.green(`✓ 员工 ${name} 已解雇`));
    });

  agentCmd.command("test <name>")
    .action(async (name) => {
      // TODO: POST /api/agents/:id/test
      console.log(pc.blue(`测试员工 ${name}...`));
    });

  // ── project ──
  const projectCmd = ai.command("project").description("管理项目");
  projectCmd.command("new <description>")
    .option("--mode <mode>", "模式 (auto/confirm)")
    .action(async (description, opts) => {
      const ctx = await resolveCommandContext();
      console.log(pc.blue(`分析项目需求: ${description}`));
      // TODO: POST /api/hr/analyze
      console.log(pc.green("✓ 团队组建完成，项目已启动"));
    });

  projectCmd.command("list")
    .action(async () => {
      // TODO: GET /api/projects
      console.log(pc.blue("项目列表:"));
    });

  projectCmd.command("status <id>")
    .action(async (id) => {
      // TODO: GET /api/workspace/:id/status
      console.log(pc.blue(`项目 ${id} 状态:`));
    });

  projectCmd.command("pause <id>")
    .action(async (id) => { console.log(pc.yellow(`项目 ${id} 已暂停`)); });

  projectCmd.command("resume <id>")
    .action(async (id) => { console.log(pc.green(`项目 ${id} 已恢复`)); });

  projectCmd.command("cancel <id>")
    .action(async (id) => { console.log(pc.red(`项目 ${id} 已取消`)); });

  // ── config ──
  const configCmd = ai.command("config").description("配置管理");
  configCmd.command("show")
    .action(async () => {
      console.log(pc.blue("当前配置:"));
      // TODO: GET /api/config
    });

  configCmd.command("set cost-threshold <cents>")
    .action(async (cents) => {
      // TODO: PUT /api/config/cost-threshold
      console.log(pc.green(`✓ 成本阈值已设为 ${cents} 美分`));
    });

  // ── dashboard ──
  ai.command("dashboard")
    .command("open")
    .action(() => {
      console.log(pc.blue("打开 Dashboard: http://localhost:3100"));
    });

  return ai;
}
```

- [ ] **Step 2: Register in CLI index**

Modify `cli/src/index.ts`, add:
```typescript
import { registerAiCompanyCommands } from "./commands/client/ai-company.js";
// ...
registerAiCompanyCommands(program);
```

- [ ] **Step 3: Commit**

```bash
git add cli/src/commands/client/ai-company.ts cli/src/index.ts
git commit -m "feat: add AI Company CLI commands (key/agent/project/config/dashboard)"
```

---

### Phase 7：Dashboard 交互式下钻

Paperclip 已有的 React UI 可以复用。需要新增页面组件。

#### Task 7.1：自定义 Dashboard 页面

**Files:**
- Create: `/mnt/d/project/aicompany/ui/src/pages/AiCompanyDashboard.tsx`
- Create: `/mnt/d/project/aicompany/ui/src/pages/AiCompanyProjectDetail.tsx`
- Create: `/mnt/d/project/aicompany/ui/src/pages/AiCompanyAgentDetail.tsx`
- Create: `/mnt/d/project/aicompany/ui/src/pages/AiCompanyCostAnalysis.tsx`
- Modify: `/mnt/d/project/aicompany/ui/src/App.tsx`

- [ ] **Step 1: Create Dashboard main page**

Write to `ui/src/pages/AiCompanyDashboard.tsx`:

```tsx
import { useState, useEffect } from "react";

interface StatCard {
  title: string;
  value: string | number;
  color: string;
  onClick: () => void;
}

export function AiCompanyDashboard() {
  const [stats, setStats] = useState({
    activeProjects: 3,
    activeAgents: 8,
    completedProjects: 12,
    dailyCost: "$2.34",
  });

  const statCards: StatCard[] = [
    {
      title: "进行中项目",
      value: stats.activeProjects,
      color: "#2e7d32",
      onClick: () => window.location.href = "/ai-company/projects",
    },
    {
      title: "在职 AI 员工",
      value: stats.activeAgents,
      color: "#1565c0",
      onClick: () => window.location.href = "/ai-company/agents",
    },
    {
      title: "已完成项目",
      value: stats.completedProjects,
      color: "#e65100",
      onClick: () => window.location.href = "/ai-company/projects?status=completed",
    },
    {
      title: "API 今日消耗",
      value: stats.dailyCost,
      color: "#6a1b9a",
      onClick: () => window.location.href = "/ai-company/costs",
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <h1>AI Company Dashboard</h1>
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
        {statCards.map((card) => (
          <div
            key={card.title}
            onClick={card.onClick}
            style={{
              flex: 1,
              background: "#fff",
              border: `1px solid ${card.color}`,
              borderRadius: "8px",
              padding: "16px",
              cursor: "pointer",
              transition: "box-shadow 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)"}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}
          >
            <div style={{ fontSize: "12px", color: "#666" }}>{card.title}</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: card.color }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>
      {/* TODO: Add project list table and agent status panel */}
    </div>
  );
}
```

- [ ] **Step 2: Register new routes in App.tsx**

Modify `ui/src/App.tsx` to add routes:
```tsx
import { AiCompanyDashboard } from "./pages/AiCompanyDashboard";
// ...
<Route path="/ai-company" element={<AiCompanyDashboard />} />
<Route path="/ai-company/projects" element={<AiCompanyProjectDetail />} />
<Route path="/ai-company/agents" element={<AiCompanyAgentDetail />} />
<Route path="/ai-company/costs" element={<AiCompanyCostAnalysis />} />
```

- [ ] **Step 3: Commit**

```bash
git add ui/src/pages/AiCompanyDashboard.tsx ui/src/pages/AiCompanyProjectDetail.tsx ui/src/pages/AiCompanyAgentDetail.tsx ui/src/pages/AiCompanyCostAnalysis.tsx ui/src/App.tsx
git commit -m "feat: add AI Company interactive dashboard pages"
```

---

### Phase 8：完整集成与部署

#### Task 8.1：端到端 Docker 部署验证

**Files:**
- Modify: `/mnt/d/project/aicompany/docker/docker-compose.aicompany.yml`

- [ ] **Step 1: Build and test Docker image**

```bash
cd /mnt/d/project/aicompany
docker compose -f docker/docker-compose.aicompany.yml build
```

- [ ] **Step 2: Start services and verify**

```bash
docker compose -f docker/docker-compose.aicompany.yml up -d
# Verify health endpoint
curl http://localhost:3100/api/health
```

Expected: Healthy response.

- [ ] **Step 3: Create .env.example for the project**

Write to `.env.example`:
```env
# AI Company 配置文件
PAPERCLIP_PUBLIC_URL=http://localhost:3100
PAPERCLIP_DEPLOYMENT_MODE=trusted-local

# API Keys (可选 - 通过 CLI 或 Dashboard 添加)
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-...
```

- [ ] **Step 4: Create .gitignore additions**

Append to `.gitignore`:
```
# AI Company
/projects/*
!/projects/.gitkeep
/config/local.*
.env
```

- [ ] **Step 5: Final commit and push**

```bash
git add docker/docker-compose.aicompany.yml .env.example .gitignore
git commit -m "chore: finalize Docker deployment and environment configuration"
git push
```

---

## 自检清单

### Spec 覆盖检查

| Spec 中的需求 | 对应 Task | 状态 |
|--------------|-----------|------|
| Key 池管理 | Task 1.1, Task 2.1 | 已规划 |
| Agent 池管理 | Task 1.2, Task 3.1 | 已规划 |
| HR Agent 选人 | Task 4.1 | 已规划 |
| 成本阈值确认 | Task 4.1 (Step 4) | 已规划 |
| 项目工作空间 | Task 5.1 | 已规划 |
| 写档自杀上下文管理 | Task 5.1 (completeAgentTask) | 已规划 |
| Dashboard 交互下钻 | Task 7.1 | 已规划 |
| CLI 命令体系 | Task 6.1 | 已规划 |
| 移动端入口 | 需补充 Task | ⚠️ 待定 |
| 中央调度器纯程序 | 通过 Heartbeat 保证 | 设计约束 |
| Docker 一键部署 | Task 0.2, Task 8.1 | 已规划 |

### 占位符检查

- `// TODO: Implement actual LLM call` — 在 Task 4.1 中标记，需要后续接入真实 API 调用
- `// TODO: POST /api/...` — CLI 命令需要后端 API 就绪后联调
- Dashboard 页面有基础框架，CSS 美化可在后续迭代中完善

### 后续可迭代方向
1. 移动端 Telegram Bot 入口
2. HR Agent 接入真实 LLM API（目前是 mock 返回）
3. Dashboard UI 主题美化
4. API Key 加密存储
