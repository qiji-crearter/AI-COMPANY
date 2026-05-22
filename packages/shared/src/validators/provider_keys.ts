import { z } from "zod";
import { AGENT_ADAPTER_TYPES } from "../constants.js";

export const createProviderKeySchema = z.object({
  name: z.string().min(1, "Name is required"),
  provider: z.enum(["deepseek", "minimax", "openai", "anthropic", "gemini", "custom"]),
  baseUrlOpenai: z.string().url().optional().nullable(),
  baseUrlAnthropic: z.string().url().optional().nullable(),
  value: z.string().min(1, "API key value is required"),
});

export type CreateProviderKey = z.infer<typeof createProviderKeySchema>;

export const updateProviderKeySchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(["active", "disabled"]).optional(),
  baseUrlOpenai: z.string().url().optional().nullable(),
  baseUrlAnthropic: z.string().url().optional().nullable(),
});

export type UpdateProviderKey = z.infer<typeof updateProviderKeySchema>;
