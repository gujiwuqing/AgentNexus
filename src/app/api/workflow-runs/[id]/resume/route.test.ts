import { describe, it, expect, afterEach, vi } from "vitest";
import { clearAllTables } from "@/db/test-helpers";
import { createWorkflow } from "@/server/workflows";
import { createAgent } from "@/server/agents";
import { upsertProviderConfig } from "@/server/provider-config";
import { triggerWorkflowRun } from "@/server/workflow-runs";
import { POST } from "./route";

vi.mock("@/lib/ai/generate", () => ({
  generateAgentReply: vi.fn(async () => "mocked reply after resume"),
}));

afterEach(clearAllTables);

describe("POST /api/workflow-runs/[id]/resume", () => {
  it("resumes a waiting run", async () => {
    await upsertProviderConfig({ baseUrl: "https://api.example/v1", model: "m1", apiKey: "k1" });
    const agent = await createAgent({ name: "H", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null });
    const graph = {
      nodes: [
        { id: "h", type: "human_input" as const, label: "Ask", config: { prompt: "What?" } },
        { id: "a", type: "agent" as const, label: "A", config: { agentId: agent.id, promptTemplate: "{{h.output}}" } },
      ],
      edges: [{ id: "e1", source: "h", target: "a" }],
    };
    const w = await createWorkflow({ name: "HI", description: "", graph });

    const run = await triggerWorkflowRun(w.id, "");
    expect(run.status).toBe("waiting_for_input");

    const res = await POST(
      new Request("http://localhost", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input: "user answer" }) }),
      { params: Promise.resolve({ id: run.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("completed");
  });

  it("returns 404 for non-resumable run", async () => {
    const res = await POST(
      new Request("http://localhost", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input: "x" }) }),
      { params: Promise.resolve({ id: "missing" }) }
    );
    expect(res.status).toBe(404);
  });
});
