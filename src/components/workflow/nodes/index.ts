import { AgentNode } from "./agent-node";
import { ConditionNode } from "./condition-node";
import { TransformNode } from "./transform-node";
import { HumanInputNode } from "./human-input-node";
import { HttpRequestNode } from "./http-request-node";
import { CodeExecuteNode } from "./code-execute-node";
import { DelayNode } from "./delay-node";
import { VariableAggregateNode } from "./variable-aggregate-node";

export const nodeTypes = {
  agent: AgentNode,
  condition: ConditionNode,
  transform: TransformNode,
  human_input: HumanInputNode,
  http_request: HttpRequestNode,
  code_execute: CodeExecuteNode,
  delay: DelayNode,
  variable_aggregate: VariableAggregateNode,
};
