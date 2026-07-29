import { z } from "zod";

export type ToolDefinition = {
  name: string;
  displayName: string;
  description: string;
  parameters: z.ZodSchema;
  execute: (params: Record<string, unknown>) => Promise<string>;
};
