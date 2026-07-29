import type {
  WorkflowGraph,
  WorkflowNode,
  WorkflowNodeType,
  ExecutionContext,
  AgentNodeConfig,
  ConditionNodeConfig,
  TransformNodeConfig,
  HttpRequestNodeConfig,
  CodeExecuteNodeConfig,
  DelayNodeConfig,
  VariableAggregateNodeConfig,
} from "@/types/workflow";
import { resolveTemplate } from "./template";
import { executeCondition, executeTransform } from "./executors";
import { executeHttpRequestNode } from "./node-executors/http-request";
import { executeCodeExecuteNode } from "./node-executors/code-execute";
import { executeDelayNode } from "./node-executors/delay";
import { executeVariableAggregateNode } from "./node-executors/variable-aggregate";

export type EngineCallbacks = {
  callAgent: (agentId: string, prompt: string) => Promise<string>;
  onStepStart: (nodeId: string, nodeType: string, input: string) => Promise<void>;
  onStepComplete: (nodeId: string, output: string) => Promise<void>;
  onStepFail: (nodeId: string, error: string) => Promise<void>;
  onRunUpdate: (status: string, context: ExecutionContext, currentNodeId?: string, error?: string) => Promise<void>;
};

export type EngineResult = {
  status: "completed" | "failed" | "waiting_for_input";
  context: ExecutionContext;
  currentNodeId?: string;
  error?: string;
};

type NodeExecResult = { output: string; nextNodes: string[] } | { pause: true; nodeId: string };

