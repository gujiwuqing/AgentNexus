"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Play, FlaskConical } from "lucide-react";
import { useEvalCases, useCreateEvalCase, useRunEvals, type EvalRunResult } from "@/hooks/use-evals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const EMPTY_FORM = { name: "", input: "", expectedOutput: "", criteria: "" };

export function AgentEvals({ agentId }: { agentId: string }) {
  const { data: cases, isLoading } = useEvalCases(agentId);
  const createCase = useCreateEvalCase(agentId);
  const runEvals = useRunEvals(agentId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [results, setResults] = useState<EvalRunResult[] | null>(null);
  const [averageScore, setAverageScore] = useState<number | null>(null);

  function update(key: keyof typeof EMPTY_FORM, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCreate() {
    if (!form.name.trim() || !form.input.trim() || !form.criteria.trim()) {
      toast.error("请填写名称、输入和评判标准");
      return;
    }
    createCase.mutate(form, {
      onSuccess: () => {
        toast.success("评测用例已创建");
        setDialogOpen(false);
        setForm(EMPTY_FORM);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  function handleRun() {
    setResults(null);
    runEvals.mutate(undefined, {
      onSuccess: (data) => {
        setResults(data.results);
        setAverageScore(data.averageScore);
        toast.success(`评测完成，平均分 ${(data.averageScore * 100).toFixed(0)}%`);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-1.5">
          <FlaskConical className="h-4 w-4" />
          评测用例
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3 w-3 mr-1" />
            添加用例
          </Button>
          {cases && cases.length > 0 && (
            <Button size="sm" onClick={handleRun} disabled={runEvals.isPending}>
              <Play className="h-3 w-3 mr-1" />
              {runEvals.isPending ? "运行中..." : "运行评测"}
            </Button>
          )}
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">加载中...</p>}

      {cases && cases.length === 0 && (
        <p className="text-sm text-muted-foreground">暂无评测用例，添加一个来评估该 Agent 的输出质量。</p>
      )}

      {averageScore != null && (
        <div className="rounded-lg border p-3 bg-muted/30">
          <p className="text-sm font-medium">平均得分：{(averageScore * 100).toFixed(0)}%</p>
        </div>
      )}

      <div className="space-y-2">
        {cases?.map((c) => {
          const result = results?.find((r) => r.caseId === c.id);
          return (
            <div key={c.id} className="border rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{c.name}</p>
                {result && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${result.score >= 0.7 ? "bg-green-100 text-green-700" : result.score >= 0.4 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                    {(result.score * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">输入：{c.input}</p>
              <p className="text-xs text-muted-foreground">标准：{c.criteria}</p>
              {result && (
                <div className="mt-2 pt-2 border-t space-y-1">
                  <p className="text-xs"><span className="text-muted-foreground">实际输出：</span>{result.output}</p>
                  <p className="text-xs"><span className="text-muted-foreground">评判反馈：</span>{result.feedback}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加评测用例</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>名称</Label>
              <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="SQL注入检测能力" />
            </div>
            <div className="space-y-2">
              <Label>测试输入</Label>
              <Textarea value={form.input} onChange={(e) => update("input", e.target.value)} rows={3} placeholder="给 Agent 的测试问题" />
            </div>
            <div className="space-y-2">
              <Label>期望输出（可选）</Label>
              <Textarea value={form.expectedOutput} onChange={(e) => update("expectedOutput", e.target.value)} rows={2} placeholder="用于对比参考的期望回复" />
            </div>
            <div className="space-y-2">
              <Label>评判标准</Label>
              <Textarea value={form.criteria} onChange={(e) => update("criteria", e.target.value)} rows={2} placeholder="回复必须指出SQL注入风险并给出参数化查询建议" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={createCase.isPending}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
