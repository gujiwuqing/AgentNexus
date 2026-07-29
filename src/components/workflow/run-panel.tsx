"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useWorkflowRuns,
  useWorkflowRunDetail,
  useTriggerRun,
  useResumeRun,
  useRetryRun,
} from "@/hooks/use-workflows";

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("workflowExt.status");
  const colors: Record<string, string> = {
    completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    running: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    waiting_for_input: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    skipped: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors[status] ?? "bg-muted"}`}>
      {t(status as "running" | "waiting_for_input" | "completed" | "failed" | "skipped")}
    </span>
  );
}

function formatDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return "-";
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function RunPanel({
  workflowId,
  onSelectRun,
}: {
  workflowId: string;
  onSelectRun: (runId: string | null) => void;
}) {
  const { data: runs, refetch: refetchRuns } = useWorkflowRuns(workflowId);
  const triggerRun = useTriggerRun(workflowId);
  const resumeRun = useResumeRun();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const { data: runDetail, refetch: refetchDetail } = useWorkflowRunDetail(selectedRunId ?? "");
  const retryRun = useRetryRun(selectedRunId ?? "");
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [runInput, setRunInput] = useState("");
  const [resumeInput, setResumeInput] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const t = useTranslations("workflowExt.runPanel");

  function selectRun(id: string) {
    setSelectedRunId(id);
    onSelectRun(id);
    setExpandedLogId(null);
  }

  function handleTrigger() {
    triggerRun.mutate(runInput, {
      onSuccess: (result) => {
        setRunDialogOpen(false);
        setRunInput("");
        refetchRuns();
        selectRun(result.id);
      },
    });
  }

  function handleResume() {
    if (!selectedRunId) return;
    resumeRun.mutate(
      { runId: selectedRunId, input: resumeInput },
      {
        onSuccess: () => {
          setResumeInput("");
          refetchRuns();
          refetchDetail();
        },
      }
    );
  }

  function handleRetry(nodeId: string) {
    retryRun.mutate(nodeId, {
      onSuccess: () => {
        refetchRuns();
        refetchDetail();
      },
    });
  }

  return (
    <>
      <div className="border-t">
        <div className="flex items-center justify-between px-4 py-1.5 bg-muted/50 cursor-pointer" onClick={() => setCollapsed((c) => !c)}>
          <span className="text-xs font-semibold text-muted-foreground">{t("heading")} {collapsed ? "▸" : "▾"}</span>
          <Button size="sm" variant="outline" className="h-6 text-xs cursor-pointer" onClick={(e) => { e.stopPropagation(); setRunDialogOpen(true); }}>
            {t("run")}
          </Button>
        </div>

        {!collapsed && (
          <div className="flex h-[240px]">
            <div className="w-[240px] border-r overflow-y-auto">
              {runs?.map((run) => (
                <div
                  key={run.id}
                  className={`px-3 py-1.5 cursor-pointer hover:bg-muted text-xs ${run.id === selectedRunId ? "bg-muted" : ""}`}
                  onClick={() => selectRun(run.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <StatusBadge status={run.status} />
                      {run.versionNumber != null && (
                        <Badge variant="secondary" className="text-[9px] h-4 px-1">
                          {t("version", { number: run.versionNumber })}
                        </Badge>
                      )}
                    </div>
                    <span className="text-muted-foreground">{new Date(run.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="truncate mt-0.5 text-muted-foreground">{run.input || t("emptyInput")}</p>
                </div>
              ))}
              {(!runs || runs.length === 0) && (
                <p className="text-xs text-muted-foreground p-3">{t("noRuns")}</p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {runDetail ? (
                <div className="space-y-1">
                  {runDetail.stepLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    return (
                      <div key={log.id} className="border rounded text-xs">
                        <div
                          className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-muted/50"
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        >
                          {isExpanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                          <span className="font-medium truncate flex-1">{log.nodeId}</span>
                          <span className="text-muted-foreground">{log.nodeType}</span>
                          <StatusBadge status={log.status} />
                          <span className="text-muted-foreground">{formatDuration(log.startedAt, log.completedAt)}</span>
                          {log.status === "failed" && runDetail.run.status === "failed" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 cursor-pointer"
                              disabled={retryRun.isPending}
                              onClick={(e) => { e.stopPropagation(); handleRetry(log.nodeId); }}
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        {isExpanded && (
                          <div className="px-3 pb-2 space-y-2 border-t bg-muted/30">
                            <div>
                              <p className="text-[10px] font-semibold text-muted-foreground mt-1.5">{t("fullInput")}</p>
                              <pre className="text-[10px] whitespace-pre-wrap bg-background rounded p-1.5 max-h-24 overflow-y-auto border">{log.input || "-"}</pre>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-muted-foreground">{t("fullOutput")}</p>
                              <pre className="text-[10px] whitespace-pre-wrap bg-background rounded p-1.5 max-h-24 overflow-y-auto border">{log.output || "-"}</pre>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {runDetail.run.status === "waiting_for_input" && (
                    <div className="flex gap-2 mt-2">
                      <Input
                        className="h-7 text-xs"
                        placeholder={t("resumePlaceholder")}
                        value={resumeInput}
                        onChange={(e) => setResumeInput(e.target.value)}
                      />
                      <Button size="sm" className="h-7 text-xs cursor-pointer" onClick={handleResume} disabled={resumeRun.isPending}>
                        {t("resume")}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{t("selectRun")}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={runInput}
              onChange={(e) => setRunInput(e.target.value)}
              placeholder={t("inputPlaceholder")}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRunDialogOpen(false)}>{t("cancel")}</Button>
            <Button onClick={handleTrigger} disabled={triggerRun.isPending}>
              {triggerRun.isPending ? t("running") : t("execute")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
