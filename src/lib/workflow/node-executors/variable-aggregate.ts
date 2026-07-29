import type { VariableAggregateNodeConfig, ExecutionContext } from "@/types/workflow";

export function executeVariableAggregateNode(
  config: VariableAggregateNodeConfig,
  vars: { context: ExecutionContext },
): string {
  const merged = Object.fromEntries(
    config.sourceNodeIds.map((id) => [id, vars.context[id] ?? ""]),
  );
  return JSON.stringify(merged);
}
