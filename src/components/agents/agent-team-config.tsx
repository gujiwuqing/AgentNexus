"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useAgents } from "@/hooks/use-agents";
import { useAgentTeamMembers, useSetAgentTeamMembers, type TeamMemberDisplay } from "@/hooks/use-agent-team";

export function AgentTeamConfig({ agentId }: { agentId: string }) {
  const t = useTranslations("agentsExt.team");
  const { data: allAgents } = useAgents();
  const { data: members } = useAgentTeamMembers(agentId);
  const setMembers = useSetAgentTeamMembers(agentId);
  const [draftRoles, setDraftRoles] = useState<Record<string, string>>({});

  const candidates = (allAgents ?? []).filter((a) => a.id !== agentId);
  const selected: TeamMemberDisplay[] = members ?? [];

  function toSubmission(list: TeamMemberDisplay[]) {
    return list.map((m) => ({ memberAgentId: m.memberAgentId, roleDescription: m.roleDescription }));
  }

  function toggle(memberAgentId: string) {
    const exists = selected.some((m) => m.memberAgentId === memberAgentId);
    const next = exists
      ? selected.filter((m) => m.memberAgentId !== memberAgentId)
      : [...selected, { memberAgentId, memberAgentName: "", memberAgentAvatar: "", roleDescription: "" }];
    setMembers.mutate(toSubmission(next));
  }

  function commitRoleDescription(memberAgentId: string) {
    const value = draftRoles[memberAgentId];
    if (value === undefined) return;
    const next = selected.map((m) =>
      m.memberAgentId === memberAgentId ? { ...m, roleDescription: value } : m
    );
    setMembers.mutate(toSubmission(next));
  }

  if (candidates.length === 0) {
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
        {candidates.map((candidate) => {
          const membership = selected.find((m) => m.memberAgentId === candidate.id);
          const isSelected = Boolean(membership);
          const roleValue = draftRoles[candidate.id] ?? membership?.roleDescription ?? "";

          return (
            <div
              key={candidate.id}
              className={`rounded-lg border p-3 transition-colors ${
                isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40"
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(candidate.id)}
                className="w-full flex items-center gap-3 text-left cursor-pointer"
              >
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{candidate.name}</p>
                  {candidate.description && (
                    <p className="text-xs text-muted-foreground truncate">{candidate.description}</p>
                  )}
                </div>
                <div className={`h-4 w-4 rounded-full border-2 transition-colors ${
                  isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                }`} />
              </button>
              {isSelected && (
                <div className="mt-2 pl-7">
                  <Textarea
                    rows={2}
                    className="text-xs"
                    value={roleValue}
                    placeholder={candidate.description || t("roleDescriptionPlaceholder")}
                    onChange={(e) => setDraftRoles((prev) => ({ ...prev, [candidate.id]: e.target.value }))}
                    onBlur={() => commitRoleDescription(candidate.id)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
