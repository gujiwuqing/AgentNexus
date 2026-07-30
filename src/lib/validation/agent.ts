import { z } from "zod";

export const agentInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().default(""),
  avatar: z.string().default(""),
  tags: z.array(z.string()).default([]),
  systemPrompt: z.string().default(""),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().min(1).max(32000).default(1024),
  topP: z.number().min(0).max(1).default(1),
  model: z.string().nullable().default(null),
  memoryWindowSize: z.number().int().min(0).max(200).default(20),
  // 不在 schema 内的字段会被 safeParse 剥掉，以下两项必须显式声明
  toolsConfig: z
    .object({ enabledTools: z.array(z.string()).default([]) })
    .nullable()
    .default(null),
  suggestedPrompts: z.array(z.string().min(1).max(200)).max(4).default([]),
});

export type AgentInput = z.infer<typeof agentInputSchema>;

export const agentUpdateSchema = agentInputSchema.partial();
export type AgentUpdateInput = z.infer<typeof agentUpdateSchema>;
