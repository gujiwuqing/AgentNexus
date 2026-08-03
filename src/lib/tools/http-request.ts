import { z } from "zod";
import type { ToolDefinition } from "./types";
import { safeFetch, DEFAULT_MAX_RESPONSE_BYTES } from "./safe-fetch";

export const httpRequestTool: ToolDefinition = {
  name: "http_request",
  displayName: "HTTP Request",
  description: "Make an HTTP request to a URL. Returns status code, headers, and response body.",
  parameters: z.object({
    url: z.string().url().describe("Target URL"),
    method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("GET").describe("HTTP method"),
    headers: z.record(z.string()).optional().describe("Request headers"),
    body: z.string().optional().describe("Request body (for POST/PUT)"),
  }),
  execute: async (params) => {
    try {
      const res = await safeFetch(params.url as string, {
        method: (params.method as string) ?? "GET",
        headers: params.headers as Record<string, string> | undefined,
        body: params.body as string | undefined,
        maxResponseBytes: DEFAULT_MAX_RESPONSE_BYTES,
      });
      return JSON.stringify({
        status: res.status,
        body: res.body,
        ...(res.truncated ? { truncated: true } : {}),
      });
    } catch (err) {
      return JSON.stringify({ error: err instanceof Error ? err.message : "Request failed" });
    }
  },
};
