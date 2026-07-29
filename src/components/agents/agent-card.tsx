"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { MessageSquare, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AgentAvatar } from "@/components/agents/agent-avatar";
import { formatRelativeTime } from "@/lib/format-relative-time";
import type { Agent } from "@/types/agent";

export function AgentCard({ agent }: { agent: Agent }) {
  const t = useTranslations("agentsExt.card");
  const locale = useLocale();

  return (
    <Link href={`/agents/${agent.id}`}>
      <Card className="hover:border-primary hover:shadow-md transition-all cursor-pointer h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AgentAvatar avatar={agent.avatar} className="h-9 w-9 text-2xl" iconClassName="h-4.5 w-4.5" />
            {agent.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {agent.description || t("noDescription")}
          </p>
          <div className="flex gap-1 mt-2 flex-wrap">
            {agent.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-3 pt-3 border-t text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {t("conversationCount", { count: agent.conversationCount ?? 0 })}
            </span>
            {agent.lastActiveAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(agent.lastActiveAt, locale)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
