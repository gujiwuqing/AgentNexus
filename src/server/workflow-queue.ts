import { and, asc, eq, lt, or, sql, isNull } from "drizzle-orm";
import { db } from "@/db";
import { workflowJobs, workflowRuns } from "@/db/schema";
import { createId } from "@/lib/id";

export type JobKind = "trigger" | "resume" | "retry" | "step";
export type JobPayload = Record<string, unknown>;

/** 租约时长：持有者需在到期前心跳续租，否则作业被视为可回收。 */
export const LEASE_MS = 60_000;
/** 单次心跳的间隔，取租约的三分之一，留足容错。 */
export const HEARTBEAT_MS = Math.floor(LEASE_MS / 3);

/**
 * 每个作业只允许被领取一次。工作流有副作用（LLM 计费、HTTP POST），
 * 崩溃后从头重跑会重复扣费和重复副作用，因此不做自动重试——
 * 中断的运行被标记为 failed，由用户用「按节点重试」从断点续跑。
 */
const MAX_ATTEMPTS = 1;

export type ClaimedJob = {
  id: string;
  runId: string;
  kind: JobKind;
  payload: JobPayload;
  attempts: number;
};

export async function enqueueJob(runId: string, kind: JobKind, payload: JobPayload = {}) {
  const id = createId();
  await db.insert(workflowJobs).values({ id, runId, kind, payload, status: "pending" });
  return id;
}

/**
 * 领取下一个待执行作业。
 *
 * MySQL 不允许 UPDATE 的子查询引用同一张表，因此分两步：
 * 先挑候选，再用条件 UPDATE 做乐观锁；只有 affectedRows === 1 才算领取成功，
 * 多个 worker 并发时只会有一个成功，其余重试下一个候选。
 */
export async function claimNextJob(workerId: string, leaseMs = LEASE_MS): Promise<ClaimedJob | null> {
  const now = new Date();

  const candidates = await db
    .select({
      id: workflowJobs.id,
      runId: workflowJobs.runId,
      kind: workflowJobs.kind,
      payload: workflowJobs.payload,
      attempts: workflowJobs.attempts,
    })
    .from(workflowJobs)
    .where(
      or(
        eq(workflowJobs.status, "pending"),
        // 租约过期的 processing 作业：持有者已崩溃
        and(eq(workflowJobs.status, "processing"), lt(workflowJobs.leaseExpiresAt, now)),
      ),
    )
    .orderBy(asc(workflowJobs.createdAt))
    .limit(5);

  for (const candidate of candidates) {
    // 已用尽尝试次数的中断作业不再重跑，直接终结
    if (candidate.attempts >= MAX_ATTEMPTS) {
      await failJob(candidate.id, "Execution was interrupted and will not be retried automatically");
      continue;
    }

    const leaseExpiresAt = new Date(Date.now() + leaseMs);
    const [header] = await db
      .update(workflowJobs)
      .set({
        status: "processing",
        workerId,
        leaseExpiresAt,
        attempts: sql`${workflowJobs.attempts} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(workflowJobs.id, candidate.id),
          or(
            eq(workflowJobs.status, "pending"),
            and(eq(workflowJobs.status, "processing"), lt(workflowJobs.leaseExpiresAt, new Date())),
          ),
        ),
      );

    if (header.affectedRows === 1) {
      return {
        id: candidate.id,
        runId: candidate.runId,
        kind: candidate.kind,
        payload: (candidate.payload ?? {}) as JobPayload,
        attempts: candidate.attempts + 1,
      };
    }
    // 被别的 worker 抢先，继续尝试下一个候选
  }

  return null;
}

/** 续租。返回 false 表示租约已被他人接管，调用方应停止工作。 */
export async function heartbeatJob(jobId: string, workerId: string, leaseMs = LEASE_MS): Promise<boolean> {
  const [header] = await db
    .update(workflowJobs)
    .set({ leaseExpiresAt: new Date(Date.now() + leaseMs), updatedAt: new Date() })
    .where(
      and(
        eq(workflowJobs.id, jobId),
        eq(workflowJobs.workerId, workerId),
        eq(workflowJobs.status, "processing"),
      ),
    );
  return header.affectedRows === 1;
}

export async function completeJob(jobId: string) {
  await db
    .update(workflowJobs)
    .set({ status: "done", leaseExpiresAt: null, updatedAt: new Date() })
    .where(eq(workflowJobs.id, jobId));
}

export async function failJob(jobId: string, error: string) {
  await db
    .update(workflowJobs)
    .set({ status: "failed", error, leaseExpiresAt: null, updatedAt: new Date() })
    .where(eq(workflowJobs.id, jobId));
}

/**
 * 回收僵尸运行：进程被杀时 run 会永远停在 queued/running。
 * 把租约过期（或从未领取但作业已终结）的运行标记为 failed，让用户看到明确状态。
 */
export async function reapInterruptedRuns(): Promise<number> {
  const now = new Date();

  const stale = await db
    .select({ jobId: workflowJobs.id, runId: workflowJobs.runId, attempts: workflowJobs.attempts })
    .from(workflowJobs)
    .where(
      and(
        eq(workflowJobs.status, "processing"),
        or(isNull(workflowJobs.leaseExpiresAt), lt(workflowJobs.leaseExpiresAt, now)),
      ),
    )
    .limit(50);

  let reaped = 0;
  for (const job of stale) {
    if (job.attempts < MAX_ATTEMPTS) continue; // 还能被重新领取，不作回收

    await failJob(job.jobId, "Execution was interrupted (worker lease expired)");
    await db
      .update(workflowRuns)
      .set({
        status: "failed",
        error: "Execution was interrupted. Use retry from the failed node to continue.",
        updatedAt: new Date(),
      })
      .where(and(eq(workflowRuns.id, job.runId), eq(workflowRuns.status, "running")));
    reaped++;
  }

  return reaped;
}

export async function getPendingJobCount(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(workflowJobs)
    .where(or(eq(workflowJobs.status, "pending"), eq(workflowJobs.status, "processing")));
  return Number(row?.count ?? 0);
}
