import type { DelayNodeConfig, ExecutionContext } from "@/types/workflow";

export async function executeDelayNode(
  config: DelayNodeConfig,
  vars: { context: ExecutionContext },
): Promise<string> {
  const ms = Math.max(0, Math.min(config.durationMs, 30000));
  await new Promise((resolve) => setTimeout(resolve, ms));
  return vars.context[config.inputNodeId] ?? "";
}
