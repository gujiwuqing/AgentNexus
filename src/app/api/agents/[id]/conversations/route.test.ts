import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables } from "@/db/test-helpers";
import { createAgent } from "@/server/agents";
import { GET, POST } from "./route";

afterEach(clearAllTables);

describe("agent conversations route", () => {
  it("creates a conversation for the agent", async () => {
    const agent = await createAgent({ name: "Helper", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null });
    const res = await POST(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({ title: "Chat 1" }) }),
      { params: Promise.resolve({ id: agent.id }) }
    );
    expect(res.status).toBe(201);
    expect((await res.json()).agentId).toBe(agent.id);
  });

  it("lists conversations for the agent", async () => {
    const agent = await createAgent({ name: "Helper", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null });
    await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({}) }), { params: Promise.resolve({ id: agent.id }) });
    const res = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: agent.id }) });
    expect((await res.json())).toHaveLength(1);
  });
});
