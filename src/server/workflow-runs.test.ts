import { describe, it, expect, afterEach, vi } from "vitest";
import { clearAllTables } from "@/db/test-helpers";
import { createWorkflow } from "./workflows";
import { createAgent } from "./agents";
import { upsertProviderConfig } from "./provider-config";
import { generateAgentReply } from "@/lib/ai/generate";
import {
  triggerWorkflowRun,
  getWorkflowRun,
  listWorkflowRuns,
  resumeWorkflowRun,
} from "./workflow-runs";

vi.mock("@/lib/ai/generate", () => ({
  generateAgentReply: vi.fn(async () => "mocked AI reply"),
}));

afterEach(clearAllTables);

const makeSimpleWorkflow = async () => {
  await upsertProviderConfig({ baseUrl: "https://api.example/v1", model: "m1", apiKey: "k1" });
  const agent = await createAgent({ name: "Helper", description: "", avatar: "", tags: [], systemPrompt: "Be nice", temperature: 0.7, maxTokens: 1024, topP: 1, model: null });
  const graph = {
    nodes: [{ id: "a", type: "agent" as const, label: "A", config: { agentId: agent.id, promptTemplate: "{{input}}" } }],
    edges: [],
  };
  return createWorkflow({ name: "Simple", description: "", graph });
};

describe("workflow run service", () => {
  it("triggers a run and completes", async () => {
    const w = await makeSimpleWorkflow();
    const run = await triggerWorkflowRun(w.id, "hello");
    expect(run.status).toBe("completed");
    expect(run.context).toHaveProperty("a");
  });

  it("retrieves a run by id", async () => {
    const w = await makeSimpleWorkflow();
    const run = await triggerWorkflowRun(w.id, "hello");
    const fetched = await getWorkflowRun(run.id);
    expect(fetched?.run.id).toBe(run.id);
    expect(fetched?.stepLogs.length).toBeGreaterThan(0);
  });

  it("lists runs for a workflow", async () => {
    const w = await makeSimpleWorkflow();
    await triggerWorkflowRun(w.id, "a");
    await triggerWorkflowRun(w.id, "b");
    const runs = await listWorkflowRuns(w.id);
    expect(runs).toHaveLength(2);
  });

  it("handles human_input pause and resume", async () => {
    await upsertProviderConfig({ baseUrl: "https://api.example/v1", model: "m1", apiKey: "k1" });
    const agent = await createAgent({ name: "H", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null });
    const graph = {
      nodes: [
        { id: "h", type: "human_input" as const, label: "Ask", config: { prompt: "What?" } },
        { id: "a", type: "agent" as const, label: "A", config: { agentId: agent.id, promptTemplate: "User: {{h.output}}" } },
      ],
      edges: [{ id: "e1", source: "h", target: "a" }],
    };
    const w = await createWorkflow({ name: "HI", description: "", graph });

    const run = await triggerWorkflowRun(w.id, "");
    expect(run.status).toBe("waiting_for_input");

    const resumed = await resumeWorkflowRun(run.id, "user input here");
    expect(resumed?.status).toBe("completed");
    expect(resumed?.context).toHaveProperty("a");
  });

  it("marks the step log as failed when a node throws", async () => {
    const w = await makeSimpleWorkflow();
    vi.mocked(generateAgentReply).mockRejectedValueOnce(new Error("boom"));

    const run = await triggerWorkflowRun(w.id, "hello");
    expect(run.status).toBe("failed");

    const fetched = await getWorkflowRun(run.id);
    const log = fetched?.stepLogs.find((l) => l.nodeId === "a");
    expect(log?.status).toBe("failed");
    expect(log?.output).toBe("boom");
  });

  it("correctly attributes step log outputs when nodes run in parallel", async () => {
    await upsertProviderConfig({ baseUrl: "https://api.example/v1", model: "m1", apiKey: "k1" });
    const agent1 = await createAgent({ name: "A1", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null });
    const agent2 = await createAgent({ name: "A2", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null });
    const graph = {
      nodes: [
        { id: "start", type: "transform" as const, label: "Start", config: { operation: "template" as const, params: { template: "go" }, inputTemplate: "" } },
        { id: "p1", type: "agent" as const, label: "P1", config: { agentId: agent1.id, promptTemplate: "{{start.output}}" } },
        { id: "p2", type: "agent" as const, label: "P2", config: { agentId: agent2.id, promptTemplate: "{{start.output}}" } },
      ],
      edges: [
        { id: "e1", source: "start", target: "p1" },
        { id: "e2", source: "start", target: "p2" },
      ],
    };
    const w = await createWorkflow({ name: "Parallel", description: "", graph });

    vi.mocked(generateAgentReply)
      .mockResolvedValueOnce("output-from-p1")
      .mockResolvedValueOnce("output-from-p2");

    const run = await triggerWorkflowRun(w.id, "");
    expect(run.status).toBe("completed");

    const fetched = await getWorkflowRun(run.id);
    const p1Log = fetched?.stepLogs.find((l) => l.nodeId === "p1");
    const p2Log = fetched?.stepLogs.find((l) => l.nodeId === "p2");
    expect(p1Log?.status).toBe("completed");
    expect(p1Log?.output).toBe("output-from-p1");
    expect(p2Log?.status).toBe("completed");
    expect(p2Log?.output).toBe("output-from-p2");
  });
});
