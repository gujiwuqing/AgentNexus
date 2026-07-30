import { tool, type CoreTool } from "ai";
import { z } from "zod";
import type { ToolParameter } from "@/types/custom-tool";

type CustomToolRow = {
  name: string;
  description: string;
  type: "http" | "prompt";
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

function interpolate(template: string, params: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = params[key];
    return val !== undefined ? String(val) : "";
  });
}

function interpolateRecord(template: Record<string, string>, params: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(template)) {
    result[k] = interpolate(v, params);
  }
  return result;
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
            const fetchOpts: RequestInit = { method: config.method, headers };
            if (config.bodyTemplate && config.method !== "GET") {
              fetchOpts.body = interpolate(config.bodyTemplate, params);
              if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
            }
            const res = await fetch(url.toString(), fetchOpts);
            const text = await res.text();
            return text.slice(0, 10000);
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
    }
  }

  return result;
}
