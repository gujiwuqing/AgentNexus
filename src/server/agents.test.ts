import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables, authedUser } from "@/db/test-helpers";
import { createAgent, listAgents, getAgent, updateAgent, deleteAgent } from "./agents";

afterEach(clearAllTables);

describe("agent service", () => {
  it("creates and retrieves an agent", async () => {
    const { user } = await authedUser();
    const created = await createAgent({ name: "Researcher", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, user.id);
    expect(created.id).toBeTruthy();
    expect(created.name).toBe("Researcher");

    const fetched = await getAgent(created.id);
    expect(fetched?.name).toBe("Researcher");
  });

  it("lists only the owner's agents", async () => {
    const { user: alice } = await authedUser();
    const { user: bob } = await authedUser();
    await createAgent({ name: "A", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, alice.id);
    await createAgent({ name: "B", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, bob.id);

    const all = await listAgents(alice.id);
    expect(all.map((a) => a.name).sort()).toEqual(["A"]);
  });

  it("updates an agent owned by the user", async () => {
    const { user } = await authedUser();
    const created = await createAgent({ name: "Old Name", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, user.id);
    const updated = await updateAgent(created.id, { name: "New Name" }, user.id);
    expect(updated?.name).toBe("New Name");
  });

  it("returns null when updating another user's agent", async () => {
    const { user: alice } = await authedUser();
    const { user: bob } = await authedUser();
    const created = await createAgent({ name: "Alice's", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, alice.id);
    const updated = await updateAgent(created.id, { name: "Hacked" }, bob.id);
    expect(updated).toBeNull();
  });

  it("deletes an agent owned by the user", async () => {
    const { user } = await authedUser();
    const created = await createAgent({ name: "Temp", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, user.id);
    const deleted = await deleteAgent(created.id, user.id);
    expect(deleted).toBe(true);
    expect(await getAgent(created.id)).toBeNull();
  });

  it("does not delete another user's agent", async () => {
    const { user: alice } = await authedUser();
    const { user: bob } = await authedUser();
    const created = await createAgent({ name: "Alice's", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, alice.id);
    const deleted = await deleteAgent(created.id, bob.id);
    expect(deleted).toBe(false);
    expect(await getAgent(created.id)).toBeTruthy();
  });
});
