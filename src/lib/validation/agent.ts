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
  memoryStrategy: z.enum(["window", "summary_window"]).default("window"),
  // 不在 schema 内的字段会被 safeParse 剔掉，ragTopK / maxSteps 也必须显式声明
  toolsConfig: z
    .object({
      enabledTools: z.array(z.string()).default([]),
      ragTopK: z.number().int().min(1).max(50).optional(),
      /** 工具调用轮数上限，缺省 12；Skill 元工具也计步，设太小会被截断 */
      maxSteps: z.number().int().min(1).max(40).optional(),
    })
    .nullable()
    .default(null),
  suggestedPrompts: z.array(z.string().min(1).max(200)).max(4).default([]),
});

export type AgentInput = z.infer<typeof agentInputSchema>;

export const agentUpdateSchema = agentInputSchema.partial();
export type AgentUpdateInput = z.infer<typeof agentUpdateSchema>;
