import type {
  WorkflowGraph,
  WorkflowNode,
  AgentNodeConfig,
  ConditionNodeConfig,
  TransformNodeConfig,
  HttpRequestNodeConfig,
  CodeExecuteNodeConfig,
  DelayNodeConfig,
  VariableAggregateNodeConfig,
} from "@/types/workflow";

/** 校验问题的机器可读标识，UI 侧据此取 i18n 文案。 */
export type GraphIssueCode =
  | "agent.missingAgent"
  | "agent.missingPrompt"
  | "condition.missingExpression"
  | "condition.missingInput"
  | "condition.missingBranch"
  | "condition.unknownBranch"
  | "transform.missingOperation"
  | "transform.missingTemplate"
  | "http.missingUrl"
  | "http.invalidUrl"
  | "code.missingCode"
  | "delay.invalidDuration"
  | "aggregate.missingSources"
  | "graph.emptyGraph"
  | "graph.unknownEdge";

export type GraphIssue = {
  /** 关联节点 id；图级问题为 null */
  nodeId: string | null;
  nodeLabel: string | null;
  code: GraphIssueCode;
};

const MAX_DELAY_MS = 30_000;

function validateNode(node: WorkflowNode, nodeIds: Set<string>): GraphIssueCode[] {
  const codes: GraphIssueCode[] = [];
  const config = (node.config ?? {}) as Record<string, unknown>;

  switch (node.type) {
    case "agent": {
      const c = config as unknown as AgentNodeConfig;
      if (!c.agentId) codes.push("agent.missingAgent");
      if (!c.promptTemplate?.trim()) codes.push("agent.missingPrompt");
      break;
    }
    case "condition": {
      const c = config as unknown as ConditionNodeConfig;
      if (!c.expression?.trim()) codes.push("condition.missingExpression");
      if (!c.inputNodeId) codes.push("condition.missingInput");
      if (!c.trueBranch || !c.falseBranch) codes.push("condition.missingBranch");
      for (const branch of [c.trueBranch, c.falseBranch]) {
        if (branch && !nodeIds.has(branch)) {
          codes.push("condition.unknownBranch");
          break;
        }
      }
      break;
    }
    case "transform": {
      const c = config as unknown as TransformNodeConfig;
      if (!c.operation) codes.push("transform.missingOperation");
      if (c.operation === "template" && !c.params?.template?.trim()) {
        codes.push("transform.missingTemplate");
      }
      break;
    }
    case "http_request": {
      const c = config as unknown as HttpRequestNodeConfig;
      if (!c.url?.trim()) {
        codes.push("http.missingUrl");
      } else if (!/^https?:\/\//i.test(c.url) && !c.url.includes("{{")) {
        // 含模板变量的 URL 运行时才能确定，跳过静态校验
        codes.push("http.invalidUrl");
      }
      break;
    }
    case "code_execute": {
      const c = config as unknown as CodeExecuteNodeConfig;
      if (!c.code?.trim()) codes.push("code.missingCode");
      break;
    }
    case "delay": {
      const c = config as unknown as DelayNodeConfig;
      if (typeof c.durationMs !== "number" || c.durationMs < 0 || c.durationMs > MAX_DELAY_MS) {
        codes.push("delay.invalidDuration");
      }
      break;
    }
    case "variable_aggregate": {
      const c = config as unknown as VariableAggregateNodeConfig;
      if (!Array.isArray(c.sourceNodeIds) || c.sourceNodeIds.length === 0) {
        codes.push("aggregate.missingSources");
      }
      break;
    }
    case "human_input":
      // prompt 可为空，运行时只是提示语缺失，不阻断执行
      break;
  }

  return codes;
}

/**
 * 校验工作流图是否可运行。设计取舍：保存不拦截（允许存草稿），
 * 运行前才严格校验，避免用户中途保存被打断。
 */
export function validateGraph(graph: WorkflowGraph): GraphIssue[] {
  const issues: GraphIssue[] = [];
  const nodes = graph.nodes ?? [];

  if (nodes.length === 0) {
    return [{ nodeId: null, nodeLabel: null, code: "graph.emptyGraph" }];
  }

  const nodeIds = new Set(nodes.map((n) => n.id));

  for (const node of nodes) {
    for (const code of validateNode(node, nodeIds)) {
      issues.push({ nodeId: node.id, nodeLabel: node.label || node.id, code });
    }
  }

  for (const edge of graph.edges ?? []) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      issues.push({ nodeId: null, nodeLabel: null, code: "graph.unknownEdge" });
      break;
    }
  }

  return issues;
}

/** 汇总每个节点的问题数，供编辑器在节点上打角标。 */
export function issueCountByNode(issues: GraphIssue[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const issue of issues) {
    if (!issue.nodeId) continue;
    counts[issue.nodeId] = (counts[issue.nodeId] ?? 0) + 1;
  }
  return counts;
}
