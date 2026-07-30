import { tool, type CoreTool } from "ai";
import { toolMap } from "./registry";
import { executeWebSearch } from "./web-search";
import type { ToolDefinition } from "./types";
import { resolveCustomTools } from "./custom-resolve";

export function resolveAgentTools(
  enabledTools: string[],
  searchConfig?: { provider: string; apiKey: string } | null,
  customToolRows?: Array<{
    name: string;
    description: string;
    type: "http" | "prompt";
    httpConfig: unknown;
    promptConfig: unknown;
    parameters: Array<{
      name: string;
      type: "string" | "number" | "boolean";
      description: string;
      required: boolean;
      default?: string | number | boolean;
    }>;
  }>,
  teamToolDefs?: ToolDefinition[],
): Record<string, CoreTool> | undefined {
  if (enabledTools.length === 0 && (!customToolRows || customToolRows.length === 0) && (!teamToolDefs || teamToolDefs.length === 0)) return undefined;

  const tools: Record<string, CoreTool> = {};

  for (const name of enabledTools) {
    const def = toolMap.get(name);
    if (!def) continue;

    if (name === "web_search" && searchConfig?.apiKey) {
      tools[name] = tool({
        description: def.description,
        parameters: def.parameters,
        execute: async (params) =>
          executeWebSearch(
            params.query as string,
            (params.maxResults as number) ?? 5,
            searchConfig.provider,
            searchConfig.apiKey,
          ),
      });
    } else {
      tools[name] = tool({
        description: def.description,
        parameters: def.parameters,
        execute: def.execute,
      });
    }
  }

  // 自定义工具
  if (customToolRows && customToolRows.length > 0) {
    Object.assign(tools, resolveCustomTools(customToolRows as Parameters<typeof resolveCustomTools>[0]));
  }

  for (const def of teamToolDefs ?? []) {
    tools[def.name] = tool({
      description: def.description,
      parameters: def.parameters,
      execute: def.execute,
    });
  }

  return Object.keys(tools).length > 0 ? tools : undefined;
}
