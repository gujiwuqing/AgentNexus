import { z } from "zod";

export const providerConfigInputSchema = z.object({
  providerType: z.enum(["openai", "anthropic", "azure", "ollama"]).default("openai"),
  baseUrl: z.string().url(),
  model: z.string().min(1),
  apiKey: z.string().min(1),
  embeddingModel: z.string().optional().default(""),
  webSearchProvider: z.string().optional().default(""),
  webSearchApiKey: z.string().optional().default(""),
});

export type ProviderConfigInput = z.infer<typeof providerConfigInputSchema>;
