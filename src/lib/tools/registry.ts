import type { ToolDefinition } from "./types";
import { currentTimeTool } from "./current-time";
import { httpRequestTool } from "./http-request";
import { webSearchTool } from "./web-search";
import { codeExecuteTool } from "./code-execute";

export const allTools: ToolDefinition[] = [
  currentTimeTool,
  httpRequestTool,
  webSearchTool,
  codeExecuteTool,
];

export const toolMap = new Map(allTools.map((t) => [t.name, t]));

export function getToolByName(name: string): ToolDefinition | undefined {
  return toolMap.get(name);
}

export function getToolDisplayList() {
  return allTools.map((t) => ({
    name: t.name,
    displayName: t.displayName,
    description: t.description,
  }));
}
