import type { PoolAgent } from "@paperclipai/shared";
import { api } from "./client";

export interface CreatePoolAgentInput {
  name: string;
  role: string;
  title?: string;
  tags?: string[];
  adapterType: string;
  modelBinding?: string;
  maxConcurrency?: number;
  temperature?: number;
  maxTokens?: number;
}

export interface UpdatePoolAgentInput {
  name?: string;
  role?: string;
  title?: string | null;
  tags?: string[];
  adapterType?: string;
  modelBinding?: string | null;
  maxConcurrency?: number;
  temperature?: number;
  maxTokens?: number | null;
  status?: string;
}

export const poolAgentsApi = {
  list: (companyId: string) =>
    api.get<PoolAgent[]>(`/companies/${companyId}/pool/agents`),

  get: (companyId: string, id: string) =>
    api.get<PoolAgent>(`/companies/${companyId}/pool/agents/${id}`),

  create: (companyId: string, input: CreatePoolAgentInput) =>
    api.post<PoolAgent>(`/companies/${companyId}/pool/agents`, input),

  update: (companyId: string, id: string, input: UpdatePoolAgentInput) =>
    api.put<PoolAgent>(`/companies/${companyId}/pool/agents/${id}`, input),

  remove: (companyId: string, id: string) =>
    api.delete<void>(`/companies/${companyId}/pool/agents/${id}`),
};
