import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables, authedUser } from "@/db/test-helpers";
import { createAgent } from "@/server/agents";
import { createConversation } from "@/server/conversations";
import { upsertProviderConfig } from "@/server/provider-config";
import { listMessages } from "@/server/messages";

import { POST } from "./route";

afterEach(() => clearAllTables());

function postRequest(cookie: string, body: unknown) {
  return new Request("http://localhost", {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

async function seed() {
  const { user, cookie } = await authedUser();
  await upsertProviderConfig({ baseUrl: "https://api.example/v1", model: "m1", apiKey: "k1" }, user.id);
  const agent = await createAgent({ name: "A", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, user.id);
  const conv = await createConversation(agent.id, user.id, "T");
  return { agent, conv, cookie };
}

describe("POST /api/conversations/[id]/messages/assistant", () => {
  it("persists a partial assistant message with model + durationMs", async () => {
    const { conv, cookie } = await seed();
    const res = await POST(postRequest(cookie, { content: "partial reply", model: "m1", durationMs: 500 }), {
      params: Promise.resolve({ id: conv.id }),
    });
    expect(res.status).toBe(201);
    const stored = await listMessages(conv.id);
    expect(stored).toHaveLength(1);
    expect(stored[0].role).toBe("assistant");
    expect(stored[0].content).toBe("partial reply");
    expect(stored[0].model).toBe("m1");
    expect(stored[0].durationMs).toBe(500);
    expect(stored[0].totalTokens).toBeNull();
  });

  it("returns 404 for a missing conversation", async () => {
    const { cookie } = await authedUser();
    const res = await POST(postRequest(cookie, { content: "x" }), { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });

  it("returns 400 when content is empty", async () => {
    const { conv, cookie } = await seed();
    const res = await POST(postRequest(cookie, { content: "   " }), { params: Promise.resolve({ id: conv.id }) });
    expect(res.status).toBe(400);
  });
});
