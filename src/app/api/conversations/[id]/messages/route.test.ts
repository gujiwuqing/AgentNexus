import { describe, it, expect, afterEach, vi } from "vitest";
import { clearAllTables, authedUser } from "@/db/test-helpers";
import { createAgent } from "@/server/agents";
import { createConversation } from "@/server/conversations";
import { upsertProviderConfig } from "@/server/provider-config";
import { listMessages } from "@/server/messages";

const { streamAgentReplyMock } = vi.hoisted(() => {
  const streamAgentReplyMock = vi.fn();
  return { streamAgentReplyMock };
});
vi.mock("@/lib/ai/chat", () => ({ streamAgentReply: streamAgentReplyMock }));

import { POST } from "./route";

afterEach(() => {
  streamAgentReplyMock.mockReset();
  return clearAllTables();
});

function postRequest(cookie: string, content: string) {
  return new Request("http://localhost", {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ content }),
  });
}

async function makeConversationWithProvider() {
  const { user, cookie } = await authedUser();
  await upsertProviderConfig({ baseUrl: "https://api.example/v1", model: "m1", apiKey: "k1" }, user.id);
  const agent = await createAgent({ name: "Helper", description: "", avatar: "", tags: [], systemPrompt: "Be nice", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, user.id);
  const conversation = await createConversation(agent.id, user.id, "Chat");
  return { conversation, cookie, user };
}

describe("POST /api/conversations/[id]/messages", () => {
  it("persists user + assistant messages with meta on finish", async () => {
    streamAgentReplyMock.mockImplementation(
      (_provider: unknown, _messages: unknown, _options: unknown, _tools: unknown, onFinish: (m: { text: string; usage?: unknown }) => void) => ({
        toDataStreamResponse: () => {
          onFinish({ text: "Hi! How can I help?", usage: { promptTokens: 3, completionTokens: 4, totalTokens: 7 }, toolCalls: [] });
          return new Response("mocked-data-stream");
        },
      })
    );

    const { conversation, cookie } = await makeConversationWithProvider();
    const res = await POST(postRequest(cookie, "Hello"), { params: Promise.resolve({ id: conversation.id }) });

    expect(res.status).toBe(200);

    const stored = await listMessages(conversation.id);
    expect(stored.map((m) => ({ role: m.role, content: m.content }))).toEqual([
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi! How can I help?" },
    ]);
    const assistant = stored[1];
    expect(assistant.model).toBe("m1");
    expect(assistant.totalTokens).toBe(7);
    expect(assistant.completionTokens).toBe(4);
    expect(assistant.durationMs).not.toBeNull();
  });

  it("returns 404 for a missing conversation", async () => {
    const { cookie } = await authedUser();
    const res = await POST(postRequest(cookie, "Hello"), { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });

  it("returns 400 for empty content", async () => {
    const { conversation, cookie } = await makeConversationWithProvider();
    const res = await POST(postRequest(cookie, "   "), { params: Promise.resolve({ id: conversation.id }) });
    expect(res.status).toBe(400);
  });

  it("returns 424 when no provider is configured", async () => {
    const { user, cookie } = await authedUser();
    const agent = await createAgent({ name: "Helper", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, user.id);
    const conversation = await createConversation(agent.id, user.id, "Chat");
    const res = await POST(postRequest(cookie, "Hello"), { params: Promise.resolve({ id: conversation.id }) });
    expect(res.status).toBe(424);
  });

  it("auto-updates conversation title from the first user message", async () => {
    streamAgentReplyMock.mockImplementation((_p: unknown, _m: unknown, _o: unknown, _tools: unknown, onFinish: (m: { text: string }) => void) => ({
      toDataStreamResponse: () => { onFinish({ text: "reply", toolCalls: [] }); return new Response("reply"); },
    }));

    const { user, cookie } = await authedUser();
    await upsertProviderConfig({ baseUrl: "https://api.example/v1", model: "m1", apiKey: "k1" }, user.id);
    const agent = await createAgent({ name: "Helper", description: "", avatar: "", tags: [], systemPrompt: "Be nice", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, user.id);
    const conversation = await createConversation(agent.id, user.id);
    await POST(postRequest(cookie, "This is my very first question to the agent about something"), { params: Promise.resolve({ id: conversation.id }) });

    const { getConversationById } = await import("@/server/conversations");
    const updated = await getConversationById(conversation.id);
    expect(updated?.title).not.toBe("New conversation");
    expect(updated?.title.length).toBeLessThanOrEqual(33);
  });
});
