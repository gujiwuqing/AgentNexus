"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw, ChevronDown, ChevronRight, Play, StepForward, FastForward, Braces, Search, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
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
  useStepRun,
} from "@/hooks/use-workflows";
import { StatusBadge, formatDuration } from "./run-status-badge";

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
  const stepRun = useStepRun(selectedRunId ?? "");
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [runInput, setRunInput] = useState("");
  const [stepMode, setStepMode] = useState(false);
  const [resumeInput, setResumeInput] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [showContext, setShowContext] = useState(false);
  const [logQuery, setLogQuery] = useState("");
  const t = useTranslations("workflowExt.runPanel");

  const filteredLogs = useMemo(() => {
    const logs = runDetail?.stepLogs ?? [];
    const q = logQuery.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((log) =>
      [log.nodeId, log.nodeType, log.status, log.input, log.output ?? ""].some((field) =>
        field.toLowerCase().includes(q),
      ),
    );
  }, [runDetail, logQuery]);

  /** 导出当前运行的完整记录（run + 全部步骤日志）为 JSON 文件。 */
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

  function selectRun(id: string) {
    setSelectedRunId(id);
    onSelectRun(id);
    setExpandedLogId(null);
  }

  function handleTrigger() {
    // 编辑器内的运行是调试运行：跑当前草稿，不受已发布版本影响
    triggerRun.mutate({ input: runInput, stepMode, draft: true }, {
      onSuccess: (result) => {
        setRunDialogOpen(false);
        setRunInput("");
        refetchRuns();
        selectRun(result.id);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  function handleStep(mode: "step" | "continue") {
    stepRun.mutate(mode, {
      onSuccess: () => {
        refetchRuns();
        refetchDetail();
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
          <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {t("heading")}
          </span>
          <Button size="sm" variant="outline" className="h-6 text-xs cursor-pointer gap-1" onClick={(e) => { e.stopPropagation(); setRunDialogOpen(true); }}>
            <Play className="h-3 w-3" />
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
                  <div className="flex items-center gap-2 pb-1">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input
                        value={logQuery}
                        onChange={(e) => setLogQuery(e.target.value)}
                        placeholder={t("searchLogs")}
                        className="h-6 pl-7 text-xs"
                      />
                    </div>
                    {logQuery && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {t("logMatches", { shown: filteredLogs.length, total: runDetail.stepLogs.length })}
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs cursor-pointer gap-1 shrink-0"
                      onClick={handleExport}
                    >
                      <Download className="h-3 w-3" />
                      {t("exportLogs")}
                    </Button>
                  </div>

                  {filteredLogs.length === 0 && (
                    <p className="text-xs text-muted-foreground py-3 text-center">{t("noLogMatch")}</p>
                  )}

                  {filteredLogs.map((log) => {
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

                  {(runDetail.run.status === "queued" || runDetail.run.status === "running") && (
                    <p className="text-[10px] text-muted-foreground py-1">
                      {runDetail.run.status === "queued" ? t("queuedHint") : t("activeHint")}
                    </p>
                  )}

                  {runDetail.run.status === "paused" && (
                    <div className="mt-2 rounded border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 p-2 space-y-1.5">
                      <p className="text-[10px] text-blue-800 dark:text-blue-200">
                        {t("pausedAt", { nodes: runDetail.run.currentNodeId ?? "-" })}
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 text-xs cursor-pointer gap-1" onClick={() => handleStep("step")} disabled={stepRun.isPending}>
                          <StepForward className="h-3 w-3" />
                          {t("stepNext")}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs cursor-pointer gap-1" onClick={() => handleStep("continue")} disabled={stepRun.isPending}>
                          <FastForward className="h-3 w-3" />
                          {t("runToEnd")}
                        </Button>
                      </div>
                    </div>
                  )}

                  {Object.keys(runDetail.run.context ?? {}).length > 0 && (
                    <div className="mt-2 border rounded text-xs">
                      <div
                        className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-muted/50"
                        onClick={() => setShowContext((v) => !v)}
                      >
                        {showContext ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                        <Braces className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="font-medium">{t("contextHeading", { count: Object.keys(runDetail.run.context).length })}</span>
                      </div>
                      {showContext && (
                        <div className="px-3 pb-2 space-y-2 border-t bg-muted/30">
                          {Object.entries(runDetail.run.context).map(([nodeId, value]) => (
                            <div key={nodeId}>
                              <p className="text-[10px] font-semibold text-muted-foreground mt-1.5">{nodeId}</p>
                              <pre className="text-[10px] whitespace-pre-wrap bg-background rounded p-1.5 max-h-24 overflow-y-auto border">{value || "-"}</pre>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

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
          <div className="space-y-3">
            <Input
              value={runInput}
              onChange={(e) => setRunInput(e.target.value)}
              placeholder={t("inputPlaceholder")}
            />
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={stepMode}
                onChange={(e) => setStepMode(e.target.checked)}
              />
              {t("stepModeLabel")}
            </label>
            {stepMode && <p className="text-xs text-muted-foreground">{t("stepModeHint")}</p>}
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
