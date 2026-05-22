import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Clock, FlaskConical, Play, Search } from "lucide-react";
import type {
  IssueGraphLivenessAutoRecoveryPreview,
  PatchInstanceExperimentalSettings,
} from "@paperclipai/shared";
import { instanceSettingsApi } from "@/api/instanceSettings";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function issueHref(identifier: string | null, issueId: string) {
  if (!identifier) return `/issues/${issueId}`;
  const prefix = identifier.split("-")[0] || "PAP";
  return `/${prefix}/issues/${identifier}`;
}

function formatRecoveryState(state: string) {
  return state.replace(/_/g, " ");
}

function RecoveryPreviewDialog({
  preview,
  open,
  onOpenChange,
  onEnableOnly,
  onEnableAndRun,
  isPending,
}: {
  preview: IssueGraphLivenessAutoRecoveryPreview | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnableOnly: () => void;
  onEnableAndRun: () => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  const count = preview?.recoverableFindings ?? 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("instanceSettings.experimental.dialog.title")}</DialogTitle>
          <DialogDescription>
            {preview
              ? t("instanceSettings.experimental.dialog.description", { count, lookbackHours: preview.lookbackHours, taskNoun: t("instanceSettings.experimental.dialog.task", { count }) })
              : t("instanceSettings.experimental.dialog.descriptionChecking")}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[min(28rem,65vh)] space-y-3 overflow-y-auto pr-1">
          {preview && preview.items.length === 0 ? (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
              {t("instanceSettings.experimental.dialog.noTasks")}
            </div>
          ) : null}

          {preview?.items.map((item) => (
            <div key={item.incidentKey} className="rounded-md border border-border bg-card px-3 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={issueHref(item.identifier, item.issueId)}
                  className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                >
                  {item.identifier ?? item.issueId}
                </a>
                <span className="rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                  {formatRecoveryState(item.state)}
                </span>
              </div>
              <p className="mt-1 text-sm text-foreground">{item.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.reason}</p>
              <div className="mt-2 text-xs text-muted-foreground">
                {t("instanceSettings.experimental.dialog.recoveryTarget")}{" "}
                <a
                  href={issueHref(item.recoveryIdentifier, item.recoveryIssueId)}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  {item.recoveryIdentifier ?? item.recoveryIssueId}
                </a>
              </div>
            </div>
          ))}
        </div>

        {preview && preview.skippedOutsideLookback > 0 ? (
          <p className="text-xs text-muted-foreground">
            {t("instanceSettings.experimental.dialog.skipped", {
              count: preview.skippedOutsideLookback,
              findingNoun: preview.skippedOutsideLookback === 1
                ? t("instanceSettings.experimental.dialog.finding_is")
                : t("instanceSettings.experimental.dialog.finding_are"),
            })}
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {t("instanceSettings.experimental.dialog.cancel")}
          </Button>
          <Button variant="outline" onClick={onEnableOnly} disabled={isPending || !preview}>
            {t("instanceSettings.experimental.dialog.enableOnly")}
          </Button>
          <Button onClick={onEnableAndRun} disabled={isPending || !preview}>
            {count > 0 ? t("instanceSettings.experimental.dialog.enableAndRun", { count }) : t("instanceSettings.experimental.dialog.enable")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function InstanceExperimentalSettings() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [lookbackHoursDraft, setLookbackHoursDraft] = useState("24");
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [pendingPreview, setPendingPreview] = useState<IssueGraphLivenessAutoRecoveryPreview | null>(null);

  useEffect(() => {
    setBreadcrumbs([
      { label: t("instanceSidebar.title") },
      { label: t("instanceSettings.breadcrumbs.experimental") },
    ]);
  }, [setBreadcrumbs]);

  const experimentalQuery = useQuery({
    queryKey: queryKeys.instance.experimentalSettings,
    queryFn: () => instanceSettingsApi.getExperimental(),
  });

  const toggleMutation = useMutation({
    mutationFn: async (patch: PatchInstanceExperimentalSettings) =>
      instanceSettingsApi.updateExperimental(patch),
    onSuccess: async () => {
      setActionError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.instance.experimentalSettings }),
        queryClient.invalidateQueries({ queryKey: queryKeys.health }),
      ]);
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : t("instanceSettings.experimental.updateError"));
    },
  });

  const previewMutation = useMutation({
    mutationFn: async (lookbackHours: number) =>
      instanceSettingsApi.previewIssueGraphLivenessAutoRecovery({ lookbackHours }),
    onSuccess: (preview) => {
      setActionError(null);
      setPendingPreview(preview);
      setPreviewDialogOpen(true);
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : t("instanceSettings.experimental.previewError"));
    },
  });

  const runRecoveryMutation = useMutation({
    mutationFn: async (lookbackHours: number) =>
      instanceSettingsApi.runIssueGraphLivenessAutoRecovery({ lookbackHours }),
    onSuccess: async () => {
      setActionError(null);
      setPreviewDialogOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.instance.experimentalSettings }),
        queryClient.invalidateQueries({ queryKey: queryKeys.health }),
      ]);
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : t("instanceSettings.experimental.runError"));
    },
  });

  useEffect(() => {
    const next = experimentalQuery.data?.issueGraphLivenessAutoRecoveryLookbackHours;
    if (typeof next === "number") {
      setLookbackHoursDraft(String(next));
    }
  }, [experimentalQuery.data?.issueGraphLivenessAutoRecoveryLookbackHours]);

  if (experimentalQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">{t("instanceSettings.experimental.loading")}</div>;
  }

  if (experimentalQuery.error) {
    return (
      <div className="text-sm text-destructive">
        {experimentalQuery.error instanceof Error
          ? experimentalQuery.error.message
          : t("instanceSettings.experimental.loadError")}
      </div>
    );
  }

  const enableEnvironments = experimentalQuery.data?.enableEnvironments === true;
  const enableIsolatedWorkspaces = experimentalQuery.data?.enableIsolatedWorkspaces === true;
  const autoRestartDevServerWhenIdle = experimentalQuery.data?.autoRestartDevServerWhenIdle === true;
  const enableIssueGraphLivenessAutoRecovery =
    experimentalQuery.data?.enableIssueGraphLivenessAutoRecovery === true;
  const lookbackHours =
    experimentalQuery.data?.issueGraphLivenessAutoRecoveryLookbackHours ?? 24;
  const parsedLookbackHours = Number.parseInt(lookbackHoursDraft, 10);
  const lookbackHoursIsValid =
    Number.isInteger(parsedLookbackHours) && parsedLookbackHours >= 1 && parsedLookbackHours <= 720;
  const recoveryActionPending =
    toggleMutation.isPending || previewMutation.isPending || runRecoveryMutation.isPending;

  function previewForEnable() {
    if (!lookbackHoursIsValid) {
      setActionError("Lookback hours must be a whole number from 1 to 720.");
      return;
    }
    previewMutation.mutate(parsedLookbackHours);
  }

  function enableOnly() {
    if (!lookbackHoursIsValid) return;
    toggleMutation.mutate({
      enableIssueGraphLivenessAutoRecovery: true,
      issueGraphLivenessAutoRecoveryLookbackHours: parsedLookbackHours,
    }, {
      onSuccess: () => setPreviewDialogOpen(false),
    });
  }

  function enableAndRun() {
    if (!lookbackHoursIsValid) return;
    toggleMutation.mutate({
      enableIssueGraphLivenessAutoRecovery: true,
      issueGraphLivenessAutoRecoveryLookbackHours: parsedLookbackHours,
    }, {
      onSuccess: () => runRecoveryMutation.mutate(parsedLookbackHours),
    });
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">{t("instanceSettings.experimental.pageTitle")}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("instanceSettings.experimental.pageDescription")}
        </p>
      </div>

      {actionError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {actionError}
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">{t("instanceSettings.experimental.environmentsTitle")}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("instanceSettings.experimental.environmentsDesc")}
            </p>
          </div>
          <ToggleSwitch
            checked={enableEnvironments}
            onCheckedChange={() => toggleMutation.mutate({ enableEnvironments: !enableEnvironments })}
            disabled={toggleMutation.isPending}
            aria-label={t("instanceSettings.experimental.toggleEnvironmentsLabel")}
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">{t("instanceSettings.experimental.isolatedWorkspacesTitle")}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("instanceSettings.experimental.isolatedWorkspacesDesc")}
            </p>
          </div>
          <ToggleSwitch
            checked={enableIsolatedWorkspaces}
            onCheckedChange={() => toggleMutation.mutate({ enableIsolatedWorkspaces: !enableIsolatedWorkspaces })}
            disabled={toggleMutation.isPending}
            aria-label={t("instanceSettings.experimental.toggleIsolatedWorkspacesLabel")}
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">{t("instanceSettings.experimental.autoRestartTitle")}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("instanceSettings.experimental.autoRestartDesc")}
            </p>
          </div>
          <ToggleSwitch
            checked={autoRestartDevServerWhenIdle}
            onCheckedChange={() => toggleMutation.mutate({ autoRestartDevServerWhenIdle: !autoRestartDevServerWhenIdle })}
            disabled={toggleMutation.isPending}
            aria-label={t("instanceSettings.experimental.toggleAutoRestartLabel")}
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <h2 className="text-sm font-semibold">{t("instanceSettings.experimental.recoveryTitle")}</h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {t("instanceSettings.experimental.recoveryDesc")}
              </p>
            </div>
            <ToggleSwitch
              checked={enableIssueGraphLivenessAutoRecovery}
              onCheckedChange={() => {
                if (enableIssueGraphLivenessAutoRecovery) {
                  toggleMutation.mutate({ enableIssueGraphLivenessAutoRecovery: false });
                  return;
                }
                previewForEnable();
              }}
              disabled={recoveryActionPending}
              aria-label={t("instanceSettings.experimental.toggleRecoveryLabel")}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(10rem,14rem)_1fr] sm:items-end">
            <label className="space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {t("instanceSettings.experimental.lookbackLabel")}
              </span>
              <Input
                type="number"
                min={1}
                max={720}
                step={1}
                value={lookbackHoursDraft}
                onChange={(event) => setLookbackHoursDraft(event.target.value)}
                aria-invalid={!lookbackHoursIsValid}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (!lookbackHoursIsValid) {
                    setActionError(t("instanceSettings.experimental.lookbackValidationError"));
                    return;
                  }
                  toggleMutation.mutate({
                    issueGraphLivenessAutoRecoveryLookbackHours: parsedLookbackHours,
                  });
                }}
                disabled={recoveryActionPending || parsedLookbackHours === lookbackHours}
              >
                {t("instanceSettings.experimental.saveHours")}
              </Button>
              <Button
                variant="outline"
                onClick={previewForEnable}
                disabled={recoveryActionPending}
              >
                <Search className="h-4 w-4" />
                {t("instanceSettings.experimental.preview")}
              </Button>
              <Button
                onClick={() => {
                  if (!lookbackHoursIsValid) {
                    setActionError(t("instanceSettings.experimental.lookbackValidationError"));
                    return;
                  }
                  runRecoveryMutation.mutate(parsedLookbackHours);
                }}
                disabled={recoveryActionPending || !enableIssueGraphLivenessAutoRecovery}
              >
                <Play className="h-4 w-4" />
                {t("instanceSettings.experimental.runNow")}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {t("instanceSettings.experimental.currentWindow", {
              lookback: lookbackHours,
              noun: t("instanceSettings.experimental.hour", { count: lookbackHours }),
            })}
          </p>
        </div>
      </section>

      <RecoveryPreviewDialog
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        preview={pendingPreview}
        onEnableOnly={enableOnly}
        onEnableAndRun={enableAndRun}
        isPending={recoveryActionPending}
      />
    </div>
  );
}
