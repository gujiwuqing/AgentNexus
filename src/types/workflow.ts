export type AgentNodeConfig = {
  agentId: string;
  promptTemplate: string;
};

export type ConditionNodeConfig = {
  expression: string;
  inputNodeId: string;
  trueBranch: string;
  falseBranch: string;
};

export type TransformNodeConfig = {
  operation: "substring" | "replace" | "jsonExtract" | "template";
  params: Record<string, string>;
  inputTemplate: string;
};

export type HumanInputNodeConfig = {
  prompt: string;
};

export type HttpRequestNodeConfig = {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  bodyTemplate?: string;
};

export type CodeExecuteNodeConfig = {
  code: string;
};

export type DelayNodeConfig = {
  durationMs: number;
  inputNodeId: string;
};

export type VariableAggregateNodeConfig = {
  sourceNodeIds: string[];
};

export type NodeConfig =
  | AgentNodeConfig
  | ConditionNodeConfig
  | TransformNodeConfig
  | HumanInputNodeConfig
  | HttpRequestNodeConfig
  | CodeExecuteNodeConfig
  | DelayNodeConfig
  | VariableAggregateNodeConfig;

export type WorkflowNodeType = "agent" | "condition" | "transform" | "human_input" | "http_request" | "code_execute" | "delay" | "variable_aggregate";

export type WorkflowNode = {
  id: string;
  type: WorkflowNodeType;
  label: string;
  config: NodeConfig;
  position?: { x: number; y: number };
};

export type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
};

export type WorkflowGraph = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

export type WorkflowRunStatus = "running" | "waiting_for_input" | "completed" | "failed";
export type StepLogStatus = "running" | "completed" | "failed" | "skipped";

export type ExecutionContext = Record<string, string>;
