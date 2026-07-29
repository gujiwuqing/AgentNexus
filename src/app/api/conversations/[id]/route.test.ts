import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables, authedUser } from "@/db/test-helpers";
import { createAgent } from "@/server/agents";
import { createConversation } from "@/server/conversations";
import { GET, DELETE } from "./route";

afterEach(clearAllTables);

function req(cookie: string) {
  return new Request("http://localhost", { headers: { ...(cookie ? { cookie } : {}) } });
}

describe("GET /api/conversations/[id]", () => {
  it("returns the conversation with its (empty) messages", async () => {
    const { user, cookie } = await authedUser();
    const agent = await createAgent({ name: "Helper", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, user.id);
    const conv = await createConversation(agent.id, user.id, "Chat");
    const res = await GET(req(cookie), { params: Promise.resolve({ id: conv.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.conversation.id).toBe(conv.id);
    expect(body.messages).toEqual([]);
  });

  it("returns 404 for a missing conversation", async () => {
    const { cookie } = await authedUser();
    const res = await GET(req(cookie), { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });

  it("returns 404 for another user's conversation", async () => {
    const { user: alice } = await authedUser();
    const { cookie: bob } = await authedUser();
    const agent = await createAgent({ name: "Alice's", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, alice.id);
    const conv = await createConversation(agent.id, alice.id, "Chat");
    const res = await GET(req(bob), { params: Promise.resolve({ id: conv.id }) });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/conversations/[id]", () => {
  it("deletes the conversation and returns 204", async () => {
    const { user, cookie } = await authedUser();
    const agent = await createAgent({ name: "Helper", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, user.id);
    const conv = await createConversation(agent.id, user.id, "Chat");
    const res = await DELETE(req(cookie), { params: Promise.resolve({ id: conv.id }) });
    expect(res.status).toBe(204);
  });
});
