"use client";

import { useTranslations } from "next-intl";
import { AgentAvatar } from "@/components/agents/agent-avatar";
import type { Agent } from "@/types/agent";

/**
 * 卡片上只展示指令主干：剥掉 {{占位符}} 及其前面的引导冒号，
 * 完整文案（含占位符）在点击时才填入输入框。
 */
function toLabel(prompt: string) {
  return prompt.replace(/\{\{[^}]*\}\}/g, "").replace(/[\s：:，,]+$/u, "").trim() || prompt;
}

export function ChatWelcome({
  agent,
  onSelectPrompt,
}: {
  agent?: Agent;
  onSelectPrompt: (prompt: string) => void;
}) {
  const t = useTranslations("chatExt.welcome");
  const defaults = [t("suggestion1"), t("suggestion2"), t("suggestion3"), t("suggestion4")];
  // Agent 配置了开场问题则优先展示，否则回退到通用建议
  const suggestions =
    agent?.suggestedPrompts && agent.suggestedPrompts.length > 0 ? agent.suggestedPrompts : defaults;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center overflow-y-auto py-10">
      <AgentAvatar avatar={agent?.avatar} className="h-16 w-16 text-4xl mb-4" iconClassName="h-8 w-8" />
      <h2 className="text-lg font-semibold">{agent?.name}</h2>
      {agent?.description ? (
        <p className="text-sm text-muted-foreground mt-1 max-w-md">{agent.description}</p>
      ) : (
        <p className="text-sm text-muted-foreground mt-1 max-w-md">{t("subtitle")}</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 w-full max-w-lg">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onSelectPrompt(s)}
            title={toLabel(s)}
            className="text-left text-sm border rounded-lg px-3 py-2.5 hover:border-primary hover:bg-accent transition-colors line-clamp-2"
          >
            {toLabel(s)}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3">{t("suggestionHint")}</p>
    </div>
  );
}
