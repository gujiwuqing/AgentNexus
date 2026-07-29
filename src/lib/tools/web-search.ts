import { z } from "zod";
import type { ToolDefinition } from "./types";

export const webSearchTool: ToolDefinition = {
  name: "web_search",
  displayName: "Web Search",
  description: "Search the web for information. Returns a list of results with titles, URLs, and snippets.",
  parameters: z.object({
    query: z.string().describe("Search query"),
    maxResults: z.number().int().min(1).max(10).default(5).describe("Max results to return"),
  }),
  execute: async () => {
    return JSON.stringify({ error: "Web search requires API key configuration in Settings" });
  },
};

export async function executeWebSearch(
  query: string,
  maxResults: number,
  provider: string,
  apiKey: string,
): Promise<string> {
  if (provider === "tavily") {
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey, query, max_results: maxResults }),
      });
      const data = await res.json();
      const results = (data.results ?? []).map((r: { title: string; url: string; content: string }) => ({
        title: r.title,
        url: r.url,
        snippet: r.content?.slice(0, 200),
      }));
      return JSON.stringify(results);
    } catch (err) {
      return JSON.stringify({ error: err instanceof Error ? err.message : "Search failed" });
    }
  }
  return JSON.stringify({ error: `Unsupported search provider: ${provider}` });
}
