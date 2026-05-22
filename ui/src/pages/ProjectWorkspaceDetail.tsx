import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "@/lib/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isUuidLike, type ProjectWorkspace } from "@paperclipai/shared";
import { ArrowLeft, Check, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs } from "@/components/ui/tabs";
import { ChoosePathButton } from "../components/PathInstructionsModal";
import { MissingPluginTabPlaceholder } from "../components/MissingPluginTabPlaceholder";
import { projectsApi } from "../api/projects";
import { PageTabBar } from "../components/PageTabBar";
import { PluginSlotMount, usePluginSlots } from "@/plugins/slots";
import {
  buildWorkspaceRuntimeControlSections,
  WorkspaceRuntimeControls,
  type WorkspaceRuntimeControlRequest,
} from "../components/WorkspaceRuntimeControls";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";
import { queryKeys } from "../lib/queryKeys";
import { projectRouteRef, projectWorkspaceUrl } from "../lib/utils";

type WorkspaceFormState = {
  name: string;
  sourceType: ProjectWorkspaceSourceType;
  cwd: string;
  repoUrl: string;
  repoRef: string;
  defaultRef: string;
  visibility: ProjectWorkspaceVisibility;
  setupCommand: string;
  cleanupCommand: string;
  remoteProvider: string;
  remoteWorkspaceRef: string;
  sharedWorkspaceKey: string;
  runtimeConfig: string;
};

type ProjectWorkspaceSourceType = ProjectWorkspace["sourceType"];
type ProjectWorkspaceVisibility = ProjectWorkspace["visibility"];
type ProjectWorkspaceBaseTab = "configuration";
type ProjectWorkspacePluginTab = `plugin:${string}`;
type ProjectWorkspaceTab = ProjectWorkspaceBaseTab | ProjectWorkspacePluginTab;
type OrderedProjectWorkspaceTabItem = {
  value: ProjectWorkspaceTab;
  label: string;
  order: number;
};

const DEFAULT_PLUGIN_DETAIL_TAB_ORDER = 100;
function getProjectWorkspaceBaseTabItems(t: (key: string) => string): OrderedProjectWorkspaceTabItem[] {
  return [
    { value: "configuration", label: t("projects.workspace.configurationTab"), order: 30 },
  ];
}

function isProjectWorkspacePluginTab(value: string | null): value is ProjectWorkspacePluginTab {
  return typeof value === "string" && value.startsWith("plugin:");
}

function projectWorkspaceTabFromSearch(search: string): ProjectWorkspaceTab {
  const tab = new URLSearchParams(search).get("tab");
  if (isProjectWorkspacePluginTab(tab)) return tab;
  return "configuration";
}

function orderProjectWorkspaceTabItems(items: OrderedProjectWorkspaceTabItem[]) {
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => left.item.order - right.item.order || left.index - right.index)
    .map(({ item }) => item);
}

function getSourceTypeOptions(t: (key: string) => string): Array<{ value: ProjectWorkspaceSourceType; label: string; description: string }> {
  return [
    { value: "local_path", label: t("projects.workspace.sourceTypes.localPath"), description: t("projects.workspace.sourceTypes.localPathDesc") },
    { value: "non_git_path", label: t("projects.workspace.sourceTypes.nonGitPath"), description: t("projects.workspace.sourceTypes.nonGitPathDesc") },
    { value: "git_repo", label: t("projects.workspace.sourceTypes.gitRepo"), description: t("projects.workspace.sourceTypes.gitRepoDesc") },
    { value: "remote_managed", label: t("projects.workspace.sourceTypes.remoteManaged"), description: t("projects.workspace.sourceTypes.remoteManagedDesc") },
  ];
}

function getVisibilityOptions(t: (key: string) => string): Array<{ value: ProjectWorkspaceVisibility; label: string }> {
  return [
    { value: "default", label: t("projects.workspace.visibility.default") },
    { value: "advanced", label: t("projects.workspace.visibility.advanced") },
  ];
}

function isSafeExternalUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isAbsolutePath(value: string) {
  return value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value);
}

function readText(value: string | null | undefined) {
  return value ?? "";
}

function formatJson(value: Record<string, unknown> | null | undefined) {
  if (!value || Object.keys(value).length === 0) return "";
  return JSON.stringify(value, null, 2);
}

function formStateFromWorkspace(workspace: ProjectWorkspace): WorkspaceFormState {
  return {
    name: workspace.name,
    sourceType: workspace.sourceType,
    cwd: readText(workspace.cwd),
    repoUrl: readText(workspace.repoUrl),
    repoRef: readText(workspace.repoRef),
    defaultRef: readText(workspace.defaultRef),
    visibility: workspace.visibility,
    setupCommand: readText(workspace.setupCommand),
    cleanupCommand: readText(workspace.cleanupCommand),
    remoteProvider: readText(workspace.remoteProvider),
    remoteWorkspaceRef: readText(workspace.remoteWorkspaceRef),
    sharedWorkspaceKey: readText(workspace.sharedWorkspaceKey),
    runtimeConfig: formatJson(workspace.runtimeConfig?.workspaceRuntime),
  };
}

function normalizeText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseRuntimeConfigJson(value: string, t: (key: string) => string) {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true as const, value: null as Record<string, unknown> | null };

  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        ok: false as const,
        error: t("projects.workspace.validation.invalidJsonObject"),
      };
    }
    return { ok: true as const, value: parsed as Record<string, unknown> };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : t("projects.workspace.validation.invalidJson"),
    };
  }
}

function buildWorkspacePatch(initialState: WorkspaceFormState, nextState: WorkspaceFormState, t: (key: string) => string) {
  const patch: Record<string, unknown> = {};
  const maybeAssign = (key: keyof WorkspaceFormState, transform?: (value: string) => unknown) => {
    const initialValue = initialState[key];
    const nextValue = nextState[key];
    if (initialValue === nextValue) return;
    patch[key] = transform ? transform(nextValue) : nextValue;
  };

  maybeAssign("name", normalizeText);
  maybeAssign("sourceType");
  maybeAssign("cwd", normalizeText);
  maybeAssign("repoUrl", normalizeText);
  maybeAssign("repoRef", normalizeText);
  maybeAssign("defaultRef", normalizeText);
  maybeAssign("visibility");
  maybeAssign("setupCommand", normalizeText);
  maybeAssign("cleanupCommand", normalizeText);
  maybeAssign("remoteProvider", normalizeText);
  maybeAssign("remoteWorkspaceRef", normalizeText);
  maybeAssign("sharedWorkspaceKey", normalizeText);
  if (initialState.runtimeConfig !== nextState.runtimeConfig) {
    const parsed = parseRuntimeConfigJson(nextState.runtimeConfig, t);
    if (!parsed.ok) throw new Error(parsed.error);
    patch.runtimeConfig = {
      workspaceRuntime: parsed.value,
    };
  }

  return patch;
}

function validateWorkspaceForm(form: WorkspaceFormState, t: (key: string) => string) {
  const cwd = normalizeText(form.cwd);
  const repoUrl = normalizeText(form.repoUrl);
  const remoteWorkspaceRef = normalizeText(form.remoteWorkspaceRef);

  if (form.sourceType === "remote_managed") {
    if (!remoteWorkspaceRef && !repoUrl) {
      return t("projects.workspace.validation.remoteManagedRequired");
    }
  } else if (!cwd && !repoUrl) {
    return t("projects.workspace.validation.requiresPathOrUrl");
  }

  if (cwd && (form.sourceType === "local_path" || form.sourceType === "non_git_path") && !isAbsolutePath(cwd)) {
    return t("projects.workspace.validation.pathMustBeAbsolute");
  }

  if (repoUrl) {
    try {
      new URL(repoUrl);
    } catch {
      return t("projects.workspace.validation.repoUrlMustBeValid");
    }
  }

  const runtimeConfig = parseRuntimeConfigJson(form.runtimeConfig, t);
  if (!runtimeConfig.ok) {
    return runtimeConfig.error;
  }

  return null;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
        {hint ? <span className="text-[11px] leading-relaxed text-muted-foreground sm:text-right">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 py-1.5 sm:flex-row sm:items-start sm:gap-3">
      <div className="shrink-0 text-xs text-muted-foreground sm:w-28">{label}</div>
      <div className="min-w-0 flex-1 text-sm">{children}</div>
    </div>
  );
}

