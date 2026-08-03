import { tool, type CoreTool } from "ai";
import { z } from "zod";
import type { ToolParameter } from "@/types/custom-tool";
import { buildMcpTool } from "./mcp-client";
import { safeFetch } from "./safe-fetch";
import { interpolate, interpolateRecord, interpolateBody } from "./template-interpolate";

type CustomToolRow = {
  name: string;
  description: string;
  type: "http" | "prompt" | "mcp";
  httpConfig: {
    url: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    headers?: Record<string, string>;
    bodyTemplate?: string;
    queryTemplate?: Record<string, string>;
  } | null;
  promptConfig: {
    systemInstruction: string;
    outputFormat?: string;
  } | null;
  mcpConfig: {
    serverUrl: string;
    toolName: string;
    authToken?: string;
  } | null;
  parameters: ToolParameter[];
};

function buildZodSchema(parameters: ToolParameter[]): z.ZodSchema {
  if (parameters.length === 0) return z.object({});
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const p of parameters) {
    let field: z.ZodTypeAny;
    if (p.type === "number") field = z.number().describe(p.description);
    else if (p.type === "boolean") field = z.boolean().describe(p.description);
    else field = z.string().describe(p.description);
    if (p.default !== undefined) field = field.default(p.default);
    if (!p.required) field = field.optional();
    shape[p.name] = field;
  }
  return z.object(shape);
}

export function resolveCustomTools(customTools: CustomToolRow[]): Record<string, CoreTool> {
  const result: Record<string, CoreTool> = {};

  for (const t of customTools) {
    const schema = buildZodSchema(t.parameters);

    if (t.type === "http" && t.httpConfig) {
      const config = t.httpConfig;
      result[t.name] = tool({
        description: t.description,
        parameters: schema,
        execute: async (params) => {
          try {
            const url = new URL(interpolate(config.url, params));
            if (config.queryTemplate) {
              const query = interpolateRecord(config.queryTemplate, params);
              for (const [k, v] of Object.entries(query)) {
                if (v) url.searchParams.set(k, v);
              }
            }
            const headers: Record<string, string> = config.headers
              ? interpolateRecord(config.headers, params)
              : {};
            let body: string | undefined;
            if (config.bodyTemplate && config.method !== "GET") {
              body = interpolateBody(config.bodyTemplate, params);
              if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
            }
            // 走 safeFetch：内置 http_request 有的 SSRF 拦截与超时，自定义工具同样必须有
            const res = await safeFetch(url.toString(), {
              method: config.method,
              headers,
              body,
            });
            return res.body;
          } catch (err) {
            return JSON.stringify({ error: err instanceof Error ? err.message : "HTTP request failed" });
          }
        },
      });
    } else if (t.type === "prompt" && t.promptConfig) {
      const config = t.promptConfig;
      result[t.name] = tool({
        description: t.description,
        parameters: schema,
        execute: async (params) => {
          const format = config.outputFormat ? `\n输出格式：${config.outputFormat}` : "";
          return `请按以下规则处理：${config.systemInstruction}${format}\n输入：${JSON.stringify(params)}`;
        },
      });
    } else if (t.type === "mcp" && t.mcpConfig) {
      result[t.name] = buildMcpTool(t.name, t.description, t.mcpConfig);
    }
  }

  return result;
}
