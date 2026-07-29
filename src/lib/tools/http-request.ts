import { z } from "zod";
import type { ToolDefinition } from "./types";

const BLOCKED_PATTERNS = [/^https?:\/\/(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|localhost)/];
const MAX_RESPONSE_SIZE = 10 * 1024;

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
    const url = params.url as string;
    if (BLOCKED_PATTERNS.some((p) => p.test(url))) {
      return JSON.stringify({ error: "Access to internal networks is not allowed" });
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, {
        method: (params.method as string) ?? "GET",
        headers: (params.headers as Record<string, string>) ?? {},
        body: params.body as string | undefined,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const text = await res.text();
      return JSON.stringify({
        status: res.status,
        body: text.slice(0, MAX_RESPONSE_SIZE),
      });
    } catch (err) {
      return JSON.stringify({ error: err instanceof Error ? err.message : "Request failed" });
    }
  },
};
