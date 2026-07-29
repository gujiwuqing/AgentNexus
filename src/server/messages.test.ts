import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables, authedUser } from "@/db/test-helpers";
import { createAgent } from "./agents";
import { createConversation } from "./conversations";
import { listMessages, appendUserMessage, appendAssistantMessage, deleteMessage, getMessage } from "./messages";

afterEach(clearAllTables);

async function makeConversation() {
  const { user } = await authedUser();
  const agent = await createAgent({ name: "Helper", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, user.id);
  return { user, conv: await createConversation(agent.id, user.id, "Chat") };
}

describe("message write helpers", () => {
  it("appends a user message", async () => {
    const { conv } = await makeConversation();
    const msg = await appendUserMessage(conv.id, "Hello");
    expect(msg.role).toBe("user");
    expect(msg.content).toBe("Hello");
    expect(await listMessages(conv.id)).toHaveLength(1);
  });

  it("appends an assistant message", async () => {
    const { conv } = await makeConversation();
    await appendUserMessage(conv.id, "Hello");
    const msg = await appendAssistantMessage(conv.id, "Hi there");
    expect(msg.role).toBe("assistant");
    const all = await listMessages(conv.id);
    expect(all.map((m) => m.role)).toEqual(["user", "assistant"]);
  });

  it("appendAssistantMessage persists meta when provided", async () => {
    const { conv } = await makeConversation();
    const row = await appendAssistantMessage(conv.id, "hi", {
      model: "gpt-test", promptTokens: 10, completionTokens: 5, totalTokens: 15, durationMs: 1234,
    });
    expect(row.model).toBe("gpt-test");
    expect(row.totalTokens).toBe(15);
    expect(row.durationMs).toBe(1234);
  });

  it("appendAssistantMessage leaves meta null when omitted", async () => {
    const { conv } = await makeConversation();
    const row = await appendAssistantMessage(conv.id, "hi");
    expect(row.model).toBeNull();
    expect(row.totalTokens).toBeNull();
  });
});

describe("getMessage", () => {
  it("returns the message when it exists", async () => {
    const { conv } = await makeConversation();
    const msg = await appendUserMessage(conv.id, "Hello");
    expect((await getMessage(msg.id))?.content).toBe("Hello");
  });

  it("returns null for a missing id", async () => {
    expect(await getMessage("missing")).toBeNull();
  });
});

describe("deleteMessage", () => {
  it("deletes an existing message", async () => {
    const { conv } = await makeConversation();
    const msg = await appendUserMessage(conv.id, "Hello");
    expect(await deleteMessage(msg.id)).toBe(true);
    expect(await listMessages(conv.id)).toHaveLength(0);
  });

  it("returns false for a non-existent message", async () => {
    expect(await deleteMessage("missing")).toBe(false);
  });
});
