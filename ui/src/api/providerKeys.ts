import type { ProviderKey, ProviderKeyWithSecret } from "@paperclipai/shared";
import { api } from "./client";

export interface CreateProviderKeyInput {
  name: string;
  provider: string;
  baseUrlOpenai?: string | null;
  baseUrlAnthropic?: string | null;
  value: string;
}

export interface UpdateProviderKeyInput {
  name?: string;
  status?: string;
  baseUrlOpenai?: string | null;
  baseUrlAnthropic?: string | null;
}

export const providerKeysApi = {
  list: (companyId: string) =>
    api.get<ProviderKeyWithSecret[]>(`/companies/${companyId}/provider-keys`),

  get: (companyId: string, id: string) =>
    api.get<ProviderKeyWithSecret>(`/companies/${companyId}/provider-keys/${id}`),

  create: (companyId: string, input: CreateProviderKeyInput) =>
    api.post<ProviderKeyWithSecret>(`/companies/${companyId}/provider-keys`, input),

  update: (companyId: string, id: string, input: UpdateProviderKeyInput) =>
    api.patch<ProviderKeyWithSecret>(`/companies/${companyId}/provider-keys/${id}`, input),

  remove: (companyId: string, id: string) =>
    api.delete<void>(`/companies/${companyId}/provider-keys/${id}`),
};
