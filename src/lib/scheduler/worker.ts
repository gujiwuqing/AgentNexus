import { getDueTasks, markTaskRun } from "@/server/scheduled-tasks";

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startScheduler(pollMs = 60000) {
  if (intervalId) return;
  console.log("[scheduler] Started, polling every", pollMs, "ms");
  intervalId = setInterval(async () => {
    try {
      const dueTasks = await getDueTasks();
      for (const task of dueTasks) {
        console.log(`[scheduler] Executing task: ${task.name} (${task.type})`);
        try {
          if (task.type === "agent_chat") {
            // 动态导入避免循环依赖
            const { createConversation } = await import("@/server/conversations");
            const { appendUserMessage } = await import("@/server/messages");
            const conv = await createConversation(task.targetId, task.userId);
            if (conv) await appendUserMessage(conv.id, task.input);
            // 注意：这里只创建了对话和用户消息，不会自动触发 AI 回复
            // AI 回复需要前端轮询或后续改为 webhook 触发
          } else if (task.type === "workflow_run") {
            const { enqueueWorkflowRun } = await import("@/server/workflow-runs");
            await enqueueWorkflowRun(task.targetId, task.input);
          }
          await markTaskRun(task.id, task.cronExpression);
          console.log(`[scheduler] Task completed: ${task.name}`);
        } catch (err) {
          console.error(`[scheduler] Task failed: ${task.name}`, err instanceof Error ? err.message : err);
          await markTaskRun(task.id, task.cronExpression); // 即使失败也更新时间，避免重复执行
        }
      }
    } catch (err) {
      console.error("[scheduler] Poll error:", err instanceof Error ? err.message : err);
    }
  }, pollMs);
}

export function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[scheduler] Stopped");
  }
}
