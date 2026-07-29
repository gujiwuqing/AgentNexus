import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables } from "@/db/test-helpers";
import { getProviderConfig, upsertProviderConfig } from "./provider-config";

afterEach(clearAllTables);

describe("provider config service", () => {
  it("returns null when no config has been set", async () => {
    expect(await getProviderConfig()).toBeNull();
  });

  it("creates a config on first upsert", async () => {
    const config = await upsertProviderConfig({ baseUrl: "https://api.example/v1", model: "m1", apiKey: "k1" });
    expect(config.model).toBe("m1");
    expect(await getProviderConfig()).toMatchObject({ model: "m1" });
  });

  it("replaces the existing config on subsequent upserts (single-row table)", async () => {
    await upsertProviderConfig({ baseUrl: "https://api.example/v1", model: "m1", apiKey: "k1" });
    await upsertProviderConfig({ baseUrl: "https://api.example/v1", model: "m2", apiKey: "k2" });
    const config = await getProviderConfig();
    expect(config?.model).toBe("m2");
  });
});
