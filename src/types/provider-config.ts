export type ProviderConfig = {
  id: string;
  providerType: "openai" | "anthropic" | "azure" | "ollama";
  baseUrl: string;
  model: string;
  apiKey: string;
  embeddingModel: string | null;
  webSearchProvider: string | null;
  webSearchApiKey: string | null;
  updatedAt: string;
} | null;

export type ProviderConfigInput = {
  providerType: "openai" | "anthropic" | "azure" | "ollama";
  baseUrl: string;
  model: string;
  apiKey: string;
  embeddingModel?: string;
  webSearchProvider?: string;
  webSearchApiKey?: string;
};
