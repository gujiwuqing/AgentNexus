import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables } from "@/db/test-helpers";
import { createAgent } from "@/server/agents";
import { createConversation } from "@/server/conversations";
import { appendUserMessage, listMessages } from "@/server/messages";
import { DELETE } from "./route";

afterEach(clearAllTables);

describe("DELETE /api/messages/[id]", () => {
  it("deletes the message and returns 204", async () => {
    const agent = await createAgent({ name: "H", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null });
    const conv = await createConversation(agent.id, "Chat");
    const msg = await appendUserMessage(conv.id, "Hello");

    const res = await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: msg.id }) });
    expect(res.status).toBe(204);
    expect(await listMessages(conv.id)).toHaveLength(0);
  });

  it("returns 404 for a non-existent message", async () => {
    const res = await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });
});
