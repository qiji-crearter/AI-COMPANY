# UI Chinese Translation Phase 5-8 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or dispatching-parallel-agents.

**Goal:** Complete all remaining Chinese (zh-CN) UI translations for Pages 5-8

**Approach:** Each page file is independent - dispatch parallel agents per page. For each file: (1) find hardcoded English strings, (2) add keys to en.json and zh-CN.json, (3) replace strings with t() calls, (4) typecheck.

**Key constraint:** All translation keys must be added to BOTH en.json and zh-CN.json. zh-CN.json keys must match en.json structure exactly (locale-validation.ts enforces this).

---

### Task 1: Phase 5 - Projects pages

**Files to modify:**
- `ui/src/pages/Projects.tsx` - ~4 hardcoded strings, simple
- `ui/src/pages/ProjectDetail.tsx` - ~14 hardcoded strings
- `ui/src/pages/ProjectWorkspaceDetail.tsx` - ~51 hardcoded strings

Add translation keys under `projects.*` namespace.

### Task 2: Phase 6a - Instance settings pages

**Files to modify:**
- `ui/src/pages/InstanceSettings.tsx` - sidebar/tabs with hardcoded strings
- `ui/src/pages/InstanceGeneralSettings.tsx`
- `ui/src/pages/InstanceExperimentalSettings.tsx`
- `ui/src/pages/InstanceAccess.tsx`

Use existing keys in `instanceSidebar.*` namespace, add new keys under `instanceSettings.*`.

### Task 3: Phase 6b - Company settings pages

**Files to modify:**
- `ui/src/pages/CompanySettings.tsx`
- `ui/src/pages/CompanyAccess.tsx`
- `ui/src/pages/CompanyEnvironments.tsx`
- `ui/src/pages/CompanyInvites.tsx`
- `ui/src/pages/CompanySkills.tsx`
- `ui/src/pages/Secrets.tsx`
- `ui/src/pages/ProfileSettings.tsx`

Use existing keys in `companySettingsSidebar.*` namespace, add new keys under `companySettings.*`.

### Task 4: Phase 7 - Other pages (Goals, Org, Costs, Activity, Search, Approval, Routine)

**Files to modify:**
- `ui/src/pages/Goals.tsx`
- `ui/src/pages/GoalDetail.tsx`
- `ui/src/pages/Org.tsx`
- `ui/src/pages/Costs.tsx`
- `ui/src/pages/Activity.tsx`
- `ui/src/pages/Search.tsx`
- `ui/src/pages/Approvals.tsx`
- `ui/src/pages/ApprovalDetail.tsx`
- `ui/src/pages/Routines.tsx`
- `ui/src/pages/RoutineDetail.tsx`
- `ui/src/pages/Inbox.tsx`
