import { describe, it, expect, vi } from "vitest";
import { executeWorkflow, type EngineCallbacks } from "./engine";
import type { WorkflowGraph } from "@/types/workflow";

function makeCallbacks(overrides?: Partial<EngineCallbacks>): EngineCallbacks {
  return {
    callAgent: overrides?.callAgent ?? vi.fn(async () => "agent reply"),
    onStepStart: overrides?.onStepStart ?? vi.fn(async () => {}),
    onStepComplete: overrides?.onStepComplete ?? vi.fn(async () => {}),
    onStepFail: overrides?.onStepFail ?? vi.fn(async () => {}),
    onRunUpdate: overrides?.onRunUpdate ?? vi.fn(async () => {}),
  };
}

describe("executeWorkflow", () => {
  it("executes a single agent node", async () => {
    const graph: WorkflowGraph = {
      nodes: [
        { id: "a", type: "agent", label: "Agent A", config: { agentId: "agent-1", promptTemplate: "Hello {{input}}" } },
      ],
      edges: [],
    };
    const cb = makeCallbacks({ callAgent: vi.fn(async () => "AI says hi") });
    const result = await executeWorkflow(graph, "world", cb);

    expect(result.status).toBe("completed");
    expect(result.context.a).toBe("AI says hi");
    expect(cb.callAgent).toHaveBeenCalledWith("agent-1", "Hello world");
  });

  it("executes serial nodes passing output via template", async () => {
    const graph: WorkflowGraph = {
      nodes: [
        { id: "a", type: "agent", label: "A", config: { agentId: "a1", promptTemplate: "{{input}}" } },
        { id: "b", type: "agent", label: "B", config: { agentId: "a2", promptTemplate: "Refine: {{a.output}}" } },
      ],
      edges: [{ id: "e1", source: "a", target: "b" }],
    };
    const cb = makeCallbacks({
      callAgent: vi.fn()
        .mockResolvedValueOnce("draft")
        .mockResolvedValueOnce("refined"),
    });
    const result = await executeWorkflow(graph, "start", cb);

    expect(result.status).toBe("completed");
    expect(result.context.a).toBe("draft");
    expect(result.context.b).toBe("refined");
    expect(cb.callAgent).toHaveBeenNthCalledWith(2, "a2", "Refine: draft");
  });

  it("follows condition branches", async () => {
    const graph: WorkflowGraph = {
      nodes: [
        { id: "a", type: "agent", label: "A", config: { agentId: "a1", promptTemplate: "{{input}}" } },
        { id: "cond", type: "condition", label: "Check", config: { expression: "contains:yes", inputNodeId: "a", trueBranch: "t", falseBranch: "f" } },
        { id: "t", type: "transform", label: "True", config: { operation: "template", params: { template: "went true" }, inputTemplate: "" } },
        { id: "f", type: "transform", label: "False", config: { operation: "template", params: { template: "went false" }, inputTemplate: "" } },
      ],
      edges: [
        { id: "e1", source: "a", target: "cond" },
      ],
    };
    const cb = makeCallbacks({ callAgent: vi.fn(async () => "yes please") });
    const result = await executeWorkflow(graph, "", cb);

    expect(result.status).toBe("completed");
    expect(result.context.cond).toBe("true");
    expect(result.context.t).toBe("went true");
    expect(result.context.f).toBeUndefined();
  });

  it("executes parallel nodes", async () => {
    const graph: WorkflowGraph = {
      nodes: [
        { id: "start", type: "transform", label: "Start", config: { operation: "template", params: { template: "go" }, inputTemplate: "" } },
        { id: "p1", type: "agent", label: "P1", config: { agentId: "a1", promptTemplate: "{{start.output}}" } },
        { id: "p2", type: "agent", label: "P2", config: { agentId: "a2", promptTemplate: "{{start.output}}" } },
        { id: "merge", type: "transform", label: "Merge", config: { operation: "template", params: { template: "{{p1.output}} + {{p2.output}}" }, inputTemplate: "" } },
      ],
      edges: [
        { id: "e1", source: "start", target: "p1" },
        { id: "e2", source: "start", target: "p2" },
        { id: "e3", source: "p1", target: "merge" },
        { id: "e4", source: "p2", target: "merge" },
      ],
    };
    const cb = makeCallbacks({
      callAgent: vi.fn()
        .mockResolvedValueOnce("result1")
        .mockResolvedValueOnce("result2"),
    });
    const result = await executeWorkflow(graph, "", cb);

    expect(result.status).toBe("completed");
    expect(result.context.merge).toBe("result1 + result2");
  });

  it("pauses on human_input nodes", async () => {
    const graph: WorkflowGraph = {
      nodes: [
        { id: "h", type: "human_input", label: "Ask user", config: { prompt: "Enter something" } },
        { id: "a", type: "agent", label: "A", config: { agentId: "a1", promptTemplate: "User said: {{h.output}}" } },
      ],
      edges: [{ id: "e1", source: "h", target: "a" }],
    };
    const cb = makeCallbacks();
    const result = await executeWorkflow(graph, "", cb);

    expect(result.status).toBe("waiting_for_input");
    expect(result.currentNodeId).toBe("h");
  });

  it("resumes after human input", async () => {
    const graph: WorkflowGraph = {
      nodes: [
        { id: "h", type: "human_input", label: "Ask user", config: { prompt: "Enter something" } },
        { id: "a", type: "agent", label: "A", config: { agentId: "a1", promptTemplate: "User said: {{h.output}}" } },
      ],
      edges: [{ id: "e1", source: "h", target: "a" }],
    };
    const cb = makeCallbacks({ callAgent: vi.fn(async () => "processed") });
    const result = await executeWorkflow(graph, "", cb, {
      resumeFromNodeId: "h",
      resumeInput: "user typed this",
      existingContext: {},
    });

    expect(result.status).toBe("completed");
    expect(result.context.h).toBe("user typed this");
    expect(cb.callAgent).toHaveBeenCalledWith("a1", "User said: user typed this");
  });

  it("enforces max iterations", async () => {
    const graph: WorkflowGraph = {
      nodes: [
        { id: "a", type: "transform", label: "Loop", config: { operation: "template", params: { template: "no" }, inputTemplate: "" } },
        { id: "cond", type: "condition", label: "Check", config: { expression: "contains:yes", inputNodeId: "a", trueBranch: "done", falseBranch: "a" } },
        { id: "done", type: "transform", label: "Done", config: { operation: "template", params: { template: "finished" }, inputTemplate: "" } },
      ],
      edges: [
        { id: "e1", source: "a", target: "cond" },
      ],
    };
    const cb = makeCallbacks();
    const result = await executeWorkflow(graph, "", cb, { maxIterations: 5 });

    expect(result.status).toBe("failed");
    expect(result.error).toContain("Max iterations exceeded");
  });

  it("calls onStepFail with the failing node's id and error when a node throws", async () => {
    const graph: WorkflowGraph = {
      nodes: [
        { id: "a", type: "agent", label: "A", config: { agentId: "a1", promptTemplate: "{{input}}" } },
      ],
      edges: [],
    };
    const onStepFail = vi.fn(async () => {});
    const cb = makeCallbacks({
      callAgent: vi.fn(async () => {
        throw new Error("Agent a1 not found");
      }),
      onStepFail,
    });
    const result = await executeWorkflow(graph, "", cb);

    expect(result.status).toBe("failed");
    expect(result.error).toBe("Agent a1 not found");
    expect(onStepFail).toHaveBeenCalledWith("a", "Agent a1 not found");
  });
});
