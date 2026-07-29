import { z } from "zod";
import type { ToolDefinition } from "./types";
import { runSandboxedCode } from "@/lib/sandbox/run-js";

export const codeExecuteTool: ToolDefinition = {
  name: "code_execute",
  displayName: "Code Execute",
  description: "Execute JavaScript code in a sandboxed environment. Returns stdout output.",
  parameters: z.object({
    code: z.string().describe("JavaScript code to execute"),
  }),
  execute: async (params) => {
    const code = params.code as string;
    const result = await runSandboxedCode(code);
    return JSON.stringify(result);
  },
};
