export interface PoolAgent {
  id: string;
  companyId: string;
  name: string;
  role: string;
  title: string | null;
  icon: string | null;
  status: string;
  tags: string[];
  modelBinding: string | null;
  adapterType: string;
  maxConcurrency: number;
  temperature: number | null;
  maxTokens: number | null;
  currentTasks: number;
  lastTaskCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePoolAgentRequest {
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

export interface UpdatePoolAgentRequest {
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
