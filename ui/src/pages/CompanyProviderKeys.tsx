import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, KeyRound, Trash2, Loader2, ExternalLink, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import type { ProviderKeyWithSecret } from "@paperclipai/shared";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useToastActions } from "../context/ToastContext";
import { providerKeysApi } from "../api/providerKeys";
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

const PROVIDER_OPTIONS = [
  { value: "deepseek", label: "DeepSeek" },
  { value: "minimax", label: "MiniMax" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Gemini" },
  { value: "custom", label: "Custom" },
] as const;

export function CompanyProviderKeys() {
  const { t } = useTranslation();
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const { pushToast } = useToastActions();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteKey, setDeleteKey] = useState<ProviderKeyWithSecret | null>(null);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: queryKeys.providerKeys.list(selectedCompanyId!),
    queryFn: () => providerKeysApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([
      { label: t("companySettingsSidebar.title"), href: "/company/settings" },
      { label: t("companyProviderKeys.title") },
    ]);
  }, [setBreadcrumbs, t]);

  const createMutation = useMutation({
    mutationFn: (input: { name: string; provider: string; value: string; baseUrlOpenai?: string; baseUrlAnthropic?: string }) =>
      providerKeysApi.create(selectedCompanyId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.providerKeys.list(selectedCompanyId!) });
      setAddOpen(false);
      pushToast({ title: t("companyProviderKeys.added"), tone: "success" });
    },
    onError: (err: Error) => {
      pushToast({ title: t("companyProviderKeys.addFailed"), body: err.message, tone: "error" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => providerKeysApi.remove(selectedCompanyId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.providerKeys.list(selectedCompanyId!) });
      setDeleteKey(null);
      pushToast({ title: t("companyProviderKeys.deleted"), tone: "success" });
    },
    onError: (err: Error) => {
      pushToast({ title: t("companyProviderKeys.deleteFailed"), body: err.message, tone: "error" });
    },
  });

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;
    const provider = form.get("provider") as string;
    const value = form.get("value") as string;
    const baseUrlOpenai = form.get("baseUrlOpenai") as string;
    const baseUrlAnthropic = form.get("baseUrlAnthropic") as string;
    if (!name || !provider || !value) return;
    createMutation.mutate({
      name,
      provider,
      value,
      baseUrlOpenai: baseUrlOpenai || undefined,
      baseUrlAnthropic: baseUrlAnthropic || undefined,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{t("companyProviderKeys.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("companyProviderKeys.description")}</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          {t("companyProviderKeys.addKey")}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : keys.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          message={t("companyProviderKeys.emptyDesc")}
          action={t("companyProviderKeys.addKey")}
          onAction={() => setAddOpen(true)}
        />
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">{t("companyProviderKeys.name")}</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">{t("companyProviderKeys.provider")}</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">{t("companyProviderKeys.apiKey")}</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">{t("companyProviderKeys.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id} className="border-b border-border/50 last:border-0 hover:bg-accent/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{key.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/30 px-2 py-0.5 text-xs font-medium capitalize">
                      {key.provider}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
                      {key.keyPrefix ?? "••••••"}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    {key.status === "active" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <XCircle className="h-3 w-3" />
                        {key.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteKey(key)}
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

      {/* Provider details section */}
      {keys.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">{t("companyProviderKeys.baseUrls")}</h2>
          <div className="grid gap-3">
            {keys
              .filter((k) => k.baseUrlOpenai || k.baseUrlAnthropic)
              .map((key) => (
                <div key={`urls-${key.id}`} className="rounded-lg border border-border p-3 space-y-1.5">
                  <div className="text-xs font-medium capitalize">{key.name} ({key.provider})</div>
                  {key.baseUrlOpenai && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="font-mono truncate">{key.baseUrlOpenai}</span>
                    </div>
                  )}
                  {key.baseUrlAnthropic && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="font-mono truncate">{key.baseUrlAnthropic}</span>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Add Key Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("companyProviderKeys.addKey")}</DialogTitle>
            <DialogDescription>{t("companyProviderKeys.addKeyDesc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("companyProviderKeys.provider")}</label>
              <Select name="provider" defaultValue="deepseek" required>
                <SelectTrigger>
                  <SelectValue placeholder={t("companyProviderKeys.selectProvider")} />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("companyProviderKeys.name")}</label>
              <Input name="name" required placeholder={t("companyProviderKeys.namePlaceholder")} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("companyProviderKeys.apiKey")}</label>
              <Input
                name="value"
                required
                type="password"
                placeholder="sk-..."
                autoComplete="off"
              />
              <p className="text-[11px] text-muted-foreground">{t("companyProviderKeys.apiKeyNotice")}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("companyProviderKeys.baseUrlOpenai")}</label>
              <Input name="baseUrlOpenai" placeholder="https://api.example.com/v1" type="url" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("companyProviderKeys.baseUrlAnthropic")}</label>
              <Input name="baseUrlAnthropic" placeholder="https://api.example.com/anthropic" type="url" />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : null}
                {t("companyProviderKeys.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteKey} onOpenChange={(open) => { if (!open) setDeleteKey(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("companyProviderKeys.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("companyProviderKeys.deleteDesc", { name: deleteKey?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteKey(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteKey && deleteMutation.mutate(deleteKey.id)}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : null}
              {t("companyProviderKeys.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
