import { z } from "zod";

const nodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["agent", "condition", "transform", "human_input", "http_request", "code_execute", "delay", "variable_aggregate"]),
  label: z.string().min(1),
  config: z.record(z.unknown()),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
});

const edgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
});

const graphSchema = z.object({
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema),
});

export const workflowInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().default(""),
  graph: graphSchema,
});

export type WorkflowInput = z.infer<typeof workflowInputSchema>;

export const workflowUpdateSchema = workflowInputSchema.partial();
export type WorkflowUpdateInput = z.infer<typeof workflowUpdateSchema>;
