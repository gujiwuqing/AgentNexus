"use client";

import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

/** 运行/步骤状态徽章：RunPanel（编辑器调试）与 WorkflowRunView（运行视图）共用。 */
export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("workflowExt.status");
  const colors: Record<string, string> = {
    completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    running: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    queued: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    waiting_for_input: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    paused: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    skipped: "bg-muted text-muted-foreground",
  };
  const isActive = status === "running" || status === "queued";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${colors[status] ?? "bg-muted"}`}>
      {isActive && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
      {t(status as "running" | "waiting_for_input" | "completed" | "failed" | "skipped" | "paused" | "queued")}
    </span>
  );
}

export function formatDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return "-";
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
