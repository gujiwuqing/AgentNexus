import { describe, it, expect } from "vitest";
import { resolveProviderConfig, MissingProviderConfigError } from "./provider";

const globalConfig = {
  baseUrl: "https://api.global.example/v1",
  model: "global-model",
  apiKey: "global-key",
};

describe("resolveProviderConfig", () => {
  it("uses the agent model and inherits baseUrl/apiKey from global when agentModel is set", () => {
    const resolved = resolveProviderConfig("agent-model", globalConfig);
    expect(resolved).toEqual({
      baseUrl: "https://api.global.example/v1",
      model: "agent-model",
      apiKey: "global-key",
    });
  });

  it("falls back to the global model when agentModel is null", () => {
    const resolved = resolveProviderConfig(null, globalConfig);
    expect(resolved).toEqual(globalConfig);
  });

  it("falls back to the global model when agentModel is empty string", () => {
    const resolved = resolveProviderConfig("", globalConfig);
    expect(resolved).toEqual(globalConfig);
  });

  it("throws MissingProviderConfigError when global is null", () => {
    expect(() => resolveProviderConfig(null, null)).toThrow(MissingProviderConfigError);
  });
});
