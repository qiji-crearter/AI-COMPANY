import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, UserRound, Loader2, Trash2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import type { PoolAgent } from "@paperclipai/shared";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useToastActions } from "../context/ToastContext";
import { poolAgentsApi } from "../api/poolAgents";
import { queryKeys } from "../lib/queryKeys";
import { EmptyState } from "../components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/i18n";

const ADAPTER_OPTIONS = [
  { value: "process", label: "Process" },
  { value: "container", label: "Container" },
  { value: "sandbox", label: "Sandbox" },
  { value: "remote", label: "Remote" },
] as const;

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; className: string }> = {
  idle: { icon: CheckCircle2, className: "text-emerald-600" },
  working: { icon: Loader2, className: "text-blue-600" },
  paused: { icon: XCircle, className: "text-muted-foreground" },
  deleted: { icon: XCircle, className: "text-destructive" },
};

export function AiCompanyAgents() {
  const { t } = useTranslation();
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const { pushToast } = useToastActions();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteAgent, setDeleteAgent] = useState<PoolAgent | null>(null);

  const { data: agents = [], isLoading } = useQuery({
    queryKey: queryKeys.poolAgents.list(selectedCompanyId!),
    queryFn: () => poolAgentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([
      { label: t("sidebar.aiCompany"), href: "/ai-company" },
      { label: t("agentPool.title") },
    ]);
  }, [setBreadcrumbs, t]);

  const createMutation = useMutation({
    mutationFn: (input: {
      name: string;
      role: string;
      adapterType: string;
      tags?: string[];
      maxConcurrency?: number;
      temperature?: number;
      maxTokens?: number;
    }) => poolAgentsApi.create(selectedCompanyId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.poolAgents.list(selectedCompanyId!) });
      setAddOpen(false);
      pushToast({ title: t("agentPool.added"), tone: "success" });
    },
    onError: (err: Error) => {
      pushToast({ title: t("agentPool.addFailed"), body: err.message, tone: "error" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => poolAgentsApi.remove(selectedCompanyId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.poolAgents.list(selectedCompanyId!) });
      setDeleteAgent(null);
      pushToast({ title: t("agentPool.deleted"), tone: "success" });
    },
    onError: (err: Error) => {
      pushToast({ title: t("agentPool.deleteFailed"), body: err.message, tone: "error" });
    },
  });

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;
    const role = form.get("role") as string;
    const adapterType = form.get("adapterType") as string;
    const tagsRaw = form.get("tags") as string;
    const maxConcurrency = parseInt(form.get("maxConcurrency") as string, 10);
    const temperature = parseInt(form.get("temperature") as string, 10);
    const maxTokens = parseInt(form.get("maxTokens") as string, 10);
    if (!name || !role || !adapterType) return;

    const tags = tagsRaw
      ? tagsRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    createMutation.mutate({
      name,
      role,
      adapterType,
      tags,
      maxConcurrency: isNaN(maxConcurrency) ? undefined : maxConcurrency,
      temperature: isNaN(temperature) ? undefined : temperature,
      maxTokens: isNaN(maxTokens) ? undefined : maxTokens,
    });
  }

  function statusDisplay(agent: PoolAgent) {
    const cfg = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.paused;
    const labels: Record<string, string> = {
      idle: t("agentPool.statusIdle"),
      working: t("agentPool.statusWorking"),
      paused: t("agentPool.statusPaused"),
      deleted: t("agentPool.statusDeleted"),
    };
    return (
      <span className={`inline-flex items-center gap-1 text-xs ${cfg.className}`}>
        <cfg.icon className={`h-3 w-3 ${agent.status === "working" ? "animate-spin" : ""}`} />
        {labels[agent.status] ?? agent.status}
      </span>
    );
  }

  const activeAgents = agents.filter((a) => a.status !== "deleted");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{t("agentPool.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("agentPool.description")}</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          {t("agentPool.addAgent")}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : activeAgents.length === 0 ? (
        <EmptyState
          icon={UserRound}
          message={t("agentPool.emptyDesc")}
          action={t("agentPool.addAgent")}
          onAction={() => setAddOpen(true)}
        />
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">{t("agentPool.name")}</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">{t("agentPool.role")}</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">{t("agentPool.adapterType")}</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">{t("agentPool.status")}</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">{t("agentPool.currentTasks")}/{t("agentPool.maxConcurrency")}</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">{t("agentPool.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {activeAgents.map((agent) => (
                <tr key={agent.id} className="border-b border-border/50 last:border-0 hover:bg-accent/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{agent.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/30 px-2 py-0.5 text-xs font-medium">
                      {agent.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{agent.adapterType}</td>
                  <td className="px-4 py-3">{statusDisplay(agent)}</td>
                  <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                    {agent.currentTasks}/{agent.maxConcurrency}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteAgent(agent)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Agent Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("agentPool.addAgent")}</DialogTitle>
            <DialogDescription>{t("agentPool.description")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("agentPool.name")}</label>
              <Input name="name" required placeholder={t("agentPool.namePlaceholder")} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("agentPool.role")}</label>
              <Input name="role" required placeholder={t("agentPool.rolePlaceholder")} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("agentPool.adapterType")}</label>
              <Select name="adapterType" defaultValue="process" required>
                <SelectTrigger>
                  <SelectValue placeholder={t("agentPool.selectAdapter")} />
                </SelectTrigger>
                <SelectContent>
                  {ADAPTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("agentPool.maxConcurrency")}</label>
                <Input name="maxConcurrency" type="number" min={1} max={100} defaultValue={3} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("agentPool.temperature")}</label>
                <Input name="temperature" type="number" min={0} max={200} placeholder="70" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("agentPool.maxTokens")}</label>
                <Input name="maxTokens" type="number" min={1} placeholder="4096" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("agentPool.tags")}</label>
              <Input name="tags" placeholder={t("agentPool.tagsPlaceholder")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : null}
                {t("agentPool.addAgent")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteAgent} onOpenChange={(open) => { if (!open) setDeleteAgent(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("agentPool.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("agentPool.deleteDesc", { name: deleteAgent?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteAgent(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteAgent && deleteMutation.mutate(deleteAgent.id)}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : null}
              {t("agentPool.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
