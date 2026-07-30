import { apiOk, apiError } from "@/lib/api-response";
import { drainWorkflowQueue } from "@/server/workflow-worker";
import { reapInterruptedRuns } from "@/server/workflow-queue";

/**
 * 由外部 cron 驱动队列的入口（serverless 部署下替代进程内 worker）。
 * 用 WORKFLOW_TICK_SECRET 保护：未配置该环境变量时端点直接关闭，
 * 避免无鉴权的公开执行入口。
 */
export async function POST(request: Request) {
  const secret = process.env.WORKFLOW_TICK_SECRET;
  if (!secret) {
    return apiError(404, "not_found", "Tick endpoint is disabled");
  }

  const provided =
    request.headers.get("x-workflow-tick-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (provided !== secret) {
    return apiError(401, "unauthorized", "Invalid tick secret");
  }

  const { searchParams } = new URL(request.url);
  const maxJobsParam = Number(searchParams.get("maxJobs"));
  const maxJobs = Number.isFinite(maxJobsParam) && maxJobsParam > 0 ? Math.min(maxJobsParam, 50) : 5;

  const reaped = await reapInterruptedRuns();
  const processed = await drainWorkflowQueue(maxJobs);

  return apiOk({ processed, reaped });
}
