import { z } from "zod";

export const knowledgeBaseInputSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().default(""),
  embeddingModel: z.string().optional(),
  chunkSize: z.number().int().min(100).max(2000).default(500),
  chunkOverlap: z.number().int().min(0).max(500).default(50),
});

export type KnowledgeBaseInput = z.infer<typeof knowledgeBaseInputSchema>;

export const knowledgeBaseUpdateSchema = knowledgeBaseInputSchema.partial();
export type KnowledgeBaseUpdateInput = z.infer<typeof knowledgeBaseUpdateSchema>;