export function ProjectWorkspaceDetail() {
  const { companyPrefix, projectId, workspaceId } = useParams<{
    companyPrefix?: string;
    projectId: string;
    workspaceId: string;
  }>();
  const { companies, selectedCompanyId, setSelectedCompanyId } = useCompany();
  const { t } = useTranslation();
  const { setBreadcrumbs } = useBreadcrumbs();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<WorkspaceFormState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [runtimeActionMessage, setRuntimeActionMessage] = useState<string | null>(null);
  const routeProjectRef = projectId ?? "";
  const routeWorkspaceId = workspaceId ?? "";
  const activeTab = useMemo(() => projectWorkspaceTabFromSearch(location.search), [location.search]);

  const routeCompanyId = useMemo(() => {
    if (!companyPrefix) return null;
    const requestedPrefix = companyPrefix.toUpperCase();
    return companies.find((company) => company.issuePrefix.toUpperCase() === requestedPrefix)?.id ?? null;
  }, [companies, companyPrefix]);

  const lookupCompanyId = routeCompanyId ?? selectedCompanyId ?? undefined;
  const canFetchProject = routeProjectRef.length > 0 && (isUuidLike(routeProjectRef) || Boolean(lookupCompanyId));
  const projectQuery = useQuery({
    queryKey: [...queryKeys.projects.detail(routeProjectRef), lookupCompanyId ?? null],
    queryFn: () => projectsApi.get(routeProjectRef, lookupCompanyId),
    enabled: canFetchProject,
  });

  const project = projectQuery.data ?? null;
  const workspace = useMemo(
    () => project?.workspaces.find((item) => item.id === routeWorkspaceId) ?? null,
    [project, routeWorkspaceId],
  );
  const canonicalProjectRef = project ? projectRouteRef(project) : routeProjectRef;
  const initialState = useMemo(() => (workspace ? formStateFromWorkspace(workspace) : null), [workspace]);
  const isDirty = Boolean(form && initialState && JSON.stringify(form) !== JSON.stringify(initialState));
  const {
    slots: pluginDetailSlots,
    isLoading: pluginDetailSlotsLoading,
    errorMessage: pluginDetailSlotsError,
  } = usePluginSlots({
    slotTypes: ["detailTab"],
    entityType: "project_workspace",
    companyId: project?.companyId ?? null,
    enabled: Boolean(project?.companyId),
  });
  const pluginTabItems = useMemo(
    () => pluginDetailSlots.map((slot) => ({
      value: `plugin:${slot.pluginKey}:${slot.id}` as ProjectWorkspacePluginTab,
      label: slot.displayName,
      order: slot.order ?? DEFAULT_PLUGIN_DETAIL_TAB_ORDER,
      slot,
    })),
    [pluginDetailSlots],
  );
  const tabItems = useMemo(
    () => orderProjectWorkspaceTabItems([...getProjectWorkspaceBaseTabItems(t), ...pluginTabItems]),
    [pluginTabItems],
  );

  useEffect(() => {
    if (!project?.companyId || project.companyId === selectedCompanyId) return;
    setSelectedCompanyId(project.companyId, { source: "route_sync" });
  }, [project?.companyId, selectedCompanyId, setSelectedCompanyId]);

  useEffect(() => {
    if (!workspace) return;
    setForm(formStateFromWorkspace(workspace));
    setErrorMessage(null);
  }, [workspace]);

  useEffect(() => {
    if (!project) return;
    setBreadcrumbs([
      { label: t("projects.workspace.breadcrumb.projects"), href: "/projects" },
      { label: project.name, href: `/projects/${canonicalProjectRef}` },
      { label: t("projects.workspace.breadcrumb.workspaces"), href: `/projects/${canonicalProjectRef}/workspaces` },
      { label: workspace?.name ?? routeWorkspaceId },
    ]);
  }, [setBreadcrumbs, project, canonicalProjectRef, workspace?.name, routeWorkspaceId]);

  useEffect(() => {
    if (!project) return;
    if (routeProjectRef === canonicalProjectRef) return;
    navigate(`${projectWorkspaceUrl(project, routeWorkspaceId)}${location.search}`, { replace: true });
  }, [project, routeProjectRef, canonicalProjectRef, routeWorkspaceId, location.search, navigate]);

  const invalidateProject = () => {
    if (!project) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(project.id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(project.urlKey) });
    if (lookupCompanyId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(lookupCompanyId) });
    }
  };

  const updateWorkspace = useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      projectsApi.updateWorkspace(project!.id, routeWorkspaceId, patch, lookupCompanyId),
    onSuccess: () => {
      invalidateProject();
      setErrorMessage(null);
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : t("projects.workspace.error.saveFailed"));
    },
  });

  const setPrimaryWorkspace = useMutation({
    mutationFn: () => projectsApi.updateWorkspace(project!.id, routeWorkspaceId, { isPrimary: true }, lookupCompanyId),
    onSuccess: () => {
      invalidateProject();
      setErrorMessage(null);
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : t("projects.workspace.error.updateFailed"));
    },
  });

  const controlRuntimeServices = useMutation({
    mutationFn: (request: WorkspaceRuntimeControlRequest) =>
      projectsApi.controlWorkspaceCommands(project!.id, routeWorkspaceId, request.action, lookupCompanyId, request),
    onSuccess: (result, request) => {
      invalidateProject();
      setErrorMessage(null);
      setRuntimeActionMessage(
        request.action === "run"
          ? t("projects.workspace.runtimeAction.jobCompleted")
          : request.action === "stop"
            ? t("projects.workspace.runtimeAction.serviceStopped")
            : request.action === "restart"
              ? t("projects.workspace.runtimeAction.serviceRestarted")
              : t("projects.workspace.runtimeAction.serviceStarted"),
      );
    },
    onError: (error) => {
      setRuntimeActionMessage(null);
      setErrorMessage(error instanceof Error ? error.message : t("projects.workspace.error.controlFailed"));
    },
  });

  if (projectQuery.isLoading) return <p className="text-sm text-muted-foreground">{t("projects.workspace.loading.workspace")}</p>;
  if (projectQuery.error) {
    return (
      <p className="text-sm text-destructive">
        {projectQuery.error instanceof Error ? projectQuery.error.message : t("projects.workspace.error.loadFailed")}
      </p>
    );
  }
  if (!project || !workspace || !form || !initialState) {
    return <p className="text-sm text-muted-foreground">{t("projects.workspace.notFound")}</p>;
  }

  const canRunWorkspaceCommands = Boolean(workspace.cwd);
  const canStartRuntimeServices = Boolean(workspace.runtimeConfig?.workspaceRuntime) && canRunWorkspaceCommands;
  const runtimeControlSections = buildWorkspaceRuntimeControlSections({
    runtimeConfig: workspace.runtimeConfig?.workspaceRuntime ?? null,
    runtimeServices: workspace.runtimeServices ?? [],
    canStartServices: canStartRuntimeServices,
    canRunJobs: canRunWorkspaceCommands,
  });
  const pendingRuntimeAction = controlRuntimeServices.isPending ? controlRuntimeServices.variables ?? null : null;

  const saveChanges = () => {
    const validationError = validateWorkspaceForm(form, t);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    const patch = buildWorkspacePatch(initialState, form, t);
    if (Object.keys(patch).length === 0) return;
    updateWorkspace.mutate(patch);
  };

  const sourceTypeOptions = getSourceTypeOptions(t);
  const sourceTypeDescription = sourceTypeOptions.find((option) => option.value === form.sourceType)?.description ?? null;
  const handleTabChange = (tab: ProjectWorkspaceTab) => {
    const workspacePath = projectWorkspaceUrl(project, routeWorkspaceId);
    if (isProjectWorkspacePluginTab(tab)) {
      navigate(`${workspacePath}?tab=${encodeURIComponent(tab)}`);
      return;
    }
    navigate(workspacePath);
  };
  const activePluginTab = pluginTabItems.find((item) => item.value === activeTab) ?? null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/projects/${canonicalProjectRef}/workspaces`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("projects.workspace.backToWorkspaces")}
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {t("projects.workspace.pageLabel")}
          </div>
          <h1 className="truncate text-xl font-semibold sm:text-2xl">{workspace.name}</h1>
        </div>
        {!workspace.isPrimary ? (
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            disabled={setPrimaryWorkspace.isPending}
            onClick={() => setPrimaryWorkspace.mutate()}
          >
            {setPrimaryWorkspace.isPending
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Check className="mr-2 h-4 w-4" />}
            {t("projects.workspace.makePrimary")}
          </Button>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300 sm:max-w-sm">
            <Sparkles className="h-4 w-4" />
            {t("projects.workspace.primaryBadge")}
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as ProjectWorkspaceTab)}>
        <PageTabBar
          items={tabItems.map((item) => ({ value: item.value, label: item.label }))}
          align="start"
          value={activeTab}
          onValueChange={(value) => handleTabChange(value as ProjectWorkspaceTab)}
        />
      </Tabs>

      {activeTab === "configuration" ? (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.9fr)]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("projects.workspace.configDescription")}
            </p>

            <Separator className="my-5" />

            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("projects.workspace.field.workspaceName")}>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
                  value={form.name}
                  onChange={(event) => setForm((current) => current ? { ...current, name: event.target.value } : current)}
                  placeholder={t("projects.workspace.field.workspaceNamePlaceholder")}
                />
              </Field>

              <Field label={t("projects.workspace.field.visibility")}>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
                  value={form.visibility}
                  onChange={(event) =>
                    setForm((current) => current ? { ...current, visibility: event.target.value as ProjectWorkspaceVisibility } : current)
                  }
                >
                  {getVisibilityOptions(t).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-4 grid gap-4">
              <Field label={t("projects.workspace.field.sourceType")} hint={sourceTypeDescription ?? undefined}>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
                  value={form.sourceType}
                  onChange={(event) =>
                    setForm((current) => current ? { ...current, sourceType: event.target.value as ProjectWorkspaceSourceType } : current)
                  }
                >
                  {sourceTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <Field label={t("projects.workspace.field.localPath")}>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none"
                    value={form.cwd}
                    onChange={(event) => setForm((current) => current ? { ...current, cwd: event.target.value } : current)}
                    placeholder={t("projects.workspace.field.localPathPlaceholder")}
                  />
                </Field>
                <div className="flex items-end">
                  <ChoosePathButton />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t("projects.workspace.field.repoUrl")}>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
                    value={form.repoUrl}
                    onChange={(event) => setForm((current) => current ? { ...current, repoUrl: event.target.value } : current)}
                    placeholder={t("projects.workspace.field.repoUrlPlaceholder")}
                  />
                </Field>
                <Field label={t("projects.workspace.field.repoRef")}>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none"
                    value={form.repoRef}
                    onChange={(event) => setForm((current) => current ? { ...current, repoRef: event.target.value } : current)}
                    placeholder={t("projects.workspace.field.repoRefPlaceholder")}
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t("projects.workspace.field.defaultRef")}>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none"
                    value={form.defaultRef}
                    onChange={(event) => setForm((current) => current ? { ...current, defaultRef: event.target.value } : current)}
                    placeholder={t("projects.workspace.field.defaultRefPlaceholder")}
                  />
                </Field>
                <Field label={t("projects.workspace.field.sharedWorkspaceKey")}>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none"
                    value={form.sharedWorkspaceKey}
                    onChange={(event) => setForm((current) => current ? { ...current, sharedWorkspaceKey: event.target.value } : current)}
                    placeholder={t("projects.workspace.field.sharedWorkspaceKeyPlaceholder")}
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t("projects.workspace.field.remoteProvider")}>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
                    value={form.remoteProvider}
                    onChange={(event) => setForm((current) => current ? { ...current, remoteProvider: event.target.value } : current)}
                    placeholder={t("projects.workspace.field.remoteProviderPlaceholder")}
                  />
                </Field>
                <Field label={t("projects.workspace.field.remoteWorkspaceRef")}>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none"
                    value={form.remoteWorkspaceRef}
                    onChange={(event) => setForm((current) => current ? { ...current, remoteWorkspaceRef: event.target.value } : current)}
                    placeholder={t("projects.workspace.field.remoteWorkspaceRefPlaceholder")}
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t("projects.workspace.field.setupCommand")} hint={t("projects.workspace.field.setupCommandHint")}>
                  <textarea
                    className="min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none"
                    value={form.setupCommand}
                    onChange={(event) => setForm((current) => current ? { ...current, setupCommand: event.target.value } : current)}
                    placeholder={t("projects.workspace.field.setupCommandPlaceholder")}
                  />
                </Field>
                <Field label={t("projects.workspace.field.cleanupCommand")} hint={t("projects.workspace.field.cleanupCommandHint")}>
                  <textarea
                    className="min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none"
                    value={form.cleanupCommand}
                    onChange={(event) => setForm((current) => current ? { ...current, cleanupCommand: event.target.value } : current)}
                    placeholder={t("projects.workspace.field.cleanupCommandPlaceholder")}
                  />
                </Field>
              </div>

              <details className="rounded-xl border border-dashed border-border/70 bg-background px-3 py-3">
                <summary className="cursor-pointer text-sm font-medium">{t("projects.workspace.runtimeConfig.advancedJson")}</summary>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("projects.workspace.runtimeConfig.advancedJsonDescription")}
                </p>
                <div className="mt-3">
                  <Field label={t("projects.workspace.runtimeConfig.commandsJson")} hint={t("projects.workspace.runtimeConfig.commandsJsonHint")}>
                    <textarea
                      className="min-h-96 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none"
                      value={form.runtimeConfig}
                      onChange={(event) => setForm((current) => current ? { ...current, runtimeConfig: event.target.value } : current)}
                      placeholder={"{\n  \"commands\": [\n    {\n      \"id\": \"web\",\n      \"name\": \"web\",\n      \"kind\": \"service\",\n      \"command\": \"pnpm dev\",\n      \"cwd\": \".\",\n      \"port\": { \"type\": \"auto\" },\n      \"readiness\": {\n        \"type\": \"http\",\n        \"urlTemplate\": \"http://127.0.0.1:${port}\"\n      },\n      \"expose\": {\n        \"type\": \"url\",\n        \"urlTemplate\": \"http://127.0.0.1:${port}\"\n      },\n      \"lifecycle\": \"shared\",\n      \"reuseScope\": \"project_workspace\"\n    },\n    {\n      \"id\": \"db-migrate\",\n      \"name\": \"db:migrate\",\n      \"kind\": \"job\",\n      \"command\": \"pnpm db:migrate\",\n      \"cwd\": \".\"\n    }\n  ]\n}"}
                    />
                  </Field>
                </div>
              </details>
            </div>

            <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button className="w-full sm:w-auto" disabled={!isDirty || updateWorkspace.isPending} onClick={saveChanges}>
                {updateWorkspace.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t("projects.workspace.saveChanges")}
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                disabled={!isDirty || updateWorkspace.isPending}
                onClick={() => {
                  setForm(initialState);
                  setErrorMessage(null);
                }}
              >
                {t("projects.workspace.reset")}
              </Button>
              {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
              {!errorMessage && runtimeActionMessage ? <p className="text-sm text-muted-foreground">{runtimeActionMessage}</p> : null}
              {!errorMessage && !isDirty ? <p className="text-sm text-muted-foreground">{t("projects.workspace.noUnsavedChanges")}</p> : null}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="space-y-1">
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{t("projects.workspace.facts.title")}</div>
              <h2 className="text-lg font-semibold">{t("projects.workspace.facts.currentState")}</h2>
            </div>
            <Separator className="my-4" />
            <DetailRow label={t("projects.workspace.facts.project")}>
              <Link to={`/projects/${canonicalProjectRef}`} className="hover:underline">{project.name}</Link>
            </DetailRow>
            <DetailRow label={t("projects.workspace.facts.workspaceId")}>
              <span className="break-all font-mono text-xs">{workspace.id}</span>
            </DetailRow>
            <DetailRow label={t("projects.workspace.facts.localPath")}>
              <span className="break-all font-mono text-xs">{workspace.cwd ?? t("projects.workspace.facts.none")}</span>
            </DetailRow>
            <DetailRow label={t("projects.workspace.facts.repo")}>
              {workspace.repoUrl && isSafeExternalUrl(workspace.repoUrl) ? (
                <a href={workspace.repoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                  {workspace.repoUrl}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : workspace.repoUrl ? (
                <span className="break-all font-mono text-xs">{workspace.repoUrl}</span>
              ) : t("projects.workspace.facts.none")}
            </DetailRow>
            <DetailRow label={t("projects.workspace.facts.defaultRef")}>{workspace.defaultRef ?? t("projects.workspace.facts.none")}</DetailRow>
            <DetailRow label={t("projects.workspace.facts.updated")}>{new Date(workspace.updatedAt).toLocaleString()}</DetailRow>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{t("projects.workspace.commands.title")}</div>
                <h2 className="text-lg font-semibold">{t("projects.workspace.commands.servicesAndJobs")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("projects.workspace.commands.description")}
                </p>
              </div>
            </div>
            <WorkspaceRuntimeControls
              className="mt-4"
              sections={runtimeControlSections}
              isPending={controlRuntimeServices.isPending}
              pendingRequest={pendingRuntimeAction}
              serviceEmptyMessage={
                workspace.runtimeConfig?.workspaceRuntime
                  ? t("projects.workspace.commands.serviceEmptyWithConfig")
                  : t("projects.workspace.commands.serviceEmptyWithoutConfig")
              }
              jobEmptyMessage={t("projects.workspace.commands.jobEmpty")}
              disabledHint={t("projects.workspace.commands.disabledHint")}
              onAction={(request) => controlRuntimeServices.mutate(request)}
            />
          </div>
        </div>
      </div>
      ) : null}

      {isProjectWorkspacePluginTab(activeTab) ? (
        activePluginTab ? (
          <PluginSlotMount
            slot={activePluginTab.slot}
            context={{
              companyId: project.companyId,
              companyPrefix: companyPrefix ?? null,
              projectId: project.id,
              entityId: workspace.id,
              entityType: "project_workspace",
            }}
            missingBehavior="placeholder"
          />
        ) : pluginDetailSlotsLoading || pluginDetailSlotsError ? (
          <div className="rounded-lg border border-dashed border-border bg-background px-4 py-8 text-sm text-muted-foreground">
            {pluginDetailSlotsError ? pluginDetailSlotsError : t("projects.workspace.plugin.loading")}
          </div>
        ) : (
          <MissingPluginTabPlaceholder
            defaultTabHref={`${projectWorkspaceUrl(project, routeWorkspaceId)}?tab=configuration`}
            defaultTabLabel={t("projects.workspace.plugin.backToConfig")}
          />
        )
      ) : null}
    </div>
  );
}
