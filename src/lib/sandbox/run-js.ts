import vm from "vm";

export type SandboxResult = { output: string; error?: string };

export async function runSandboxedCode(
  code: string,
  extraGlobals: Record<string, unknown> = {},
  timeoutMs = 5000,
  maxOutputBytes = 5 * 1024,
): Promise<SandboxResult> {
  const logs: string[] = [];
  const sandbox: Record<string, unknown> = {
    console: {
      log: (...args: unknown[]) => logs.push(args.map(String).join(" ")),
      error: (...args: unknown[]) => logs.push("[error] " + args.map(String).join(" ")),
      warn: (...args: unknown[]) => logs.push("[warn] " + args.map(String).join(" ")),
    },
    JSON,
    Math,
    Date,
    Array,
    Object,
    String,
    Number,
    Boolean,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    ...extraGlobals,
  };
  try {
    const context = vm.createContext(sandbox);
    const result = vm.runInContext(code, context, { timeout: timeoutMs });
    const output = logs.join("\n") + (result !== undefined && logs.length === 0 ? String(result) : "");
    return { output: output.slice(0, maxOutputBytes) };
  } catch (err) {
    return {
      output: logs.join("\n").slice(0, maxOutputBytes),
      error: err instanceof Error ? err.message : "Execution failed",
    };
  }
}
