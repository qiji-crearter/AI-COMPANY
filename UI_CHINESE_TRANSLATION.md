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

### ✅ Phase 1 完成 — 侧边栏 + 导航 + 横幅 + 基础组件

涉及 13 个组件文件，全部已添加 `useTranslation` + `t()` 调用：

| 文件 | 状态 |
|------|------|
| `ui/src/components/Sidebar.tsx` | ✅ 已完成 |
| `ui/src/components/SidebarNavItem.tsx` | ✅ 已完成 |
| `ui/src/components/SidebarSection.tsx` | ✅ 已完成 |
| `ui/src/components/MobileBottomNav.tsx` | ✅ 已完成 |
| `ui/src/components/DevRestartBanner.tsx` | ✅ 已完成 |
| `ui/src/components/WorktreeBanner.tsx` | ✅ 已完成 |
| `ui/src/components/Layout.tsx` | ✅ 已完成 |
| `ui/src/components/BreadcrumbBar.tsx` | ✅ 已完成 |
| `ui/src/components/InstanceSidebar.tsx` | ✅ 已完成 |
| `ui/src/components/CompanySettingsSidebar.tsx` | ✅ 已完成 |
| `ui/src/components/SidebarAccountMenu.tsx` | ✅ 已完成 |
| `ui/src/pages/NotFound.tsx` | ✅ 已完成 |
| `ui/src/i18n/index.ts` | ✅ 已更新（localStorage 持久化） |

已添加约 **90 个** 翻译 key，覆盖：
- `nav.*` — 侧边栏、导航、移动端导航
- `banner.restart.*` — 开发重启横幅
- `layout.*` / `breadcrumb.*` — 布局与面包屑
- `worktreeBanner.*` — 工作树横幅
- `notFound.*` — 404 页面
- `instanceSidebar.*` / `companySettingsSidebar.*` — 设置侧边栏
- `accountMenu.*` — 账户菜单

### 额外修复
- `packages/db/src/migrations/0087_nervous_surge.sql` — 修复迁移文件中重复 CREATE TABLE 的问题（添加 `IF NOT EXISTS`）
- `ui/src/i18n/index.ts` — 添加语言切换的 localStorage 持久化
- 所有 39 个语言 JSON 文件 — 同步了 en.json 的 key 结构

## 下步目标（Phase 2+）

### Phase 2 — Dashboard 仪表盘页面
- `ui/src/pages/Dashboard/` 下的所有文件
- 包含：总览、统计数据、图表标签等

### Phase 3 — Agents 智能体页面
- `ui/src/pages/Agents/` 下的所有文件
- 包含：智能体列表、详情、配置表单等

### Phase 4 — Issues 工单页面
- `ui/src/pages/Issues/` 下的所有文件
- 包含：工单列表、详情、评论区、状态标签等

### Phase 5 — Projects 项目页面
- `ui/src/pages/Projects/` 下的所有文件

### Phase 6 — Settings 设置页面
- 实例设置页面内容
- 公司设置页面内容
- 用户个人资料设置

### Phase 7 — 其他页面
- Search（搜索）、Inbox（收件箱）、Activity（活动）、Costs（费用）等

### Phase 8 — 剩余组件
- 弹窗、对话框、Toast 通知、表单组件等

## 实现注意事项

### 给下一个开发者的提示

1. **先更新 en.json**：所有新翻译 key 必须先在 `en.json` 中定义，否则其他语言文件校验会失败
2. **所有语言文件必须同步**: 新增 key 后需要更新所有 40 个语言 JSON 文件，否则 `locale-validation.ts` 会阻止应用启动
   - 可以用脚本自动同步：读 `en.json` 的 key 结构，merge 到其他语言文件
3. **不要复制中文到 en.json**：`en.json` 应保持英文原文，用作翻译参考
4. **插值表达式必须一致**：翻译值中的 `{{variable}}` 占位符必须与 `en.json` 完全一致
5. **语言切换位置**：左下角头像 → 弹出菜单底部「切换到中文」按钮
6. **验证方式**：
   - 启动：`pnpm dev`（后端）+ `pnpm dev:ui`（前端 Vite）
   - 访问 `http://localhost:5173/`
   - 左下角头像 → 切换到中文
   - 检查控制台无 i18n missing key 报错

### 已知限制
- 目前只有 Phase 1 的组件已翻译，其余页面仍为英文
- 部分组件可能在重构中，翻译 key 需要同步更新
- 语言切换不会触发 `useMemo`/`useCallback` 的重新计算（已在 `MobileBottomNav` 中通过移除 `useMemo` 解决）
