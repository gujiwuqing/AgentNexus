import { randomUUID } from "node:crypto";
import {
  claimNextJob,
  completeJob,
  failJob,
  heartbeatJob,
  reapInterruptedRuns,
  HEARTBEAT_MS,
  type ClaimedJob,
} from "./workflow-queue";
import { executeRunJob, markRunFailed } from "./workflow-runs";

/** 本进程标识，用于租约归属判断与日志排查。 */
export const WORKER_ID = `${process.pid}-${randomUUID().slice(0, 8)}`;

/** 同时执行的作业数上限，避免一次性打满 LLM 配额。 */
const CONCURRENCY = Math.max(1, Number(process.env.WORKFLOW_WORKER_CONCURRENCY ?? 2));
/** 队列空闲时的轮询间隔。 */
const IDLE_POLL_MS = Number(process.env.WORKFLOW_WORKER_POLL_MS ?? 2_000);

let inFlight = 0;

/**
 * 执行单个作业，期间定期续租。
 * 续租失败说明租约已被他人接管（本进程可能长时间卡住），此时放弃写回结果。
 */
async function runJobWithLease(job: ClaimedJob): Promise<void> {
  let lostLease = false;
  const heartbeat = setInterval(() => {
    void heartbeatJob(job.id, WORKER_ID).then((ok) => {
      if (!ok) lostLease = true;
    });
  }, HEARTBEAT_MS);

  try {
    await executeRunJob(job);
    if (!lostLease) await completeJob(job.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[workflow-worker] job ${job.id} (${job.kind}) failed:`, message);
    if (!lostLease) {
      await failJob(job.id, message);
      // 前置条件失败时引擎没机会写状态，这里兜底避免运行永久停在 queued
      await markRunFailed(job.runId, message);
    }
  } finally {
    clearInterval(heartbeat);
  }
}

/**
 * 领取并执行一个作业。返回是否真的做了事，供调用方决定是否继续紧凑轮询。
 * 该函数同时被进程内 worker 与 /api/workflow-jobs/tick 复用。
 */
export async function processNextJob(): Promise<boolean> {
  if (inFlight >= CONCURRENCY) return false;

  const job = await claimNextJob(WORKER_ID);
  if (!job) return false;

  inFlight++;
  try {
    await runJobWithLease(job);
  } finally {
    inFlight--;
  }
  return true;
}

/**
 * 尽量把队列排空，最多处理 maxJobs 个作业。
 * 供外部 cron（serverless 部署）与测试使用。
 */
export async function drainWorkflowQueue(maxJobs = 20): Promise<number> {
  let processed = 0;
  while (processed < maxJobs) {
    const didWork = await processNextJob();
    if (!didWork) break;
    processed++;
  }
  return processed;
}

let started = false;
let timer: ReturnType<typeof setTimeout> | undefined;

/**
 * 启动进程内 worker（self-hosted `next start` 场景）。
 * 幂等：重复调用只会启动一次。serverless 部署下应关闭它并改用 tick 端点 + 外部 cron。
 */
export function startWorkflowWorker(): void {
  if (started) return;
  if (process.env.WORKFLOW_WORKER_ENABLED === "false") {
    console.log("[workflow-worker] disabled by WORKFLOW_WORKER_ENABLED=false");
    return;
  }
  started = true;

  console.log(`[workflow-worker] started (id=${WORKER_ID}, concurrency=${CONCURRENCY})`);

  const loop = async () => {
    try {
      // 回收上一次进程被杀时留下的僵尸运行
      await reapInterruptedRuns();
      const didWork = await processNextJob();
      // 有活干就立刻继续，空闲则退避
      timer = setTimeout(() => void loop(), didWork ? 0 : IDLE_POLL_MS);
    } catch (err) {
      console.error("[workflow-worker] loop error:", err);
      timer = setTimeout(() => void loop(), IDLE_POLL_MS);
    }
  };

  void loop();

  const shutdown = () => {
    if (timer) clearTimeout(timer);
    started = false;
    console.log("[workflow-worker] stopped");
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
