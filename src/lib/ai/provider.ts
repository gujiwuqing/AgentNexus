export type ProviderType = "openai" | "anthropic" | "azure" | "ollama";

export type ProviderConfig = {
  baseUrl: string;
  model: string;
  apiKey: string;
  providerType: ProviderType;
};

export class MissingProviderConfigError extends Error {
  constructor() {
    super("No AI provider configured: set a global default or an agent override");
    this.name = "MissingProviderConfigError";
  }
}

export function resolveProviderConfig(
  agentModel: string | null,
  globalConfig: ProviderConfig | null | undefined
): ProviderConfig {
  if (!globalConfig) throw new MissingProviderConfigError();
  const model = agentModel && agentModel.trim() !== "" ? agentModel : globalConfig.model;
  return { ...globalConfig, model };
}
