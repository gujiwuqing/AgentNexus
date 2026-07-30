import { describe, it, expect, afterEach, vi } from "vitest";
import { clearAllTables, authedUser } from "@/db/test-helpers";
import { createWorkflow } from "@/server/workflows";
import { createAgent } from "@/server/agents";
import { upsertProviderConfig } from "@/server/provider-config";
import { enqueueWorkflowRun } from "@/server/workflow-runs";
import { drainWorkflowQueue } from "@/server/workflow-worker";
import { GET } from "./route";

vi.mock("@/lib/ai/generate", () => ({
  generateAgentReply: vi.fn(async () => "mocked reply"),
}));

afterEach(clearAllTables);

function req(cookie: string) {
  return new Request("http://localhost", { headers: { ...(cookie ? { cookie } : {}) } });
}

describe("GET /api/workflow-runs/[id]", () => {
  it("returns run detail with step logs", async () => {
    const { user, cookie } = await authedUser();
    await upsertProviderConfig({ baseUrl: "https://api.example/v1", model: "m1", apiKey: "k1" }, user.id);
    const agent = await createAgent({ name: "H", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, user.id);
    const graph = { nodes: [{ id: "a", type: "agent" as const, label: "A", config: { agentId: agent.id, promptTemplate: "{{input}}" } }], edges: [] };
    const w = await createWorkflow({ name: "W", description: "", graph }, user.id);
    const run = await enqueueWorkflowRun(w.id, "test");
    await drainWorkflowQueue();

    const res = await GET(req(cookie), { params: Promise.resolve({ id: run.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.run.status).toBe("completed");
    expect(body.stepLogs.length).toBeGreaterThan(0);
  });

  it("returns 404 for missing run", async () => {
    const { cookie } = await authedUser();
    const res = await GET(req(cookie), { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });

  it("returns 404 for another user's run", async () => {
    const { user: alice } = await authedUser();
    const { cookie: bob } = await authedUser();
    await upsertProviderConfig({ baseUrl: "https://api.example/v1", model: "m1", apiKey: "k1" }, alice.id);
    const agent = await createAgent({ name: "H", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, alice.id);
    const graph = { nodes: [{ id: "a", type: "agent" as const, label: "A", config: { agentId: agent.id, promptTemplate: "{{input}}" } }], edges: [] };
    const w = await createWorkflow({ name: "W", description: "", graph }, alice.id);
    const run = await enqueueWorkflowRun(w.id, "test");
    await drainWorkflowQueue();
    const res = await GET(req(bob), { params: Promise.resolve({ id: run.id }) });
    expect(res.status).toBe(404);
  });
});
