import { z } from "zod";

const httpConfigSchema = z.object({
  url: z.string().url("Invalid URL"),
  method: z.enum(["GET", "POST", "PUT", "DELETE"]),
  headers: z.record(z.string()).optional(),
  bodyTemplate: z.string().optional(),
  queryTemplate: z.record(z.string()).optional(),
});

const promptConfigSchema = z.object({
  systemInstruction: z.string().min(1, "System instruction is required"),
  outputFormat: z.string().optional(),
});

const mcpConfigSchema = z.object({
  serverUrl: z.string().url("Invalid server URL"),
  toolName: z.string().min(1, "Tool name is required"),
  authToken: z.string().optional(),
});

const toolParameterSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["string", "number", "boolean"]),
  description: z.string().default(""),
  required: z.boolean().default(true),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

export const customToolInputSchema = z.object({
  name: z.string().min(1, "Name is required").regex(/^[a-z][a-z0-9_]*$/, "Name must be lowercase with underscores"),
  displayName: z.string().min(1, "Display name is required"),
  description: z.string().min(1, "Description is required"),
  icon: z.string().default(""),
  tags: z.array(z.string()).default([]),
  type: z.enum(["http", "prompt", "mcp"]),
  httpConfig: httpConfigSchema.nullable().default(null),
  promptConfig: promptConfigSchema.nullable().default(null),
  mcpConfig: mcpConfigSchema.nullable().default(null),
  parameters: z.array(toolParameterSchema).default([]),
});

export type CustomToolInput = z.infer<typeof customToolInputSchema>;

export const customToolUpdateSchema = customToolInputSchema.partial();
export type CustomToolUpdateInput = z.infer<typeof customToolUpdateSchema>;
