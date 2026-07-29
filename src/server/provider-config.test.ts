import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables, authedUser } from "@/db/test-helpers";
import { getProviderConfig, upsertProviderConfig } from "./provider-config";

afterEach(clearAllTables);

describe("provider config service", () => {
  it("returns null when no config has been set", async () => {
    const { user } = await authedUser();
    expect(await getProviderConfig(user.id)).toBeNull();
  });

  it("creates a config on first upsert", async () => {
    const { user } = await authedUser();
    const config = await upsertProviderConfig({ baseUrl: "https://api.example/v1", model: "m1", apiKey: "k1" }, user.id);
    expect(config.model).toBe("m1");
    expect(await getProviderConfig(user.id)).toMatchObject({ model: "m1" });
  });

  it("replaces the existing config on subsequent upserts (single-row per user)", async () => {
    const { user } = await authedUser();
    await upsertProviderConfig({ baseUrl: "https://api.example/v1", model: "m1", apiKey: "k1" }, user.id);
    await upsertProviderConfig({ baseUrl: "https://api.example/v1", model: "m2", apiKey: "k2" }, user.id);
    const config = await getProviderConfig(user.id);
    expect(config?.model).toBe("m2");
  });

  it("isolates config per user", async () => {
    const { user: alice } = await authedUser();
    const { user: bob } = await authedUser();
    await upsertProviderConfig({ baseUrl: "https://api.example/v1", model: "alice", apiKey: "k1" }, alice.id);
    expect(await getProviderConfig(bob.id)).toBeNull();
  });
});
