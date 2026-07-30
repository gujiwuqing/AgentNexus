import { z } from "zod";

export const skillInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().default(""),
  icon: z.string().default(""),
  tags: z.array(z.string()).default([]),
  category: z.string().default(""),
  instructions: z.string().min(1, "Instructions are required"),
  examples: z.array(z.object({
    input: z.string().min(1),
    output: z.string().min(1),
  })).default([]),
  recommendedTools: z.array(z.string()).default([]),
});

export type SkillInput = z.infer<typeof skillInputSchema>;

export const skillUpdateSchema = skillInputSchema.partial();
export type SkillUpdateInput = z.infer<typeof skillUpdateSchema>;
