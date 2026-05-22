import { z } from "zod";

export const createPoolAgentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
  title: z.string().optional(),
  tags: z.array(z.string()).default([]),
  adapterType: z.string().min(1, "Adapter type is required"),
  modelBinding: z.string().optional(),
  maxConcurrency: z.number().int().min(1).max(100).optional(),
  temperature: z.number().int().min(0).max(200).optional(),
  maxTokens: z.number().int().min(1).optional(),
});

export type CreatePoolAgent = z.infer<typeof createPoolAgentSchema>;

export const updatePoolAgentSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  title: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  adapterType: z.string().min(1).optional(),
  modelBinding: z.string().optional().nullable(),
  maxConcurrency: z.number().int().min(1).max(100).optional(),
  temperature: z.number().int().min(0).max(200).optional(),
  maxTokens: z.number().int().min(1).optional().nullable(),
  status: z.enum(["idle", "paused", "deleted"]).optional(),
});

export type UpdatePoolAgent = z.infer<typeof updatePoolAgentSchema>;
