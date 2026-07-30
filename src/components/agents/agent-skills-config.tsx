"use client";

import { useTranslations } from "next-intl";
import { useSkills, useAgentSkills, useSetAgentSkills } from "@/hooks/use-skills";

export function AgentSkillsConfig({ agentId }: { agentId: string }) {
  const t = useTranslations("skills");
  const { data: allSkills } = useSkills();
  const { data: linked } = useAgentSkills(agentId);
  const setLinked = useSetAgentSkills(agentId);

  const selectedIds = (linked ?? []).map((s) => s.id);

  function toggle(skillId: string) {
    const next = selectedIds.includes(skillId)
      ? selectedIds.filter((id) => id !== skillId)
      : [...selectedIds, skillId];
    setLinked.mutate(next);
  }

  if (!allSkills || allSkills.length === 0) {
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
        {allSkills.map((skill) => {
          const selected = selectedIds.includes(skill.id);
          return (
            <button
              key={skill.id}
              type="button"
              onClick={() => toggle(skill.id)}
              className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                selected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/40"
              }`}
            >
              <span className="text-lg shrink-0">{skill.icon || "⚡"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{skill.name}</p>
                {skill.description && (
                  <p className="text-xs text-muted-foreground truncate">{skill.description}</p>
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