export async function executeWorkflow(
  graph: WorkflowGraph,
  input: string,
  callbacks: EngineCallbacks,
  options?: {
    resumeFromNodeId?: string;
    resumeInput?: string;
    retryNodeId?: string;
    existingContext?: ExecutionContext;
    maxIterations?: number;
  }
): Promise<EngineResult> {
  const context: ExecutionContext = { ...(options?.existingContext ?? {}) };
  const maxIterations = options?.maxIterations ?? 50;
  const iterationCounts: Record<string, number> = {};

  const vars = () => ({ input, context });

  function getOutgoingTargets(nodeId: string): string[] {
    return graph.edges.filter((e) => e.source === nodeId).map((e) => e.target);
  }

  function getIncomingSources(nodeId: string): string[] {
    return graph.edges.filter((e) => e.target === nodeId).map((e) => e.source);
  }

  function getConditionBranchTargets(): Set<string> {
    const targets = new Set<string>();
    for (const node of graph.nodes) {
      if (node.type === "condition") {
        const c = node.config as ConditionNodeConfig;
        targets.add(c.trueBranch);
        targets.add(c.falseBranch);
      }
    }
    return targets;
  }

  function findStartNodes(): string[] {
    const edgeTargets = new Set(graph.edges.map((e) => e.target));
    const edgeSources = new Set(graph.edges.map((e) => e.source));
    const conditionBranchTargets = getConditionBranchTargets();
    return graph.nodes
      .filter((n) => {
        if (edgeTargets.has(n.id)) return false;
        // Exclude condition branch targets that have no outgoing edges
        // (pure leaf/terminal nodes only reachable via condition branching).
        // Nodes that DO have outgoing edges are flow initiators and should start.
        if (conditionBranchTargets.has(n.id) && !edgeSources.has(n.id)) return false;
        return true;
      })
      .map((n) => n.id);
  }

  function getNode(id: string): WorkflowNode | undefined {
    return graph.nodes.find((n) => n.id === id);
  }

  function allDependenciesMet(nodeId: string): boolean {
    return getIncomingSources(nodeId).every((src) => src in context);
  }

  async function executeNodeByType(node: WorkflowNode): Promise<NodeExecResult> {
    const config = node.config;
    const v = vars();

    switch (node.type as WorkflowNodeType) {
      case "agent": {
        const c = config as AgentNodeConfig;
        const prompt = resolveTemplate(c.promptTemplate, v);
        await callbacks.onStepStart(node.id, node.type, prompt);
        const output = await callbacks.callAgent(c.agentId, prompt);
        await callbacks.onStepComplete(node.id, output);
        return { output, nextNodes: getOutgoingTargets(node.id) };
      }

      case "condition": {
        const c = config as ConditionNodeConfig;
        const checkInput = context[c.inputNodeId] ?? "";
        await callbacks.onStepStart(node.id, node.type, checkInput);
        const result = executeCondition(checkInput, c.expression);
        const output = result ? "true" : "false";
        await callbacks.onStepComplete(node.id, output);
        return { output, nextNodes: [result ? c.trueBranch : c.falseBranch] };
      }

      case "transform": {
        const c = config as TransformNodeConfig;
        const transformInput = resolveTemplate(c.inputTemplate || "", v);
        await callbacks.onStepStart(node.id, node.type, transformInput);
        const output = executeTransform(transformInput, c.operation, c.params);
        const resolvedOutput = resolveTemplate(output, v);
        await callbacks.onStepComplete(node.id, resolvedOutput);
        return { output: resolvedOutput, nextNodes: getOutgoingTargets(node.id) };
      }

      case "human_input": {
        await callbacks.onStepStart(node.id, node.type, "");
        return { pause: true, nodeId: node.id };
      }

      case "http_request": {
        const c = config as HttpRequestNodeConfig;
        await callbacks.onStepStart(node.id, node.type, c.url);
        const output = await executeHttpRequestNode(c, v);
        await callbacks.onStepComplete(node.id, output);
        return { output, nextNodes: getOutgoingTargets(node.id) };
      }

      case "code_execute": {
        const c = config as CodeExecuteNodeConfig;
        await callbacks.onStepStart(node.id, node.type, c.code.slice(0, 200));
        const output = await executeCodeExecuteNode(c, v);
        await callbacks.onStepComplete(node.id, output);
        return { output, nextNodes: getOutgoingTargets(node.id) };
      }

      case "delay": {
        const c = config as DelayNodeConfig;
        await callbacks.onStepStart(node.id, node.type, `${c.durationMs}ms`);
        const output = await executeDelayNode(c, v);
        await callbacks.onStepComplete(node.id, output);
        return { output, nextNodes: getOutgoingTargets(node.id) };
      }

      case "variable_aggregate": {
        const c = config as VariableAggregateNodeConfig;
        await callbacks.onStepStart(node.id, node.type, c.sourceNodeIds.join(","));
        const output = executeVariableAggregateNode(c, v);
        await callbacks.onStepComplete(node.id, output);
        return { output, nextNodes: getOutgoingTargets(node.id) };
      }

      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  async function executeNode(node: WorkflowNode): Promise<NodeExecResult> {
    iterationCounts[node.id] = (iterationCounts[node.id] ?? 0) + 1;
    if (iterationCounts[node.id] > maxIterations) {
      throw new Error(`Max iterations exceeded on node ${node.id}`);
    }

    try {
      return await executeNodeByType(node);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await callbacks.onStepFail(node.id, message);
      throw err;
    }
  }

  async function runNodes(nodeIds: string[]): Promise<EngineResult | null> {
    // For nodes already in context, delete so they can re-execute (loop support)
    for (const id of nodeIds) {
      if (id in context && allDependenciesMet(id)) {
        delete context[id];
      }
    }

    const ready = nodeIds.filter((id) => !(id in context) && allDependenciesMet(id));
    if (ready.length === 0) return null;

    const results = await Promise.all(
      ready.map(async (id) => {
        const node = getNode(id);
        if (!node) throw new Error(`Node ${id} not found`);
        return { id, result: await executeNode(node) };
      })
    );

    const allNextNodes: string[] = [];
    for (const { id, result } of results) {
      if ("pause" in result) {
        await callbacks.onRunUpdate("waiting_for_input", context, result.nodeId);
        return { status: "waiting_for_input" as const, context, currentNodeId: result.nodeId };
      }
      context[id] = result.output;
      allNextNodes.push(...result.nextNodes);
    }

    if (allNextNodes.length > 0) {
      const unique = [...new Set(allNextNodes)];
      const nextResult = await runNodes(unique);
      if (nextResult) return nextResult;
    }

    return null;
  }

  try {
    let startNodes: string[];

    if (options?.retryNodeId) {
      const node = getNode(options.retryNodeId);
      if (!node) throw new Error(`Retry node ${options.retryNodeId} not found`);
      delete context[options.retryNodeId];
      const result = await executeNode(node);
      if ("pause" in result) {
        await callbacks.onRunUpdate("waiting_for_input", context, result.nodeId);
        return { status: "waiting_for_input", context, currentNodeId: result.nodeId };
      }
      context[options.retryNodeId] = result.output;
      startNodes = result.nextNodes;
    } else if (options?.resumeFromNodeId && options?.resumeInput !== undefined) {
      context[options.resumeFromNodeId] = options.resumeInput;
      await callbacks.onStepComplete(options.resumeFromNodeId, options.resumeInput);
      startNodes = getOutgoingTargets(options.resumeFromNodeId);
    } else {
      startNodes = findStartNodes();
    }

    const result = await runNodes(startNodes);
    if (result) return result;

    await callbacks.onRunUpdate("completed", context);
    return { status: "completed", context };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await callbacks.onRunUpdate("failed", context, undefined, error);
    return { status: "failed", context, error };
  }
}
