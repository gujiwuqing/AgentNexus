"use client";

import { useTranslations } from "next-intl";
import { BookOpen } from "lucide-react";
import { useKnowledgeBases, useAgentKnowledgeBases, useSetAgentKnowledgeBases } from "@/hooks/use-knowledge";

export function AgentKnowledgeConfig({ agentId }: { agentId: string }) {
  const t = useTranslations("agentsExt.knowledge");
  const { data: allKnowledgeBases } = useKnowledgeBases();
  const { data: linked } = useAgentKnowledgeBases(agentId);
  const setLinked = useSetAgentKnowledgeBases(agentId);

  const selectedIds = (linked ?? []).map((kb) => kb.id);

  function toggle(kbId: string) {
    const next = selectedIds.includes(kbId)
      ? selectedIds.filter((id) => id !== kbId)
      : [...selectedIds, kbId];
    setLinked.mutate(next);
  }

  if (!allKnowledgeBases || allKnowledgeBases.length === 0) {
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
        {allKnowledgeBases.map((kb) => {
          const selected = selectedIds.includes(kb.id);
          return (
            <button
              key={kb.id}
              type="button"
              onClick={() => toggle(kb.id)}
              className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                selected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/40"
              }`}
            >
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{kb.name}</p>
                {kb.description && (
                  <p className="text-xs text-muted-foreground truncate">{kb.description}</p>
                )}
              </div>
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
