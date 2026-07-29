"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
} from "@/hooks/use-workflows";

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("workflowExt.status");
  const colors: Record<string, string> = {
    completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    running: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    waiting_for_input: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors[status] ?? "bg-muted"}`}>
      {t(status as "running" | "waiting_for_input" | "completed" | "failed" | "skipped")}
    </span>
  );
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
  const { data: runDetail } = useWorkflowRunDetail(selectedRunId ?? "");
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [runInput, setRunInput] = useState("");
  const [resumeInput, setResumeInput] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const t = useTranslations("workflowExt.runPanel");

  function selectRun(id: string) {
    setSelectedRunId(id);
    onSelectRun(id);
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
        },
      }
    );
  }

  return (
    <>
      <div className="border-t">
        <div className="flex items-center justify-between px-4 py-1.5 bg-muted/50 cursor-pointer" onClick={() => setCollapsed((c) => !c)}>
          <span className="text-xs font-semibold text-muted-foreground">{t("heading")} {collapsed ? "▸" : "▾"}</span>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={(e) => { e.stopPropagation(); setRunDialogOpen(true); }}>
            {t("run")}
          </Button>
        </div>

        {!collapsed && (
          <div className="flex h-[200px]">
            <div className="w-[240px] border-r overflow-y-auto">
              {runs?.map((run) => (
                <div
                  key={run.id}
                  className={`px-3 py-1.5 cursor-pointer hover:bg-muted text-xs ${run.id === selectedRunId ? "bg-muted" : ""}`}
                  onClick={() => selectRun(run.id)}
                >
                  <div className="flex items-center justify-between">
                    <StatusBadge status={run.status} />
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
                <div className="space-y-2">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-1">{t("colNode")}</th>
                        <th className="text-left p-1">{t("colType")}</th>
                        <th className="text-left p-1">{t("colStatus")}</th>
                        <th className="text-left p-1">{t("colOutput")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runDetail.stepLogs.map((log) => (
                        <tr key={log.id} className="border-b">
                          <td className="p-1">{log.nodeId}</td>
                          <td className="p-1">{log.nodeType}</td>
                          <td className="p-1"><StatusBadge status={log.status} /></td>
                          <td className="p-1 max-w-[200px] truncate">{log.output ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {runDetail.run.status === "waiting_for_input" && (
                    <div className="flex gap-2 mt-2">
                      <Input
                        className="h-7 text-xs"
                        placeholder={t("resumePlaceholder")}
                        value={resumeInput}
                        onChange={(e) => setResumeInput(e.target.value)}
                      />
                      <Button size="sm" className="h-7 text-xs" onClick={handleResume} disabled={resumeRun.isPending}>
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
