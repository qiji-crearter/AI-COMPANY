# Central Scheduler — 中央调度器设计

> 日期: 2026-05-22
> 状态: 设计阶段

---

## 1. 概述

中央调度器是 AI Company 框架的核心编排组件，负责将任务智能地分配给 Agent 池中最合适的 Agent。它位于 Key 池和 Agent 池之上，是连接"任务需求"和"Agent 执行能力"的桥梁。

## 2. 设计目标

- **通用调度**：同时支持 Paperclip Issue 和 AI Company 内部任务
- **智能分配**：基于技能匹配、负载均衡、优先级等多维度评分选择最优 Agent
- **可配置**：公司级/项目级可配置调度策略，支持策略扩展
- **高可用**：独立进程部署，事件驱动 + 常驻循环兜底，支持多实例并发
- **可观测**：完整调度审计日志，每个分配决策可追溯

## 3. 系统架构

### 3.1 架构位置

```
┌──────────────────────────────────────────────────────┐
│                    现有后端 Server                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────┐ │
│  │ Key 池   │  │Agent 池  │  │HR Agent  │  │Worksp│ │
│  └──────────┘  └──────────┘  └──────────┘  └──────┘ │
└────────────────────────┬──────────────────────────────┘
                         │ REST API / 共享 DB
                         ▼
┌──────────────────────────────────────────────────────┐
│                  中央调度器 (独立进程)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ 任务队列管理   │  │ Agent 匹配器  │  │ 策略引擎      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │ 调度循环      │  │ Event Listener│                   │
│  └──────────────┘  └──────────────┘                    │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│                      PostgreSQL                        │
│  ┌──────────┐  ┌──────────────┐  ┌────────┐  ┌────┐ │
│  │ agents   │  │scheduler_queu│  │projects│  │issue│ │
│  │ api_keys │  │scheduler_logs│  │scheduler│  │     │ │
│  │          │  │              │  │_config  │  │     │ │
│  └──────────┘  └──────────────┘  └────────┘  └────┘ │
└──────────────────────────────────────────────────────┘
```

### 3.2 部署方式

- 独立 Node.js 进程，通过 tsx 启动
- 与主 Server 共享同一个 PostgreSQL 数据库
- 通过 REST API 与主 Server 通信（任务入队接口）
- 启动/停止由 `dev-runner.ts` 统一管理

## 4. 数据模型

### 4.1 scheduler_queue — 任务队列

```sql
CREATE TABLE scheduler_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  source_type   TEXT NOT NULL,     -- 'issue' | 'ai_company'
  source_id     TEXT NOT NULL,     -- issue.id 或内部任务 ID
  title         TEXT NOT NULL,
  description   TEXT,
  required_tags TEXT[],
  priority      INT NOT NULL DEFAULT 3,  -- 1=紧急 2=高 3=中 4=低
  status        TEXT NOT NULL DEFAULT 'pending',
                -- pending | assigned | running | completed | failed | cancelled
  assigned_to   UUID REFERENCES agents(id),
  strategy_name TEXT NOT NULL DEFAULT 'best_fit',
  retry_count   INT NOT NULL DEFAULT 0,
  max_retries   INT NOT NULL DEFAULT 3,
  last_error    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_at  TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,

  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_agent FOREIGN KEY (assigned_to) REFERENCES agents(id)
);

CREATE INDEX idx_queue_pending
  ON scheduler_queue (priority ASC, created_at ASC)
  WHERE status = 'pending';

CREATE INDEX idx_queue_company
  ON scheduler_queue (company_id, status);
```

### 4.2 scheduler_logs — 调度审计日志

```sql
CREATE TABLE scheduler_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL,
  queue_id      UUID NOT NULL REFERENCES scheduler_queue(id),
  agent_id      UUID REFERENCES agents(id),
  action        TEXT NOT NULL,
                -- 'enqueued' | 'assigned' | 'completed' | 'failed'
                -- | 'retried' | 'cancelled' | 'reassigned'
  reason        TEXT,
  details       JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scheduler_logs_queue
  ON scheduler_logs (queue_id, created_at);
```

### 4.3 scheduler_config — 策略配置

```sql
CREATE TABLE scheduler_config (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  project_id    UUID REFERENCES projects(id),
  strategy_name TEXT NOT NULL DEFAULT 'best_fit',
                -- 'best_fit' | 'round_robin' | 自定义策略
  config        JSONB NOT NULL DEFAULT '{}',
                -- best_fit: {"skill_weight": 0.6, "load_weight": 0.2, "recency_weight": 0.2}
                -- round_robin: {}
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (company_id, project_id)
);
```

## 5. 策略引擎

### 5.1 策略接口

