import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables } from "@/db/test-helpers";
import { createAgent } from "./agents";
import { createConversation, listConversationsForAgent, getConversationById, deleteConversation } from "./conversations";

afterEach(clearAllTables);

async function makeAgent() {
  return createAgent({ name: "Helper", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null });
}

describe("conversation service", () => {
  it("creates a conversation scoped to an agent", async () => {
    const agent = await makeAgent();
    const conv = await createConversation(agent.id, "First chat");
    expect(conv.agentId).toBe(agent.id);
    expect(conv.title).toBe("First chat");
  });

  it("lists conversations for an agent, most recent first", async () => {
    const agent = await makeAgent();
    const first = await createConversation(agent.id, "First");
    // Ensure different createdAt (SQLite integer timestamp is second-precision)
    await new Promise((r) => setTimeout(r, 1100));
    const second = await createConversation(agent.id, "Second");
    const list = await listConversationsForAgent(agent.id);
    expect(list.map((c) => c.id)).toEqual([second.id, first.id]);
  });

  it("gets a conversation by id", async () => {
    const agent = await makeAgent();
    const conv = await createConversation(agent.id, "First");
    expect((await getConversationById(conv.id))?.title).toBe("First");
    expect(await getConversationById("missing")).toBeNull();
  });

  it("deletes a conversation", async () => {
    const agent = await makeAgent();
    const conv = await createConversation(agent.id, "First");
    expect(await deleteConversation(conv.id)).toBe(true);
    expect(await getConversationById(conv.id)).toBeNull();
    expect(await deleteConversation("missing")).toBe(false);
  });
});
