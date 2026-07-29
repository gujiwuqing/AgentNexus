import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables, authedUser } from "@/db/test-helpers";
import { createAgent } from "./agents";
import { createConversation, listConversationsForAgent, getConversationById, deleteConversation } from "./conversations";

afterEach(clearAllTables);

describe("conversation service", () => {
  it("creates a conversation scoped to an agent", async () => {
    const { user } = await authedUser();
    const agent = await createAgent({ name: "Helper", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, user.id);
    const conv = await createConversation(agent.id, user.id, "First chat");
    expect(conv.agentId).toBe(agent.id);
    expect(conv.title).toBe("First chat");
  });

  it("lists conversations for an agent, most recent first", async () => {
    const { user } = await authedUser();
    const agent = await createAgent({ name: "Helper", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, user.id);
    const first = await createConversation(agent.id, user.id, "First");
    await new Promise((r) => setTimeout(r, 1100));
    const second = await createConversation(agent.id, user.id, "Second");
    const list = await listConversationsForAgent(agent.id, user.id);
    expect(list.map((c) => c.id)).toEqual([second.id, first.id]);
  });

  it("gets a conversation by id", async () => {
    const { user } = await authedUser();
    const agent = await createAgent({ name: "Helper", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, user.id);
    const conv = await createConversation(agent.id, user.id, "First");
    expect((await getConversationById(conv.id))?.title).toBe("First");
    expect(await getConversationById("missing")).toBeNull();
  });

  it("deletes a conversation owned by the user", async () => {
    const { user } = await authedUser();
    const agent = await createAgent({ name: "Helper", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, user.id);
    const conv = await createConversation(agent.id, user.id, "First");
    expect(await deleteConversation(conv.id, user.id)).toBe(true);
    expect(await getConversationById(conv.id)).toBeNull();
    expect(await deleteConversation("missing", user.id)).toBe(false);
  });
});
