import { describe, it, expect, afterEach, vi } from "vitest";
import { clearAllTables, authedUser } from "@/db/test-helpers";
import { createWorkflow } from "@/server/workflows";
import { createAgent } from "@/server/agents";
import { upsertProviderConfig } from "@/server/provider-config";
import { enqueueWorkflowRun, getWorkflowRun } from "@/server/workflow-runs";
import { drainWorkflowQueue } from "@/server/workflow-worker";
import { POST } from "./route";

vi.mock("@/lib/ai/generate", () => ({
  generateAgentReply: vi.fn(async () => "mocked reply after resume"),
}));

afterEach(clearAllTables);

function postRequest(cookie: string, body: unknown) {
  return new Request("http://localhost", {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

describe("POST /api/workflow-runs/[id]/resume", () => {
  it("resumes a waiting run", async () => {
    const { user, cookie } = await authedUser();
    await upsertProviderConfig({ baseUrl: "https://api.example/v1", model: "m1", apiKey: "k1" }, user.id);
    const agent = await createAgent({ name: "H", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, user.id);
    const graph = {
      nodes: [
        { id: "h", type: "human_input" as const, label: "Ask", config: { prompt: "What?" } },
        { id: "a", type: "agent" as const, label: "A", config: { agentId: agent.id, promptTemplate: "{{h.output}}" } },
      ],
      edges: [{ id: "e1", source: "h", target: "a" }],
    };
    const w = await createWorkflow({ name: "HI", description: "", graph }, user.id);

    const run = await enqueueWorkflowRun(w.id, "");
    await drainWorkflowQueue();
    const paused = await getWorkflowRun(run.id);
    expect(paused?.run.status).toBe("waiting_for_input");

    // 恢复现在是异步的：接口返回 202 + queued，执行由 worker 完成
    const res = await POST(postRequest(cookie, { input: "user answer" }), { params: Promise.resolve({ id: run.id }) });
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.status).toBe("queued");

    await drainWorkflowQueue();
    const done = await getWorkflowRun(run.id);
    expect(done?.run.status).toBe("completed");
  });

  it("returns 404 for non-resumable run", async () => {
    const { cookie } = await authedUser();
    const res = await POST(postRequest(cookie, { input: "x" }), { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });
});
