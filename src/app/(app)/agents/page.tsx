"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAgents } from "@/hooks/use-agents";
import { AgentCard } from "@/components/agents/agent-card";
import { Button } from "@/components/ui/button";

export default function AgentsPage() {
  const { data: agents, isLoading, error } = useAgents();
  const t = useTranslations("agents");
  const tc = useTranslations("common");

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 lg:px-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Button asChild>
          <Link href="/agents/new">{t("new")}</Link>
        </Button>
      </div>

      {isLoading && <p>{tc("loading")}</p>}
      {error && <p className="text-destructive">{t("loadError", { message: error.message })}</p>}
      {agents && agents.length === 0 && (
        <p className="text-muted-foreground">{t("empty")}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents?.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}
