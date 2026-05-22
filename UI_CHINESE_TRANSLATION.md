# Paperclip UI 中文翻译 — 项目进度与交接文档

## 概述

本项目的目标是将 Paperclip 的整个前端 UI 从英文翻译为中文（zh-CN）。项目使用 **react-i18next** + **i18next** 作为国际化方案，翻译文件位于 `ui/src/i18n/locales/`。

## 技术架构

### i18n 配置
- **入口**: `ui/src/i18n/index.ts`
- **语言加载**: `ui/src/i18n/locales.ts` — 使用 Vite 的 `import.meta.glob` 自动加载 `locales/*.json`
- **校验**: `ui/src/i18n/locale-validation.ts` — 启动时校验所有语言文件必须与 `en.json` 的 key 结构一致（不能多不能少）
- **回退语言**: `en`（缺失的 key 自动显示英文）
- **切换持久化**: 语言偏好保存在 `localStorage`，key 为 `locale`
- **默认语言**: `en`

### 翻译 key 命名规范
格式：`{area}.{component}.{name}`

示例：
- `nav.sidebar.dashboard` — 导航/侧边栏/仪表盘
- `banner.restart.required` — 横幅/重启/需要
- `notFound.pageNotFound` — 未找到/页面未找到

### 翻译文件
- `en.json` — 英文参考（Source of Truth，所有 key 必须在此定义）
- `zh-CN.json` — 中文翻译
- 其他 38 个语言文件 — 自动同步了 en.json 的结构，新增 key 暂时用英文值填充

## 当前进度

### ✅ Phase 2 完成 — Dashboard 仪表盘页面

涉及 3 个组件文件，全部已添加 `useTranslation` + `t()` 调用：

| 文件 | 状态 |
|------|------|
| `ui/src/pages/Dashboard.tsx` | ✅ 已完成（所有文本已替换为翻译 key） |
| `ui/src/components/ActiveAgentsPanel.tsx` | ✅ 已完成（包括 AgentRunCard 内部） |
| `ui/src/components/ActivityCharts.tsx` | ✅ 已完成（Run/Priority/Status/Success 图表） |

已添加约 **70 个** 翻译 key，覆盖：
- `dashboard.*` — 欢迎语、指标卡片、空状态、预算警示、活动/任务列表
- `chart.*` — 图表标题、空状态提示、状态标签（待办/进行中/审核中/已完成等）
- `chart.priority.*` — 优先级标签（紧急/高/中/低）
- `agents.panel.*` — 智能体面板标题、空状态、运行状态（正在运行/结束/开始）

### 额外修复
- 所有 40 个语言文件自动同步了 Phase 2 新增 key 的结构

### 当前范围

Phase 1（侧边栏/导航/横幅）+ Phase 2（仪表盘）已完成，共约 160 个翻译 key。

## 下步目标（Phase 3+）

### Phase 2 — Dashboard 仪表盘页面
- `ui/src/pages/Dashboard/` 下的所有文件
- 包含：总览、统计数据、图表标签等

### Phase 3 — Agents 智能体页面（下一阶段）
- `ui/src/pages/Agents.tsx`、`AgentDetail.tsx`、`AiCompanyAgents.tsx`、`NewAgent.tsx` 等
- 包含：智能体列表、详情、配置表单等

### Phase 4 — Issues 工单页面
- `ui/src/pages/Issues.tsx`、`IssueDetail.tsx`、`MyIssues.tsx` 等
- 包含：工单列表、详情、评论区、状态标签等

### Phase 5 — Projects 项目页面
- `ui/src/pages/Projects.tsx`、`ProjectDetail.tsx`、`ProjectWorkspaceDetail.tsx` 等

### Phase 6 — Settings 设置页面
- 实例设置页面内容：`InstanceSettings.tsx`、`InstanceGeneralSettings.tsx`、`InstanceAccess.tsx` 等
- 公司设置页面内容：`CompanySettings.tsx`、`CompanyAccess.tsx`、`CompanyEnvironments.tsx` 等
- 用户个人资料设置：`ProfileSettings.tsx`、`UserProfile.tsx`

### Phase 7 — 其他页面
- Search（搜索）、Inbox（收件箱）、Activity（活动）、Costs（费用）、Goals（目标）、Routines（例程）、Approvals（审批）、Org（组织）、Secrets（密钥）等

### Phase 8 — 剩余组件
- 弹窗、对话框、Toast 通知、表单组件等

## 实现注意事项

### 给下一个开发者的提示

1. **先更新 en.json**：所有新翻译 key 必须先在 `en.json` 中定义，否则其他语言文件校验会失败
2. **所有语言文件必须同步**: 新增 key 后需要更新所有 40 个语言 JSON 文件，否则 `locale-validation.ts` 会阻止应用启动
   - 可以用脚本自动同步：`node -e "const fs=require('fs'); ... deepMerge(target, source)"` 合并结构
3. **不要复制中文到 en.json**：`en.json` 应保持英文原文，用作翻译参考
4. **插值表达式必须一致**：翻译值中的 `{{variable}}` 占位符必须与 `en.json` 完全一致
5. **语言切换位置**：左下角头像 → 弹出菜单底部「切换到中文」按钮
6. **注意组件作用域**：`memo()` 包裹的子组件需要各自调用 `useTranslation()`，不能从父组件传递 `t`
7. **验证方式**：
   - 类型检查：`pnpm -r typecheck`
   - 本地校验：`node -e "验证 locale key 结构一致性"`（见本文档校验逻辑）
   - 启动：`pnpm dev`（后端）+ `pnpm dev:ui`（前端 Vite）
   - 访问 `http://localhost:5173/`
   - 左下角头像 → 切换到中文
   - 检查控制台无 i18n missing key 报错

### 已知限制
- 目前只有 Phase 1-2 的组件已翻译，其余页面仍为英文
- 部分组件可能在重构中，翻译 key 需要同步更新
- 语言切换不会触发 `useMemo`/`useCallback` 的重新计算（已在 `MobileBottomNav` 中通过移除 `useMemo` 解决）
