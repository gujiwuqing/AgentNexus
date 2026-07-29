import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables, authedUser } from "@/db/test-helpers";
import { createAgent } from "@/server/agents";
import { createConversation } from "@/server/conversations";
import { appendUserMessage, listMessages } from "@/server/messages";
import { DELETE } from "./route";

afterEach(clearAllTables);

function req(cookie: string) {
  return new Request("http://localhost", { headers: { ...(cookie ? { cookie } : {}) } });
}

describe("DELETE /api/messages/[id]", () => {
  it("deletes the message and returns 204", async () => {
    const { user, cookie } = await authedUser();
    const agent = await createAgent({ name: "H", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, user.id);
    const conv = await createConversation(agent.id, user.id, "Chat");
    const msg = await appendUserMessage(conv.id, "Hello");

    const res = await DELETE(req(cookie), { params: Promise.resolve({ id: msg.id }) });
    expect(res.status).toBe(204);
    expect(await listMessages(conv.id)).toHaveLength(0);
  });

  it("returns 404 for a non-existent message", async () => {
    const { cookie } = await authedUser();
    const res = await DELETE(req(cookie), { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });

  it("returns 404 when the message belongs to another user", async () => {
    const { user: alice } = await authedUser();
    const { cookie: bob } = await authedUser();
    const agent = await createAgent({ name: "A", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, alice.id);
    const conv = await createConversation(agent.id, alice.id, "Chat");
    const msg = await appendUserMessage(conv.id, "Hello");
    const res = await DELETE(req(bob), { params: Promise.resolve({ id: msg.id }) });
    expect(res.status).toBe(404);
  });
});
