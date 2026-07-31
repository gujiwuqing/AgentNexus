"use client";

import { useState } from "react";
import { Plus, Trash2, Clock, Bot, Workflow, Power } from "lucide-react";
import { toast } from "sonner";
import {
  useScheduledTasks,
  useCreateScheduledTask,
  useDeleteScheduledTask,
  type ScheduledTaskFormValues,
} from "@/hooks/use-scheduled-tasks";
import { useAgents } from "@/hooks/use-agents";
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
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

const DEFAULT_FORM: ScheduledTaskFormValues = {
  name: "",
  type: "agent_chat",
  targetId: "",
  input: "",
  cronExpression: "every 1h",
};

export default function SchedulesPage() {
  const { data: tasks, isLoading } = useScheduledTasks();
  const { data: agents } = useAgents();
  const createTask = useCreateScheduledTask();
  const deleteTask = useDeleteScheduledTask();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ScheduledTaskFormValues>(DEFAULT_FORM);

  function update<K extends keyof ScheduledTaskFormValues>(key: K, value: ScheduledTaskFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCreate() {
    if (!form.name.trim() || !form.targetId || !form.input.trim() || !form.cronExpression.trim()) {
      toast.error("请填写完整信息");
      return;
    }
    createTask.mutate(form, {
      onSuccess: () => {
        toast.success("定时任务已创建");
        setDialogOpen(false);
        setForm(DEFAULT_FORM);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  function handleDelete(id: string) {
    deleteTask.mutate(id, {
      onSuccess: () => toast.success("已删除"),
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-8 lg:px-10 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">定时任务</h1>
          <p className="text-sm text-muted-foreground mt-1">让 Agent 或工作流按计划自动执行</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          新建任务
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      )}

      {tasks && tasks.length === 0 && (
        <EmptyState
          icon={Clock}
          title="暂无定时任务"
          description="创建一个定时任务，让 Agent 定期自动对话或触发工作流"
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              新建任务
            </Button>
          }
        />
      )}

      <div className="space-y-3">
        {tasks?.map((task) => (
          <div key={task.id} className="border rounded-lg p-4 flex items-start gap-3">
            <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
              {task.type === "agent_chat" ? <Bot className="h-4 w-4" /> : <Workflow className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{task.name}</p>
                <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                  {task.cronExpression}
                </span>
                {task.enabled ? (
                  <span className="text-xs text-green-600 flex items-center gap-0.5">
                    <Power className="h-3 w-3" /> 启用
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">已停用</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-1">{task.input}</p>
              <p className="text-xs text-muted-foreground mt-1">
                下次执行：{task.nextRunAt ? new Date(task.nextRunAt).toLocaleString() : "-"}
                {task.lastRunAt && ` · 上次执行：${new Date(task.lastRunAt).toLocaleString()}`}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(task.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建定时任务</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>任务名称</Label>
              <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="每日晨报" />
            </div>
            <div className="space-y-2">
              <Label>类型</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={form.type === "agent_chat" ? "default" : "outline"}
                  size="sm"
                  onClick={() => update("type", "agent_chat")}
                >
                  Agent 对话
                </Button>
                <Button
                  type="button"
                  variant={form.type === "workflow_run" ? "default" : "outline"}
                  size="sm"
                  onClick={() => update("type", "workflow_run")}
                >
                  工作流运行
                </Button>
              </div>
            </div>
            {form.type === "agent_chat" && (
              <div className="space-y-2">
                <Label>选择 Agent</Label>
                <select
                  value={form.targetId}
                  onChange={(e) => update("targetId", e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">请选择</option>
                  {agents?.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}
            {form.type === "workflow_run" && (
              <div className="space-y-2">
                <Label>工作流 ID</Label>
                <Input value={form.targetId} onChange={(e) => update("targetId", e.target.value)} placeholder="工作流 ID" />
              </div>
            )}
            <div className="space-y-2">
              <Label>输入内容</Label>
              <Textarea value={form.input} onChange={(e) => update("input", e.target.value)} rows={3} placeholder="发送给 Agent 的消息内容，或工作流的输入" />
            </div>
            <div className="space-y-2">
              <Label>执行频率</Label>
              <Input
                value={form.cronExpression}
                onChange={(e) => update("cronExpression", e.target.value)}
                placeholder="every 1h / every 30m / 09:00"
              />
              <p className="text-xs text-muted-foreground">支持格式：every Nm（每N分钟）、every Nh（每N小时）、HH:MM（每天该时间点）</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={createTask.isPending}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
