"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Search, Bot, Plus, ArrowUpDown } from "lucide-react";
import { useAgents } from "@/hooks/use-agents";
import { AgentCard } from "@/components/agents/agent-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortKey = "recent" | "name" | "usage";

function AgentCardSkeleton() {
  return (
    <div className="rounded-lg border p-6 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-5 w-32" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export default function AgentsPage() {
  const { data: agents, isLoading, error } = useAgents();
  const t = useTranslations("agents");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // 汇总全部标签作为筛选项（模板内部标记 template:* 不展示）
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const agent of agents ?? []) {
      for (const tag of agent.tags) {
        if (!tag.startsWith("template:")) tags.add(tag);
      }
    }
    return [...tags].sort();
  }, [agents]);

  const filtered = useMemo(() => {
    if (!agents) return agents;
    const q = search.trim().toLowerCase();

    let list = agents;
    if (q) {
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q) ||
          a.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    if (activeTag) {
      list = list.filter((a) => a.tags.includes(activeTag));
    }

    const sorted = [...list];
    if (sortKey === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortKey === "usage") {
      sorted.sort((a, b) => (b.conversationCount ?? 0) - (a.conversationCount ?? 0));
    } else {
      // recent：有活跃时间的优先，其余按创建时间倒序
      sorted.sort((a, b) => {
        const at = a.lastActiveAt ?? a.createdAt;
        const bt = b.lastActiveAt ?? b.createdAt;
        return new Date(bt).getTime() - new Date(at).getTime();
      });
    }
    return sorted;
  }, [agents, search, activeTag, sortKey]);

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 lg:px-10 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Button asChild>
          <Link href="/agents/new">
            <Plus className="h-4 w-4" />
            {t("new")}
          </Link>
        </Button>
      </div>

      {agents && agents.length > 0 && (
        <div className="space-y-3 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="pl-9"
              />
            </div>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="w-[160px]">
                <ArrowUpDown className="h-3.5 w-3.5 mr-1 shrink-0 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">{t("sortRecent")}</SelectItem>
                <SelectItem value="usage">{t("sortUsage")}</SelectItem>
                <SelectItem value="name">{t("sortName")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant={activeTag === null ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setActiveTag(null)}
              >
                {t("tagAll")}
              </Badge>
              {allTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={activeTag === tag ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-destructive">{t("loadError", { message: error.message })}</p>}

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <AgentCardSkeleton key={i} />
          ))}
        </div>
      )}

      {agents && agents.length === 0 && (
        <EmptyState
          icon={Bot}
          title={t("emptyTitle")}
          description={t("empty")}
          action={
            <Button asChild>
              <Link href="/agents/new">
                <Plus className="h-4 w-4" />
                {t("new")}
              </Link>
            </Button>
          }
        />
      )}

      {filtered && filtered.length === 0 && agents && agents.length > 0 && (
        <p className="text-muted-foreground text-sm text-center py-16">{t("noSearchResults")}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered?.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}
