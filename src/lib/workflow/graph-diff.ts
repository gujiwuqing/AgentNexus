import type { WorkflowGraph, WorkflowNode } from "@/types/workflow";

/** 稳定序列化：忽略键顺序与节点/边的排列顺序，只比较实际内容。 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

/** 节点指纹：位置变化不算内容变化，避免拖动节点就产生新版本。 */
function nodeFingerprint(node: WorkflowNode): string {
  return stableStringify({
    id: node.id,
    type: node.type,
    label: node.label,
    config: node.config,
  });
}

function graphFingerprint(graph: WorkflowGraph): string {
  const nodes = [...(graph.nodes ?? [])]
    .map(nodeFingerprint)
    .sort();
  const edges = [...(graph.edges ?? [])]
    .map((e) => `${e.source}->${e.target}`)
    .sort();
  return stableStringify({ nodes, edges });
}

/** 两个图在语义上是否相同（忽略节点坐标与顺序）。 */
export function isSameGraph(a: WorkflowGraph | null | undefined, b: WorkflowGraph | null | undefined): boolean {
  if (!a || !b) return false;
  return graphFingerprint(a) === graphFingerprint(b);
}

export type GraphDiff = {
  addedNodes: string[];
  removedNodes: string[];
  changedNodes: string[];
  addedEdges: string[];
  removedEdges: string[];
  /** 是否完全没有差异 */
  identical: boolean;
};

function edgeKey(source: string, target: string): string {
  return `${source} → ${target}`;
}

/** 对比两个版本的图，产出节点/边级别的差异摘要（from = 旧版，to = 新版）。 */
export function diffGraphs(from: WorkflowGraph, to: WorkflowGraph): GraphDiff {
  const fromNodes = new Map((from.nodes ?? []).map((n) => [n.id, n]));
  const toNodes = new Map((to.nodes ?? []).map((n) => [n.id, n]));

  const addedNodes: string[] = [];
  const removedNodes: string[] = [];
  const changedNodes: string[] = [];

  for (const [id, node] of toNodes) {
    const previous = fromNodes.get(id);
    if (!previous) addedNodes.push(node.label || id);
    else if (nodeFingerprint(previous) !== nodeFingerprint(node)) changedNodes.push(node.label || id);
  }
  for (const [id, node] of fromNodes) {
    if (!toNodes.has(id)) removedNodes.push(node.label || id);
  }

  const labelOf = (id: string) => toNodes.get(id)?.label || fromNodes.get(id)?.label || id;
  const fromEdges = new Set((from.edges ?? []).map((e) => edgeKey(e.source, e.target)));
  const toEdges = new Set((to.edges ?? []).map((e) => edgeKey(e.source, e.target)));

  const addedEdges: string[] = [];
  const removedEdges: string[] = [];
  for (const edge of toEdges) {
    if (!fromEdges.has(edge)) {
      const [source, target] = edge.split(" → ");
      addedEdges.push(edgeKey(labelOf(source), labelOf(target)));
    }
  }
  for (const edge of fromEdges) {
    if (!toEdges.has(edge)) {
      const [source, target] = edge.split(" → ");
      removedEdges.push(edgeKey(labelOf(source), labelOf(target)));
    }
  }

  return {
    addedNodes,
    removedNodes,
    changedNodes,
    addedEdges,
    removedEdges,
    identical:
      addedNodes.length === 0 &&
      removedNodes.length === 0 &&
      changedNodes.length === 0 &&
      addedEdges.length === 0 &&
      removedEdges.length === 0,
  };
}
