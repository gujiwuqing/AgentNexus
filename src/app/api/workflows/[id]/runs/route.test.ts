import { describe, it, expect, afterEach, vi } from "vitest";
import { clearAllTables, authedUser } from "@/db/test-helpers";
import { createWorkflow } from "@/server/workflows";
import { createAgent } from "@/server/agents";
import { upsertProviderConfig } from "@/server/provider-config";
import { GET, POST } from "./route";

vi.mock("@/lib/ai/generate", () => ({
  generateAgentReply: vi.fn(async () => "mocked reply"),
}));

afterEach(clearAllTables);

async function makeWorkflow() {
  const { user, cookie } = await authedUser();
  await upsertProviderConfig({ baseUrl: "https://api.example/v1", model: "m1", apiKey: "k1" }, user.id);
  const agent = await createAgent({ name: "H", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, user.id);
  const graph = {
    nodes: [{ id: "a", type: "agent" as const, label: "A", config: { agentId: agent.id, promptTemplate: "{{input}}" } }],
    edges: [],
  };
  const w = await createWorkflow({ name: "W", description: "", graph }, user.id);
  return { w, cookie };
}

function postRequest(cookie: string, body: unknown) {
  return new Request("http://localhost", {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

function req(cookie: string) {
  return new Request("http://localhost", { headers: { ...(cookie ? { cookie } : {}) } });
}

describe("POST /api/workflows/[id]/runs", () => {
  it("triggers a run and returns result", async () => {
    const { w, cookie } = await makeWorkflow();
    const res = await POST(postRequest(cookie, { input: "hello" }), { params: Promise.resolve({ id: w.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("completed");
    expect(body.context).toHaveProperty("a");
  });
});

describe("GET /api/workflows/[id]/runs", () => {
  it("lists runs", async () => {
    const { w, cookie } = await makeWorkflow();
    await POST(postRequest(cookie, { input: "x" }), { params: Promise.resolve({ id: w.id }) });
    const res = await GET(req(cookie), { params: Promise.resolve({ id: w.id }) });
    expect(res.status).toBe(200);
    expect((await res.json()).length).toBe(1);
  });
});
