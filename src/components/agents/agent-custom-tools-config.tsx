"use client";

import { useTranslations } from "next-intl";
import { useCustomTools, useAgentCustomTools, useSetAgentCustomTools } from "@/hooks/use-custom-tools";

export function AgentCustomToolsConfig({ agentId }: { agentId: string }) {
  const t = useTranslations("customTools");
  const { data: allTools } = useCustomTools();
  const { data: linked } = useAgentCustomTools(agentId);
  const setLinked = useSetAgentCustomTools(agentId);

  const selectedIds = (linked ?? []).map((tool) => tool.id);

  function toggle(toolId: string) {
    const next = selectedIds.includes(toolId)
      ? selectedIds.filter((id) => id !== toolId)
      : [...selectedIds, toolId];
    setLinked.mutate(next);
  }

  if (!allTools || allTools.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium">{t("title")}</h3>
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">{t("title")}</h3>
      <div className="space-y-2">
        {allTools.map((tool) => {
          const selected = selectedIds.includes(tool.id);
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => toggle(tool.id)}
              className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                selected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/40"
              }`}
            >
              <span className="text-lg shrink-0">🔧</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{tool.displayName}</p>
                {tool.description && (
                  <p className="text-xs text-muted-foreground truncate">{tool.description}</p>
                )}
              </div>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                {tool.type === "http" ? "HTTP" : "Prompt"}
              </span>
              <div className={`h-4 w-4 rounded-full border-2 transition-colors ${
                selected ? "bg-primary border-primary" : "border-muted-foreground/30"
              }`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
