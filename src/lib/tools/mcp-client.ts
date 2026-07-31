import { tool, type CoreTool } from "ai";
import { z } from "zod";

type McpConfig = {
  serverUrl: string;
  toolName: string;
  authToken?: string;
};

export function buildMcpTool(name: string, description: string, config: McpConfig): CoreTool {
  return tool({
    description,
    parameters: z.object({
      input: z.string().describe("Input for the MCP tool"),
    }),
    execute: async (params) => {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (config.authToken) {
          headers["Authorization"] = `Bearer ${config.authToken}`;
        }

        const res = await fetch(`${config.serverUrl}/tools/call`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: config.toolName,
            arguments: { input: params.input },
          }),
        });

        if (!res.ok) {
          return JSON.stringify({ error: `MCP call failed: ${res.status}` });
        }

        const data = await res.json();
        // MCP 协议返回 { content: [{ type: "text", text: "..." }] }
        if (data.content && Array.isArray(data.content)) {
          return data.content.map((c: { text?: string }) => c.text ?? "").join("\n");
        }
        return JSON.stringify(data);
      } catch (err) {
        return JSON.stringify({ error: err instanceof Error ? err.message : "MCP call failed" });
      }
    },
  });
}
