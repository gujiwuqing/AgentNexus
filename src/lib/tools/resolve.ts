import { tool, type CoreTool } from "ai";
import { toolMap } from "./registry";
import { executeWebSearch } from "./web-search";
import type { ToolDefinition } from "./types";
import { resolveCustomTools } from "./custom-resolve";
import { buildLoadSkillTool, buildReadSkillResourceTool, type SkillForTools } from "@/lib/skills/skill-tools";
import { wrapWithSkillGuard } from "./skill-guard";

export function resolveAgentTools(
  enabledTools: string[],
  searchConfig?: { provider: string; apiKey: string } | null,
  customToolRows?: Array<{
    name: string;
    description: string;
    type: "http" | "prompt" | "mcp";
    httpConfig: unknown;
    promptConfig: unknown;
    mcpConfig: unknown;
    parameters: Array<{
      name: string;
      type: "string" | "number" | "boolean";
      description: string;
      required: boolean;
      default?: string | number | boolean;
    }>;
  }>,
  teamToolDefs?: ToolDefinition[],
  skillRows?: SkillForTools[],
): Record<string, CoreTool> | undefined {
  const hasSkills = Boolean(skillRows && skillRows.length > 0);
  if (
    enabledTools.length === 0 &&
    (!customToolRows || customToolRows.length === 0) &&
    (!teamToolDefs || teamToolDefs.length === 0) &&
    !hasSkills
  ) {
    return undefined;
  }

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

  // Skill 元工具（渐进式披露：load_skill 只暴露 name+description，内容按需加载）
  if (hasSkills && skillRows) {
    const loadSkillTool = buildLoadSkillTool(skillRows);
    if (loadSkillTool) tools["load_skill"] = loadSkillTool;
    const readResourceTool = buildReadSkillResourceTool(skillRows);
    if (readResourceTool) tools["read_skill_resource"] = readResourceTool;
  }

  if (Object.keys(tools).length === 0) return undefined;

  // allowedTools 运行时拦截：统一在全部工具组装完成后包裹
  if (hasSkills && skillRows) {
    const allowedToolsByName = Object.fromEntries(skillRows.map((s) => [s.name, s.allowedTools]));
    return wrapWithSkillGuard(tools, allowedToolsByName);
  }

  return tools;
}
