import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createAzure } from "@ai-sdk/azure";
import type { ProviderConfig } from "./provider";

export function createModelClient(provider: ProviderConfig) {
  switch (provider.providerType) {
    case "anthropic":
      return createAnthropic({
        baseURL: provider.baseUrl || undefined,
        apiKey: provider.apiKey,
      })(provider.model);
    case "azure":
      return createAzure({
        baseURL: provider.baseUrl,
        apiKey: provider.apiKey,
      })(provider.model);
    case "ollama":
    case "openai":
    default:
      return createOpenAI({
        baseURL: provider.baseUrl,
        apiKey: provider.apiKey,
      })(provider.model);
  }
}
