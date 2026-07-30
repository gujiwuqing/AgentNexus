import { describe, it, expect } from "vitest";
import { validateGraph, issueCountByNode } from "./validate-graph";
import type { WorkflowGraph, WorkflowNode } from "@/types/workflow";

function graph(nodes: WorkflowNode[], edges: WorkflowGraph["edges"] = []): WorkflowGraph {
  return { nodes, edges };
}

function codesOf(g: WorkflowGraph): string[] {
  return validateGraph(g).map((i) => i.code);
}

describe("validateGraph", () => {
  it("flags an empty graph", () => {
    expect(codesOf(graph([]))).toEqual(["graphEmpty"]);
  });

  it("accepts a fully configured agent node", () => {
    const g = graph([
      { id: "n1", type: "agent", label: "A", config: { agentId: "a1", promptTemplate: "{{input}}" } },
    ]);
    expect(validateGraph(g)).toEqual([]);
  });

  it("flags an agent node with no agent selected and no prompt", () => {
    const g = graph([
      { id: "n1", type: "agent", label: "A", config: { agentId: "", promptTemplate: "" } },
    ]);
    expect(codesOf(g)).toEqual(["agentMissingAgent", "agentMissingPrompt"]);
  });

  it("flags condition nodes missing expression, input or branches", () => {
    const g = graph([
      { id: "n1", type: "condition", label: "C", config: { expression: "", inputNodeId: "", trueBranch: "", falseBranch: "" } },
    ]);
    const codes = codesOf(g);
    expect(codes).toContain("conditionMissingExpression");
    expect(codes).toContain("conditionMissingInput");
    expect(codes).toContain("conditionMissingBranch");
  });

  it("flags condition branches pointing at removed nodes", () => {
    const g = graph([
      { id: "n1", type: "condition", label: "C", config: { expression: "contains:x", inputNodeId: "n1", trueBranch: "ghost", falseBranch: "n1" } },
    ]);
    expect(codesOf(g)).toContain("conditionUnknownBranch");
  });

  it("requires a template param for template transforms", () => {
    const g = graph([
      { id: "n1", type: "transform", label: "T", config: { operation: "template", params: {}, inputTemplate: "" } },
    ]);
    expect(codesOf(g)).toContain("transformMissingTemplate");
  });

  it("validates http node urls but allows templated ones", () => {
    const missing = graph([
      { id: "n1", type: "http_request", label: "H", config: { url: "", method: "GET" } },
    ]);
    expect(codesOf(missing)).toContain("httpMissingUrl");

    const invalid = graph([
      { id: "n1", type: "http_request", label: "H", config: { url: "example.com", method: "GET" } },
    ]);
    expect(codesOf(invalid)).toContain("httpInvalidUrl");

    const templated = graph([
      { id: "n1", type: "http_request", label: "H", config: { url: "{{input}}/api", method: "GET" } },
    ]);
    expect(codesOf(templated)).toEqual([]);
  });

  it("flags empty code and out-of-range delay", () => {
    expect(codesOf(graph([{ id: "n1", type: "code_execute", label: "X", config: { code: "  " } }]))).toContain(
      "codeMissingCode",
    );
    expect(
      codesOf(graph([{ id: "n1", type: "delay", label: "D", config: { durationMs: 99999, inputNodeId: "n1" } }])),
    ).toContain("delayInvalidDuration");
  });

  it("flags aggregate nodes without sources", () => {
    const g = graph([
      { id: "n1", type: "variable_aggregate", label: "M", config: { sourceNodeIds: [] } },
    ]);
    expect(codesOf(g)).toContain("aggregateMissingSources");
  });

  it("accepts human_input without a prompt", () => {
    const g = graph([{ id: "n1", type: "human_input", label: "H", config: { prompt: "" } }]);
    expect(validateGraph(g)).toEqual([]);
  });

  it("flags edges pointing at unknown nodes", () => {
    const g = graph(
      [{ id: "n1", type: "human_input", label: "H", config: { prompt: "" } }],
      [{ id: "e1", source: "n1", target: "ghost" }],
    );
    expect(codesOf(g)).toContain("graphUnknownEdge");
  });

  it("attaches node id and label to each issue", () => {
    const g = graph([
      { id: "n1", type: "agent", label: "Writer", config: { agentId: "", promptTemplate: "x" } },
    ]);
    const [issue] = validateGraph(g);
    expect(issue.nodeId).toBe("n1");
    expect(issue.nodeLabel).toBe("Writer");
  });
});

describe("issueCountByNode", () => {
  it("counts issues per node and skips graph-level ones", () => {
    const g = graph([
      { id: "n1", type: "agent", label: "A", config: { agentId: "", promptTemplate: "" } },
      { id: "n2", type: "code_execute", label: "B", config: { code: "" } },
    ]);
    expect(issueCountByNode(validateGraph(g))).toEqual({ n1: 2, n2: 1 });
    expect(issueCountByNode(validateGraph(graph([])))).toEqual({});
  });
});