```typescript
interface SchedulerStrategy {
  name: string;

  /** 从待办任务池中选择一个任务 */
  pickTask(queue: Task[]): Task | null;

  /** 为任务选择最合适的 Agent */
  selectAgent(
    task: Task,
    candidates: AvailableAgent[],
    config: StrategyConfig,
  ): Promise<AgentSelection | null>;
}

interface Task {
  id: string;
  priority: number;
  requiredTags: string[];
  createdAt: Date;
}

interface AvailableAgent {
  id: string;
  name: string;
  tags: string[];
  currentTasks: number;
  maxConcurrency: number;
  lastCompletedAt: Date | null;
}

interface AgentSelection {
  agentId: string;
  reason: string;
  score?: number;
}
```

### 5.2 内置策略

**BestFitStrategy（默认）**：
分数 = skillMatch × 0.6 + loadScore × 0.2 + recencyScore × 0.2

- skillMatch：匹配标签数 / 所需标签数
- loadScore：1 - (currentTasks / maxConcurrency)
- recencyScore：最近完成任务的时间占比（越近期越高）

**RoundRobinStrategy**：
按优先级排队，匹配标签的 Agent 中轮询分配。

### 5.3 策略注册

```typescript
class StrategyRegistry {
  private strategies = new Map<string, SchedulerStrategy>();

  register(strategy: SchedulerStrategy): void { ... }
  get(name: string): SchedulerStrategy { ... }  // fallback to best_fit
}
```

## 6. 调度循环

### 6.1 混合模式

1. **事件驱动**：任务入队时 PostgreSQL NOTIFY "new_task" 唤醒调度器立即执行
2. **常驻循环兜底**：启动时扫描所有 pending 任务；空闲时定期 tick 检查积压任务

### 6.2 调度事务

每条调度分配在单个事务内完成：

```sql
BEGIN;
  SELECT ... FROM scheduler_queue
    WHERE status = 'pending'
    ORDER BY priority, created_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1;

  -- 读取公司/项目策略配置
  -- 读取候选 Agent（idle 且 tags 匹配）
  -- 调用 strategy.selectAgent()

  UPDATE scheduler_queue SET status='assigned', assigned_to=?, scheduled_at=now();
  UPDATE agents SET current_tasks = current_tasks + 1, status='working';
  INSERT INTO scheduler_logs (...);
COMMIT;
```

### 6.3 无合适 Agent 的处理策略

这是调度器最关键的异常场景。系统监测到没有可用 Agent 时，按以下优先级降级处理：

| 步骤 | 策略 | 说明 |
|------|------|------|
| 1 | **严格匹配** | 选 tags 完全匹配且空闲的 Agent。没有则进入下一步 |
| 2 | **模糊降级** | 放宽标签匹配条件，选部分 tags 匹配的 Agent（至少匹配 1 个标签）。附带 reason: "partial_match" |
| 3 | **负载容忍** | 允许选择 currentTasks 接近但未达到 maxConcurrency 的 Agent（负载 80% 以上但未满的 Agent） |
| 4 | **应急通道** | 选择公司内任何 idle 状态的 Agent 作为 fallback，不要求标签匹配 |
| 5 | **通知等待** | 以上都不行时：任务保持 pending，发送系统通知（通知公司管理员：缺少具备 X 技能的 Agent） |

每一步都会记录到 scheduler_logs，方便审计和排障。

### 6.4 重试与失败

| 场景 | 行为 |
|------|------|
| 无任何可用 Agent（步骤 5） | 任务保持 pending，记录 lack_of_agents 原因，发通知 |
| Agent 执行超时 | retry_count + 1，重新入队 |
| 达到 max_retries | 标记为 failed，记录 last_error |
| Agent 崩溃离线 | 心跳检测到 Agent offline → 任务重新入队 |

## 7. 接口设计

### 7.1 内部 REST API（调度器 ↔ 主 Server）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/scheduler/enqueue | 入队新任务 |
| POST | /api/scheduler/cancel | 取消待办任务 |
| GET  | /api/scheduler/queue | 查看队列状态 |
| GET  | /api/scheduler/stats | 调度统计 |

### 7.2 入队请求格式

```typescript
interface EnqueueRequest {
  companyId: string;
  sourceType: 'issue' | 'ai_company';
  sourceId: string;
  title: string;
  description?: string;
  requiredTags?: string[];
  priority?: number;       // 默认 3
  strategyName?: string;   // 默认 'best_fit'
  scheduledAt?: string;    // 定时调度
}
```

## 8. 未纳入范围

- **Agent 执行状态监控**（Agent 内部超时、心跳检测属于 Agent 运行时，非调度器职责）
- **任务分解**（HR Agent 或用户负责将项目分解为可调度任务）
- **跨公司调度**（调度器作用域限定在公司内）
