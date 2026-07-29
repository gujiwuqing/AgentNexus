import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables } from "@/db/test-helpers";
import { createAgent, listAgents, getAgent, updateAgent, deleteAgent } from "./agents";

afterEach(clearAllTables);

describe("agent service", () => {
  it("creates and retrieves an agent", async () => {
    const created = await createAgent({ name: "Researcher", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null });
    expect(created.id).toBeTruthy();
    expect(created.name).toBe("Researcher");

    const fetched = await getAgent(created.id);
    expect(fetched?.name).toBe("Researcher");
  });

  it("lists all agents", async () => {
    await createAgent({ name: "A", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null });
    await createAgent({ name: "B", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null });

    const all = await listAgents();
    expect(all.map((a) => a.name).sort()).toEqual(["A", "B"]);
  });

  it("updates an agent", async () => {
    const created = await createAgent({ name: "Old Name", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null });
    const updated = await updateAgent(created.id, { name: "New Name" });
    expect(updated?.name).toBe("New Name");
  });

  it("returns null when updating a non-existent agent", async () => {
    const updated = await updateAgent("does-not-exist", { name: "X" });
    expect(updated).toBeNull();
  });

  it("deletes an agent", async () => {
    const created = await createAgent({ name: "Temp", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null });
    const deleted = await deleteAgent(created.id);
    expect(deleted).toBe(true);
    expect(await getAgent(created.id)).toBeNull();
  });
});
