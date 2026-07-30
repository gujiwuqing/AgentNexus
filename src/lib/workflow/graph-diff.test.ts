import { describe, it, expect } from "vitest";
import { isSameGraph, diffGraphs } from "./graph-diff";
import type { WorkflowGraph } from "@/types/workflow";

function graph(nodes: WorkflowGraph["nodes"], edges: WorkflowGraph["edges"] = []): WorkflowGraph {
  return { nodes, edges };
}

const agentNode = (id: string, label: string, agentId = "a1") =>
  ({ id, type: "agent" as const, label, config: { agentId, promptTemplate: "{{input}}" } });

describe("isSameGraph", () => {
  it("treats identical graphs as the same", () => {
    const a = graph([agentNode("n1", "A")], [{ id: "e1", source: "n1", target: "n1" }]);
    const b = graph([agentNode("n1", "A")], [{ id: "e2", source: "n1", target: "n1" }]);
    // edge id 不参与比较，只看 source→target
    expect(isSameGraph(a, b)).toBe(true);
  });

  it("ignores node position changes", () => {
    const a = graph([{ ...agentNode("n1", "A"), position: { x: 0, y: 0 } }]);
    const b = graph([{ ...agentNode("n1", "A"), position: { x: 500, y: 300 } }]);
    expect(isSameGraph(a, b)).toBe(true);
  });

  it("ignores node ordering", () => {
    const a = graph([agentNode("n1", "A"), agentNode("n2", "B")]);
    const b = graph([agentNode("n2", "B"), agentNode("n1", "A")]);
    expect(isSameGraph(a, b)).toBe(true);
  });

  it("detects config changes", () => {
    const a = graph([agentNode("n1", "A", "agent-1")]);
    const b = graph([agentNode("n1", "A", "agent-2")]);
    expect(isSameGraph(a, b)).toBe(false);
  });

  it("detects label changes", () => {
    expect(isSameGraph(graph([agentNode("n1", "A")]), graph([agentNode("n1", "B")]))).toBe(false);
  });

  it("detects edge changes", () => {
    const a = graph([agentNode("n1", "A"), agentNode("n2", "B")], [{ id: "e1", source: "n1", target: "n2" }]);
    const b = graph([agentNode("n1", "A"), agentNode("n2", "B")], []);
    expect(isSameGraph(a, b)).toBe(false);
  });

  it("returns false when either graph is missing", () => {
    expect(isSameGraph(null, graph([]))).toBe(false);
    expect(isSameGraph(graph([]), undefined)).toBe(false);
  });
});

describe("diffGraphs", () => {
  it("reports identical when nothing changed", () => {
    const g = graph([agentNode("n1", "A")]);
    expect(diffGraphs(g, g).identical).toBe(true);
  });

  it("reports added and removed nodes by label", () => {
    const from = graph([agentNode("n1", "Writer")]);
    const to = graph([agentNode("n2", "Reviewer")]);
    const diff = diffGraphs(from, to);
    expect(diff.addedNodes).toEqual(["Reviewer"]);
    expect(diff.removedNodes).toEqual(["Writer"]);
    expect(diff.identical).toBe(false);
  });

  it("reports changed nodes when config differs", () => {
    const from = graph([agentNode("n1", "Writer", "agent-1")]);
    const to = graph([agentNode("n1", "Writer", "agent-2")]);
    const diff = diffGraphs(from, to);
    expect(diff.changedNodes).toEqual(["Writer"]);
    expect(diff.addedNodes).toEqual([]);
    expect(diff.removedNodes).toEqual([]);
  });

  it("reports edge changes using node labels", () => {
    const nodes = [agentNode("n1", "Writer"), agentNode("n2", "Reviewer")];
    const from = graph(nodes, []);
    const to = graph(nodes, [{ id: "e1", source: "n1", target: "n2" }]);
    const diff = diffGraphs(from, to);
    expect(diff.addedEdges).toEqual(["Writer → Reviewer"]);
    expect(diff.removedEdges).toEqual([]);
  });

  it("does not flag position-only moves as changes", () => {
    const from = graph([{ ...agentNode("n1", "A"), position: { x: 0, y: 0 } }]);
    const to = graph([{ ...agentNode("n1", "A"), position: { x: 99, y: 99 } }]);
    expect(diffGraphs(from, to).identical).toBe(true);
  });
});
