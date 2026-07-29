import { describe, it, expect, afterEach, vi } from "vitest";
import { clearAllTables } from "@/db/test-helpers";
import { createWorkflow } from "@/server/workflows";
import { createAgent } from "@/server/agents";
import { upsertProviderConfig } from "@/server/provider-config";
import { triggerWorkflowRun } from "@/server/workflow-runs";
import { GET } from "./route";

vi.mock("@/lib/ai/generate", () => ({
  generateAgentReply: vi.fn(async () => "mocked reply"),
}));

afterEach(clearAllTables);

describe("GET /api/workflow-runs/[id]", () => {
  it("returns run detail with step logs", async () => {
    await upsertProviderConfig({ baseUrl: "https://api.example/v1", model: "m1", apiKey: "k1" });
    const agent = await createAgent({ name: "H", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null });
    const graph = { nodes: [{ id: "a", type: "agent" as const, label: "A", config: { agentId: agent.id, promptTemplate: "{{input}}" } }], edges: [] };
    const w = await createWorkflow({ name: "W", description: "", graph });
    const run = await triggerWorkflowRun(w.id, "test");

    const res = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: run.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.run.status).toBe("completed");
    expect(body.stepLogs.length).toBeGreaterThan(0);
  });

  it("returns 404 for missing run", async () => {
    const res = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });
});
