import { z } from "zod";

const skillResourceSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});

export const skillInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().default(""),
  icon: z.string().default(""),
  tags: z.array(z.string()).default([]),
  category: z.string().default(""),
  version: z.string().default("1.0.0"),
  argumentHint: z.string().default(""),
  content: z.string().min(1, "Content is required"),
  resources: z.array(skillResourceSchema).default([]),
  allowedTools: z.array(z.string()).default([]),
});

export type SkillInput = z.infer<typeof skillInputSchema>;

export const skillUpdateSchema = skillInputSchema.partial();
export type SkillUpdateInput = z.infer<typeof skillUpdateSchema>;
