import { describe, it, expect, afterEach, vi } from "vitest";
import { clearAllTables } from "@/db/test-helpers";
import { createWorkflow } from "@/server/workflows";
import { createAgent } from "@/server/agents";
import { upsertProviderConfig } from "@/server/provider-config";
import { GET, POST } from "./route";

vi.mock("@/lib/ai/generate", () => ({
  generateAgentReply: vi.fn(async () => "mocked reply"),
}));

afterEach(clearAllTables);

async function makeWorkflow() {
  await upsertProviderConfig({ baseUrl: "https://api.example/v1", model: "m1", apiKey: "k1" });
  const agent = await createAgent({ name: "H", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null });
  const graph = {
    nodes: [{ id: "a", type: "agent" as const, label: "A", config: { agentId: agent.id, promptTemplate: "{{input}}" } }],
    edges: [],
  };
  return createWorkflow({ name: "W", description: "", graph });
}

describe("POST /api/workflows/[id]/runs", () => {
  it("triggers a run and returns result", async () => {
    const w = await makeWorkflow();
    const res = await POST(
      new Request("http://localhost", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input: "hello" }) }),
      { params: Promise.resolve({ id: w.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("completed");
    expect(body.context).toHaveProperty("a");
  });
});

describe("GET /api/workflows/[id]/runs", () => {
  it("lists runs", async () => {
    const w = await makeWorkflow();
    await POST(
      new Request("http://localhost", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input: "x" }) }),
      { params: Promise.resolve({ id: w.id }) }
    );
    const res = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: w.id }) });
    expect(res.status).toBe(200);
    expect((await res.json()).length).toBe(1);
  });
});
