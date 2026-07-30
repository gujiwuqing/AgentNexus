"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Search, Workflow as WorkflowIcon, Plus, UserCheck, ChevronRight } from "lucide-react";
import { useWorkflows, usePendingInputRuns } from "@/hooks/use-workflows";
import { WorkflowCard } from "@/components/workflow/workflow-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelativeTime } from "@/lib/format-relative-time";

function WorkflowCardSkeleton() {
  return (
    <div className="rounded-lg border p-6 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-5 w-32" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export default function WorkflowsPage() {
  const { data: workflows, isLoading, error } = useWorkflows();
  const { data: pendingRuns } = usePendingInputRuns();
  const t = useTranslations("workflows");
  const locale = useLocale();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!workflows) return workflows;
    const q = search.trim().toLowerCase();
    if (!q) return workflows;
    return workflows.filter(
      (w) => w.name.toLowerCase().includes(q) || w.description?.toLowerCase().includes(q)
    );
  }, [workflows, search]);

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 lg:px-10 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Button asChild>
          <Link href="/workflows/new">
            <Plus className="h-4 w-4" />
            {t("new")}
          </Link>
        </Button>
      </div>

      {/* 待我处理：等待人工输入的运行，点击直达对应运行处理审批 */}
      {pendingRuns && pendingRuns.length > 0 && (
        <div className="mb-6 rounded-lg border border-orange-300 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 overflow-hidden">
          <p className="px-4 py-2.5 text-sm font-medium flex items-center gap-2 border-b border-orange-200 dark:border-orange-900">
            <UserCheck className="h-4 w-4 text-orange-600" />
            {t("pendingHeading", { count: pendingRuns.length })}
          </p>
          <div className="divide-y divide-orange-200 dark:divide-orange-900">
            {pendingRuns.map((run) => (
              <Link
                key={run.id}
                href={`/workflows/${run.workflowId}?run=${run.id}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-orange-100/60 dark:hover:bg-orange-900/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{run.workflowName}</p>
                  <p className="text-xs text-muted-foreground truncate">{run.input || "—"}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatRelativeTime(run.updatedAt, locale)}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {workflows && workflows.length > 0 && (
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9"
          />
        </div>
      )}

      {error && <p className="text-destructive">{t("loadError", { message: error.message })}</p>}

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <WorkflowCardSkeleton key={i} />
          ))}
        </div>
      )}

      {workflows && workflows.length === 0 && (
        <EmptyState
          icon={WorkflowIcon}
          title={t("emptyTitle")}
          description={t("empty")}
          action={
            <Button asChild>
              <Link href="/workflows/new">
                <Plus className="h-4 w-4" />
                {t("new")}
              </Link>
            </Button>
          }
        />
      )}

      {filtered && filtered.length === 0 && workflows && workflows.length > 0 && (
        <p className="text-muted-foreground text-sm text-center py-16">{t("noSearchResults")}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered?.map((workflow) => (
          <WorkflowCard key={workflow.id} workflow={workflow} />
        ))}
      </div>
    </div>
  );
}
