import { describe, it, expect, afterEach, vi } from "vitest";
import { clearAllTables, authedUser } from "@/db/test-helpers";
import { createWorkflow } from "./workflows";
import { createAgent } from "./agents";
import { upsertProviderConfig } from "./provider-config";
import { generateAgentReply } from "@/lib/ai/generate";
import {
  enqueueWorkflowRun,
  enqueueResumeRun,
  getWorkflowRun,
  listWorkflowRuns,
} from "./workflow-runs";
import { drainWorkflowQueue } from "./workflow-worker";

vi.mock("@/lib/ai/generate", () => ({
  generateAgentReply: vi.fn(async () => "mocked AI reply"),
}));

afterEach(clearAllTables);

const makeSimpleWorkflow = async (userId: string) => {
  await upsertProviderConfig({ baseUrl: "https://api.example/v1", model: "m1", apiKey: "k1" }, userId);
  const agent = await createAgent({ name: "Helper", description: "", avatar: "", tags: [], systemPrompt: "Be nice", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, userId);
  const graph = {
    nodes: [{ id: "a", type: "agent" as const, label: "A", config: { agentId: agent.id, promptTemplate: "{{input}}" } }],
    edges: [],
  };
  return createWorkflow({ name: "Simple", description: "", graph }, userId);
};

describe("workflow run service", () => {
  it("enqueues a run without executing it inline", async () => {
    const { user } = await authedUser();
    const w = await makeSimpleWorkflow(user.id);

    const queued = await enqueueWorkflowRun(w.id, "hello");
    expect(queued.status).toBe("queued");

    // 入队阶段不应执行任何节点
    const beforeDrain = await getWorkflowRun(queued.id);
    expect(beforeDrain?.run.status).toBe("queued");
    expect(beforeDrain?.stepLogs).toHaveLength(0);
  });

  it("completes the run once the queue is drained", async () => {
    const { user } = await authedUser();
    const w = await makeSimpleWorkflow(user.id);

    const queued = await enqueueWorkflowRun(w.id, "hello");
    const processed = await drainWorkflowQueue();
    expect(processed).toBe(1);

    const fetched = await getWorkflowRun(queued.id);
    expect(fetched?.run.status).toBe("completed");
    expect(fetched?.run.context).toHaveProperty("a");
    expect(fetched?.stepLogs.length).toBeGreaterThan(0);
  });

  it("lists runs for a workflow", async () => {
    const { user } = await authedUser();
    const w = await makeSimpleWorkflow(user.id);
    await enqueueWorkflowRun(w.id, "a");
    await enqueueWorkflowRun(w.id, "b");
    await drainWorkflowQueue();

    const runs = await listWorkflowRuns(w.id);
    expect(runs).toHaveLength(2);
    expect(runs.every((r) => r.status === "completed")).toBe(true);
  });

  it("handles human_input pause and resume through the queue", async () => {
    const { user } = await authedUser();
    await upsertProviderConfig({ baseUrl: "https://api.example/v1", model: "m1", apiKey: "k1" }, user.id);
    const agent = await createAgent({ name: "H", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, user.id);
    const graph = {
      nodes: [
        { id: "h", type: "human_input" as const, label: "Ask", config: { prompt: "What?" } },
        { id: "a", type: "agent" as const, label: "A", config: { agentId: agent.id, promptTemplate: "User: {{h.output}}" } },
      ],
      edges: [{ id: "e1", source: "h", target: "a" }],
    };
    const w = await createWorkflow({ name: "HI", description: "", graph }, user.id);

    const queued = await enqueueWorkflowRun(w.id, "");
    await drainWorkflowQueue();
    const paused = await getWorkflowRun(queued.id);
    expect(paused?.run.status).toBe("waiting_for_input");

    const resumed = await enqueueResumeRun(queued.id, "user input here");
    expect(resumed?.status).toBe("queued");
    await drainWorkflowQueue();

    const done = await getWorkflowRun(queued.id);
    expect(done?.run.status).toBe("completed");
    expect(done?.run.context).toHaveProperty("a");
  });

  it("marks the step log as failed when a node throws", async () => {
    const { user } = await authedUser();
    const w = await makeSimpleWorkflow(user.id);
    vi.mocked(generateAgentReply).mockRejectedValueOnce(new Error("boom"));

    const queued = await enqueueWorkflowRun(w.id, "hello");
    await drainWorkflowQueue();

    const fetched = await getWorkflowRun(queued.id);
    expect(fetched?.run.status).toBe("failed");
    const log = fetched?.stepLogs.find((l) => l.nodeId === "a");
    expect(log?.status).toBe("failed");
    expect(log?.output).toBe("boom");
  });

  it("correctly attributes step log outputs when nodes run in parallel", async () => {
    const { user } = await authedUser();
    await upsertProviderConfig({ baseUrl: "https://api.example/v1", model: "m1", apiKey: "k1" }, user.id);
    const agent1 = await createAgent({ name: "A1", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, user.id);
    const agent2 = await createAgent({ name: "A2", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, user.id);
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
    const w = await createWorkflow({ name: "Parallel", description: "", graph }, user.id);

    vi.mocked(generateAgentReply)
      .mockResolvedValueOnce("output-from-p1")
      .mockResolvedValueOnce("output-from-p2");

    const queued = await enqueueWorkflowRun(w.id, "");
    await drainWorkflowQueue();

    const fetched = await getWorkflowRun(queued.id);
    expect(fetched?.run.status).toBe("completed");
    const p1Log = fetched?.stepLogs.find((l) => l.nodeId === "p1");
    const p2Log = fetched?.stepLogs.find((l) => l.nodeId === "p2");
    expect(p1Log?.status).toBe("completed");
    expect(p1Log?.output).toBe("output-from-p1");
    expect(p2Log?.status).toBe("completed");
    expect(p2Log?.output).toBe("output-from-p2");
  });

  it("refuses to resume a run that is not waiting for input", async () => {
    const { user } = await authedUser();
    const w = await makeSimpleWorkflow(user.id);
    const queued = await enqueueWorkflowRun(w.id, "hello");
    await drainWorkflowQueue();

    // 已完成的运行不能被恢复
    expect(await enqueueResumeRun(queued.id, "x")).toBeNull();
  });
});
