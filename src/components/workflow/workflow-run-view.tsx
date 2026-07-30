"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import {
  ArrowLeft,
  Play,
  PenLine,
  Loader2,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  StepForward,
  FastForward,
  Download,
  CircleCheck,
  CircleDashed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/format-relative-time";
import {
  useWorkflow,
  useWorkflowRuns,
  useWorkflowRunDetail,
  useTriggerRun,
  useResumeRun,
  useRetryRun,
  useStepRun,
} from "@/hooks/use-workflows";
import { StatusBadge, formatDuration } from "./run-status-badge";

/**
 * 工作流「运行视图」：面向使用者的干净执行界面（P1）。
 * 只做三件事：发起运行、看历史与进度、处理等待中的人工输入；
 * 编排/调试请去编辑器（/workflows/[id]/edit）。
 */
export function WorkflowRunView({ workflowId }: { workflowId: string }) {
  const { data: workflow, isLoading } = useWorkflow(workflowId);
  const { data: runs } = useWorkflowRuns(workflowId);
  const searchParams = useSearchParams();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const { data: runDetail } = useWorkflowRunDetail(selectedRunId ?? "");
  const triggerRun = useTriggerRun(workflowId);
  const resumeRun = useResumeRun();
  const retryRun = useRetryRun(selectedRunId ?? "");
  const stepRun = useStepRun(selectedRunId ?? "");
  const [input, setInput] = useState("");
  const [resumeInput, setResumeInput] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const t = useTranslations("workflowExt.runView");
  const tPanel = useTranslations("workflowExt.runPanel");
  const locale = useLocale();

  // 从待办列表跳转过来时（?run=xxx）自动定位到那次运行
  const runParam = searchParams.get("run");
  useEffect(() => {
    if (runParam) setSelectedRunId(runParam);
  }, [runParam]);

  // 默认选中最近一次运行，进页面即可看到上次结果
  useEffect(() => {
    if (!selectedRunId && runs && runs.length > 0) setSelectedRunId(runs[0].id);
  }, [runs, selectedRunId]);

  function handleTrigger() {
    if (!input.trim()) {
      toast.error(tPanel("emptyInput"));
      return;
    }
    triggerRun.mutate(
      { input, draft: false },
      {
        onSuccess: (result) => {
          setInput("");
          setSelectedRunId(result.id);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  function handleResume() {
    if (!selectedRunId) return;
    resumeRun.mutate(
      { runId: selectedRunId, input: resumeInput },
      {
        onSuccess: () => setResumeInput(""),
        onError: (err) => toast.error(err.message),
      },
    );
  }

  function handleExport() {
    if (!runDetail) return;
    const blob = new Blob([JSON.stringify(runDetail, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `workflow-run-${runDetail.run.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const published = workflow?.publishedVersionNumber ?? null;
  const isBusy = useMemo(
    () => runs?.some((r) => r.status === "queued" || r.status === "running") ?? false,
    [runs],
  );

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-6 py-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!workflow) return <div className="p-8">{t("notFound")}</div>;

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-8 lg:px-10 animate-in fade-in duration-300">
      {/* 头部：名称 + 发布状态 + 编排入口 */}
      <div className="flex items-start gap-3 mb-6">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 mt-0.5 shrink-0">
          <Link href="/workflows" aria-label={t("backToList")}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold truncate">{workflow.name}</h1>
            {published ? (
              <Badge variant="secondary" className="gap-1">
                <CircleCheck className="h-3 w-3 text-green-600" />
                {t("publishedVersion", { version: published })}
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <CircleDashed className="h-3 w-3" />
                {t("unpublished")}
              </Badge>
            )}
          </div>
          {workflow.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{workflow.description}</p>
          )}
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0 gap-1.5">
          <Link href={`/workflows/${workflowId}/edit`}>
            <PenLine className="h-3.5 w-3.5" />
            {t("edit")}
          </Link>
        </Button>
      </div>

      {/* 发起运行 */}
      <div className="rounded-lg border p-4 mb-6 space-y-3 bg-card">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("inputPlaceholder")}
          rows={3}
          className="resize-y"
        />
        <div className="flex items-center gap-3">
          <Button onClick={handleTrigger} disabled={triggerRun.isPending} className="gap-1.5">
            {triggerRun.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {t("run")}
          </Button>
          <p className="text-xs text-muted-foreground">
            {published ? t("runHintPublished", { version: published }) : t("runHintDraft")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* 运行历史 */}
        <div className="rounded-lg border overflow-hidden self-start">
          <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
            {t("historyHeading")}
          </p>
          <div className="max-h-[480px] overflow-y-auto divide-y">
            {(!runs || runs.length === 0) && (
              <p className="text-sm text-muted-foreground px-3 py-6 text-center">{tPanel("noRuns")}</p>
            )}
            {runs?.map((run) => (
              <button
                key={run.id}
                onClick={() => {
                  setSelectedRunId(run.id);
                  setExpandedLogId(null);
                }}
                className={`w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors ${
                  run.id === selectedRunId ? "bg-muted" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <StatusBadge status={run.status} />
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatRelativeTime(run.createdAt, locale)}
                  </span>
                </div>
                <p className="text-xs truncate text-muted-foreground">{run.input || "—"}</p>
                {run.versionNumber != null && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {tPanel("version", { version: run.versionNumber })}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 运行详情 */}
        <div className="rounded-lg border p-4 min-h-[300px]">
          {!runDetail && (
            <p className="text-sm text-muted-foreground py-12 text-center">{tPanel("selectRun")}</p>
          )}
          {runDetail && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={runDetail.run.status} />
                {isBusy && <span className="text-xs text-muted-foreground">{tPanel("activeHint")}</span>}
                <div className="flex-1" />
                {runDetail.run.status === "paused" && (
                  <>
                    <Button size="sm" variant="outline" className="gap-1" disabled={stepRun.isPending} onClick={() => stepRun.mutate("step")}>
                      <StepForward className="h-3.5 w-3.5" />
                      {tPanel("stepNext")}
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1" disabled={stepRun.isPending} onClick={() => stepRun.mutate("continue")}>
                      <FastForward className="h-3.5 w-3.5" />
                      {tPanel("runToEnd")}
                    </Button>
                  </>
                )}
                <Button size="sm" variant="ghost" className="gap-1" onClick={handleExport}>
                  <Download className="h-3.5 w-3.5" />
                  {tPanel("exportLogs")}
                </Button>
              </div>

              {runDetail.run.error && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">{runDetail.run.error}</p>
              )}

              {/* 等待人工输入：运行视图的核心交互 */}
              {runDetail.run.status === "waiting_for_input" && (
                <div className="rounded-md border border-orange-300 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/40 p-3 space-y-2">
                  <p className="text-sm font-medium">{t("waitingHeading")}</p>
                  <Textarea
                    value={resumeInput}
                    onChange={(e) => setResumeInput(e.target.value)}
                    placeholder={tPanel("resumePlaceholder")}
                    rows={3}
                  />
                  <Button size="sm" onClick={handleResume} disabled={resumeRun.isPending}>
                    {resumeRun.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                    {tPanel("resume")}
                  </Button>
                </div>
              )}

              {/* 步骤时间线 */}
              <div className="space-y-1.5">
                {runDetail.stepLogs.map((log) => {
                  const expanded = expandedLogId === log.id;
                  return (
                    <div key={log.id} className="rounded-md border">
                      <button
                        className="w-full flex items-center gap-2 px-3 py-2 text-left"
                        onClick={() => setExpandedLogId(expanded ? null : log.id)}
                      >
                        {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                        <span className="text-sm font-medium truncate">{log.nodeId}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">{log.nodeType}</Badge>
                        <StatusBadge status={log.status} />
                        <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                          {formatDuration(log.startedAt, log.completedAt)}
                        </span>
                        {log.status === "failed" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-1.5 gap-1 text-xs shrink-0"
                            disabled={retryRun.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              retryRun.mutate(log.nodeId, { onError: (err) => toast.error(err.message) });
                            }}
                          >
                            <RotateCcw className="h-3 w-3" />
                            {tPanel("retry")}
                          </Button>
                        )}
                      </button>
                      {expanded && (
                        <div className="px-3 pb-3 space-y-2 text-xs">
                          <div>
                            <p className="font-semibold text-muted-foreground mb-1">{tPanel("fullInput")}</p>
                            <pre className="whitespace-pre-wrap break-words bg-muted rounded p-2 max-h-48 overflow-y-auto">{log.input}</pre>
                          </div>
                          {log.output != null && (
                            <div>
                              <p className="font-semibold text-muted-foreground mb-1">{tPanel("fullOutput")}</p>
                              <pre className="whitespace-pre-wrap break-words bg-muted rounded p-2 max-h-72 overflow-y-auto">{log.output}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {runDetail.stepLogs.length === 0 && (
                  <p className="text-xs text-muted-foreground py-4 text-center">{tPanel("queuedHint")}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
