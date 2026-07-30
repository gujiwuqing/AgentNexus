"use client";

import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentAvatar } from "@/components/agents/agent-avatar";

type AgentRankItem = {
  agentId: string;
  agentName: string;
  avatar: string;
  totalTokens: number;
  messageCount: number;
  conversationCount: number;
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function AgentRankingList({
  data,
  onSelectAgent,
}: {
  data: AgentRankItem[];
  onSelectAgent?: (agent: AgentRankItem) => void;
}) {
  const t = useTranslations("dashboard");

  if (data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base">{t("agentRanking")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("noData")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">{t("agentRanking")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {data.map((agent, i) => (
            <button
              key={agent.agentId}
              type="button"
              className="group w-full flex items-center gap-3 rounded-md px-2 py-1.5 -mx-2 text-left cursor-pointer hover:bg-muted/60 transition-colors"
              onClick={() => onSelectAgent?.(agent)}
            >
              <span className="text-sm font-medium text-muted-foreground w-5 text-right">{i + 1}</span>
              <AgentAvatar avatar={agent.avatar} className="h-8 w-8 text-lg" iconClassName="h-4 w-4" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{agent.agentName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatTokens(agent.totalTokens)} tokens · {agent.messageCount} {t("messages")}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
