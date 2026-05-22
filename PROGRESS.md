# Paperclip + AI Company 开发进度

> 最后更新: 2026-05-22
> 基于 ROADMAP.md、SPEC.md、AI公司设计文档 和代码现状整理

---

## 图例

| 符号 | 含义 |
|------|------|
| ✅ | 已完成 |
| 🔄 | 开发中 |
| ⏳ | 待开发 |
| 🐞 | UI 存在但功能未完成 |
| 📋 | 规划中/未开始 |

---

## 一、Paperclip 核心控制面

### 1.1 已完成功能
- [x] 公司 CRUD (create/list/get/update/archive) — ✅
- [x] Agent CRUD (create/edit/pause/resume/terminate) — ✅
- [x] 组织架构图 (Org Chart) — ✅
- [x] 任务管理 (Issues) 完整生命周期 — ✅
- [x] 原子 checkout (并发冲突保护) — ✅
- [x] 项目 CRUD + 项目工作空间管理 — ✅
- [x] 审批流 (Agent 录用/策略审批) — ✅
- [x] 成本追踪 (按 Agent/任务/项目/公司聚合) — ✅
- [x] 预算控制 (软告警 + 硬上限自动暂停) — ✅
- [x] 心跳调度与适配器系统 (8+ 内置适配器) — ✅
- [x] 活动日志 (activity_log 可审计) — ✅
- [x] 插件系统 (本地/自托管插件运行时) — ✅
- [x] 定时任务 (Routines) — ✅
- [x] 公司导入/导出 (markdown + .paperclip.yaml) — ✅
- [x] 多用户认证 + Agent API Key — ✅
- [x] 密钥管理 (Secrets) — ✅
- [x] 技能管理器 (Skills) — ✅
- [x] 国际化 (i18n，支持 40+ 语言) — ✅
- [x] 执行工作空间 (Execution Workspaces) — ✅
- [x] 内联实体选择器 (Assignee/Reviewer/Approver) — ✅

### 1.2 UI 小缺失
- [x] Labels 标签芯片 — 🐞 按钮被注释掉，标注 "not wired up yet"
- [x] Agent 技能标签页 — 🐞 被移除，`// TODO: bring back later`
- [x] 开始日期 / 截止日期 — 🐞 按钮存在但不执行操作
- [x] Issue 过滤视图 (/issues/all, /active, /backlog 等) — 🐞 全部重定向到 /issues
- [x] Issue Worktree 运行时配置 UI — 🐞 TODO 禁用，等待 feature 就绪

---

## 二、ROADMAP 远期规划 (未开始)

| 功能 | 优先级 | 说明 |
|------|--------|------|
| Cloud / Sandbox agents | ⏳ | Cursor / e2b 等远程沙箱 Agent |
| Artifacts & Work Products | ⏳ | 产出物（代码、预览、交付件）的一等公民支持 |
| Memory / Knowledge | ⏳ | 持久记忆和知识库 |
| Enforced Outcomes | ⏳ | 更强的工作完成定义 |
| MAXIMIZER MODE | ⏳ | 更高自主度的执行模式 |
| Deep Planning | ⏳ | 策略规划和工作分解 |
| Work Queues | ⏳ | 工单队列（支持/分类/积压工作流） |
| Self-Organization | ⏳ | Agent 自主提出组织架构调整 |
| Automatic Organizational Learning | ⏳ | 从完成工作中自动沉淀组织知识 |
| CEO Chat | ⏳ | 与领导层 Agent 的轻量对话 |
| Cloud Deployments | ⏳ | 云端部署 |
| Desktop App | ⏳ | 桌面应用 |

---

## 三、AI 公司框架 (核心缺口)

AI 公司设计文档规划的模块，目前 `/ai-company/*` 下 4 个页面均为占位页。

### 3.1 Phase 1 — 基础设施 (P0)

| 模块 | 状态 | 依赖 |
|------|------|------|
| **Key 池独立管理** | ⏳ | 无 |
| **Agent 池独立管理** | ⏳ | 无 |
| **中央调度器（纯程序）** | ⏳ | Key 池、Agent 池 |

Key 池和 Agent 池是后续所有功能的前提。中央调度器是整个框架的编排骨架。

### 3.2 Phase 2 — 核心闭环 (MVP)

| 模块 | 状态 | 依赖 |
|------|------|------|
| **HR Agent 引擎** | ⏳ | Phase 1 |
| **项目工作空间（协作/Review）** | ⏳ | Phase 1 |
| **成本阈值确认机制** | ⏳ | Phase 1 |

完成此阶段后可行: 提需求 → HR 分析 → 推荐团队 → 确认/自动组建 → 项目启动工作。

### 3.3 Phase 3 — 体验完善

| 模块 | 状态 | 依赖 |
|------|------|------|
| **替换 AI Company 占位页** | ⏳ | Phase 2 (有真实数据可接入) |
| **Dashboard 交互下钻** | ⏳ | Phase 2 |
| **CLI 命令体系 (ai-company)** | ⏳ | Phase 1 |
| **上下文管理 (写文档→自杀→恢复)** | ⏳ | Phase 2 |

### 3.4 Phase 4 — 高级功能

| 模块 | 状态 | 依赖 |
|------|------|------|
| **移动聊天入口 (Telegram Bot)** | ⏳ | Phase 2 |
| **CEO Chat** | ⏳ | ROADMAP |
| **Deep Planning** | ⏳ | ROADMAP |
| **Work Queues** | ⏳ | ROADMAP |
| **Memory / Knowledge** | ⏳ | ROADMAP |
| **Self-Organization** | ⏳ | ROADMAP |
| **MAXIMIZER MODE** | ⏳ | ROADMAP |
| **Cloud Deployments** | ⏳ | ROADMAP |
| **Desktop App** | ⏳ | ROADMAP |

---

## 四、推荐开发路径

```
Phase 1 ─────────────────────────────────────────────
  Key 池独立管理 ──→ Agent 池独立管理 ──→ 中央调度器
       │                     │
       └─────────┬───────────┘
                 ▼
Phase 2 ─────────────────────────────────────────────
  HR Agent 引擎 ──→ 项目工作空间 ──→ 成本阈值确认
                 │
                 ▼
Phase 3 ─────────────────────────────────────────────
  AI Company 真实页面 ──→ Dashboard 下钻 ──→ CLI 命令
                                                   │
                                                   ▼
Phase 4 ─────────────────────────────────────────────
  移动入口 ──→ 高级 ROADMAP 功能
```

### 核心理念

1. **基础设施优先** — Key 池和 Agent 池是地基，必须先做
2. **闭环先行** — Phase 2 跑通"需求→组队→干活"的完整链路，再优化体验
3. **不做空壳** — Dashboard 和 CLI 服务于核心流程，核心跑通前不做
4. **小问题穿插** — UI 小缺失（Labels、技能标签等）可以随时顺手修
