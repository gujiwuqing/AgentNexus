"use client";

import { useTranslations } from "next-intl";
import { BookOpen } from "lucide-react";
import { useKnowledgeBases } from "@/hooks/use-knowledge";

export function AgentKnowledgeConfig({
  selectedIds,
  onChange,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const t = useTranslations("agentsExt.knowledge");
  const { data: knowledgeBases } = useKnowledgeBases();

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((k) => k !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  if (!knowledgeBases || knowledgeBases.length === 0) {
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
        {knowledgeBases.map((kb) => {
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
