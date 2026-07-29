import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables } from "@/db/test-helpers";
import { createAgent } from "@/server/agents";
import { createConversation } from "@/server/conversations";
import { GET, DELETE } from "./route";

afterEach(clearAllTables);

describe("GET /api/conversations/[id]", () => {
  it("returns the conversation with its (empty) messages", async () => {
    const agent = await createAgent({ name: "Helper", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null });
    const conv = await createConversation(agent.id, "Chat");
    const res = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: conv.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.conversation.id).toBe(conv.id);
    expect(body.messages).toEqual([]);
  });

  it("returns 404 for a missing conversation", async () => {
    const res = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/conversations/[id]", () => {
  it("deletes the conversation and returns 204", async () => {
    const agent = await createAgent({ name: "Helper", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null });
    const conv = await createConversation(agent.id, "Chat");
    const res = await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: conv.id }) });
    expect(res.status).toBe(204);
  });
});
