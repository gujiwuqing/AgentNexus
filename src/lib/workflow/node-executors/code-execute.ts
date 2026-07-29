import type { CodeExecuteNodeConfig, ExecutionContext } from "@/types/workflow";
import { runSandboxedCode } from "@/lib/sandbox/run-js";

export async function executeCodeExecuteNode(
  config: CodeExecuteNodeConfig,
  vars: { input: string; context: ExecutionContext },
): Promise<string> {
  const result = await runSandboxedCode(config.code, { input: vars.input, context: vars.context });
  return result.error ? JSON.stringify(result) : result.output;
}
