"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Search, Wrench, Plus, ArrowUpDown } from "lucide-react";
import { useCustomTools } from "@/hooks/use-custom-tools";
import { ToolCard } from "@/components/tools/tool-card";
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

type SortKey = "recent" | "name";

function ToolCardSkeleton() {
  return (
    <div className="rounded-lg border p-6 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-14 ml-auto" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export default function ToolsPage() {
  const { data: tools, isLoading, error } = useCustomTools();
  const t = useTranslations("customTools");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const tool of tools ?? []) {
      for (const tag of tool.tags) {
        tags.add(tag);
      }
    }
    return [...tags].sort();
  }, [tools]);

  const filtered = useMemo(() => {
    if (!tools) return tools;
    const q = search.trim().toLowerCase();

    let list = tools;
    if (q) {
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.displayName.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    if (activeTag) {
      list = list.filter((t) => t.tags.includes(activeTag));
    }

    const sorted = [...list];
    if (sortKey === "name") {
      sorted.sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name));
    } else {
      sorted.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    }
    return sorted;
  }, [tools, search, activeTag, sortKey]);

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 lg:px-10 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Button asChild>
          <Link href="/tools/new">
            <Plus className="h-4 w-4" />
            {t("new")}
          </Link>
        </Button>
      </div>

      {tools && tools.length > 0 && (
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
            <ToolCardSkeleton key={i} />
          ))}
        </div>
      )}

      {tools && tools.length === 0 && (
        <EmptyState
          icon={Wrench}
          title={t("emptyTitle")}
          description={t("empty")}
          action={
            <Button asChild>
              <Link href="/tools/new">
                <Plus className="h-4 w-4" />
                {t("new")}
              </Link>
            </Button>
          }
        />
      )}

      {filtered && filtered.length === 0 && tools && tools.length > 0 && (
        <p className="text-muted-foreground text-sm text-center py-16">{t("noSearchResults")}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered?.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </div>
  );
}
