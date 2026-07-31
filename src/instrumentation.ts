/**
 * Next.js 进程启动钩子（每个 server 进程执行一次）。
 * 在此启动工作流队列 worker，使长时间运行的工作流脱离 HTTP 请求生命周期。
 *
 * 注意：import 必须放在 NEXT_RUNTIME === "nodejs" 的分支体内——
 * Next 会为 edge runtime 再编译一次本文件，webpack 依靠 DefinePlugin
 * 的常量折叠剔除死分支里的依赖；写成"提前 return"会导致 mysql2
 * 被打进 edge 包并因缺少 Node 内置模块而编译失败。
 *
 * serverless 部署请设置 WORKFLOW_WORKER_ENABLED=false，
 * 改用外部 cron 定时调用 POST /api/workflow-jobs/tick 驱动队列。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startWorkflowWorker } = await import("@/server/workflow-worker");
    startWorkflowWorker();

    // 启动定时任务调度器（非测试环境）
    if (process.env.NODE_ENV !== "test") {
      const { startScheduler } = await import("@/lib/scheduler/worker");
      startScheduler();
    }
  }
}
