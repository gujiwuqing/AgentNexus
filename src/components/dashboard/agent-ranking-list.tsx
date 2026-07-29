"use client";

import { useTranslations } from "next-intl";
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

export function AgentRankingList({ data }: { data: AgentRankItem[] }) {
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
        <div className="space-y-3">
          {data.map((agent, i) => (
            <div key={agent.agentId} className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground w-5 text-right">{i + 1}</span>
              <AgentAvatar avatar={agent.avatar} className="h-8 w-8 text-lg" iconClassName="h-4 w-4" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{agent.agentName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatTokens(agent.totalTokens)} tokens · {agent.messageCount} {t("messages")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
