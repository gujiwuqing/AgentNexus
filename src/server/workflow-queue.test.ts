import { describe, it, expect, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workflowJobs, workflowRuns } from "@/db/schema";
import { clearAllTables, authedUser } from "@/db/test-helpers";
import { createWorkflow } from "./workflows";
import { createId } from "@/lib/id";
import {
  enqueueJob,
  claimNextJob,
  heartbeatJob,
  completeJob,
  failJob,
  reapInterruptedRuns,
  getPendingJobCount,
} from "./workflow-queue";

afterEach(clearAllTables);

/** 建一个处于 running 状态的运行，作为作业的挂载点。 */
async function makeRun(userId: string) {
  const workflow = await createWorkflow(
    { name: "W", description: "", graph: { nodes: [], edges: [] } },
    userId,
  );
  const runId = createId();
  await db.insert(workflowRuns).values({
    id: runId,
    workflowId: workflow.id,
    status: "running",
    input: "",
    context: {},
  });
  return runId;
}

describe("workflow queue", () => {
  it("returns null when there is nothing to claim", async () => {
    expect(await claimNextJob("worker-1")).toBeNull();
  });

  it("enqueues and claims a job with its payload", async () => {
    const { user } = await authedUser();
    const runId = await makeRun(user.id);
    await enqueueJob(runId, "resume", { input: "hello" });

    const job = await claimNextJob("worker-1");
    expect(job).not.toBeNull();
    expect(job!.runId).toBe(runId);
    expect(job!.kind).toBe("resume");
    expect(job!.payload).toEqual({ input: "hello" });
    expect(job!.attempts).toBe(1);
  });

  it("lets only one worker win a concurrent claim", async () => {
    const { user } = await authedUser();
    const runId = await makeRun(user.id);
    await enqueueJob(runId, "trigger", {});

    const [a, b] = await Promise.all([claimNextJob("worker-a"), claimNextJob("worker-b")]);
    const winners = [a, b].filter(Boolean);
    expect(winners).toHaveLength(1);
  });

  it("does not hand the same job to a second claimer while the lease is valid", async () => {
    const { user } = await authedUser();
    const runId = await makeRun(user.id);
    await enqueueJob(runId, "trigger", {});

    expect(await claimNextJob("worker-a")).not.toBeNull();
    expect(await claimNextJob("worker-b")).toBeNull();
  });

  it("extends the lease only for the current holder", async () => {
    const { user } = await authedUser();
    const runId = await makeRun(user.id);
    await enqueueJob(runId, "trigger", {});
    const job = await claimNextJob("worker-a");

    expect(await heartbeatJob(job!.id, "worker-a")).toBe(true);
    expect(await heartbeatJob(job!.id, "worker-b")).toBe(false);
  });

  it("marks jobs done and failed", async () => {
    const { user } = await authedUser();
    const runId = await makeRun(user.id);
    const doneId = await enqueueJob(runId, "trigger", {});
    const failedId = await enqueueJob(runId, "retry", {});

    await completeJob(doneId);
    await failJob(failedId, "boom");

    const rows = await db.select().from(workflowJobs).where(eq(workflowJobs.runId, runId));
    expect(rows.find((r) => r.id === doneId)?.status).toBe("done");
    const failed = rows.find((r) => r.id === failedId);
    expect(failed?.status).toBe("failed");
    expect(failed?.error).toBe("boom");
  });

  it("counts only pending and processing jobs", async () => {
    const { user } = await authedUser();
    const runId = await makeRun(user.id);
    const a = await enqueueJob(runId, "trigger", {});
    await enqueueJob(runId, "retry", {});
    expect(await getPendingJobCount()).toBe(2);

    await completeJob(a);
    expect(await getPendingJobCount()).toBe(1);
  });

  it("reaps an interrupted run whose lease expired", async () => {
    const { user } = await authedUser();
    const runId = await makeRun(user.id);
    const jobId = await enqueueJob(runId, "trigger", {});

    // 模拟持有者崩溃：已领取一次（attempts=1）且租约已过期
    await db
      .update(workflowJobs)
      .set({
        status: "processing",
        attempts: 1,
        workerId: "dead-worker",
        leaseExpiresAt: new Date(Date.now() - 60_000),
      })
      .where(eq(workflowJobs.id, jobId));

    const reaped = await reapInterruptedRuns();
    expect(reaped).toBe(1);

    const [job] = await db.select().from(workflowJobs).where(eq(workflowJobs.id, jobId));
    expect(job.status).toBe("failed");

    const [run] = await db.select().from(workflowRuns).where(eq(workflowRuns.id, runId));
    expect(run.status).toBe("failed");
    expect(run.error).toContain("interrupted");
  });

  it("does not auto-retry an interrupted job (side effects are not idempotent)", async () => {
    const { user } = await authedUser();
    const runId = await makeRun(user.id);
    const jobId = await enqueueJob(runId, "trigger", {});

    await db
      .update(workflowJobs)
      .set({
        status: "processing",
        attempts: 1,
        workerId: "dead-worker",
        leaseExpiresAt: new Date(Date.now() - 60_000),
      })
      .where(eq(workflowJobs.id, jobId));

    // 用尽尝试次数的作业不会被重新领取，而是直接终结
    expect(await claimNextJob("worker-new")).toBeNull();
    const [job] = await db.select().from(workflowJobs).where(eq(workflowJobs.id, jobId));
    expect(job.status).toBe("failed");
  });

  it("claims jobs in creation order", async () => {
    const { user } = await authedUser();
    const runId = await makeRun(user.id);
    const first = await enqueueJob(runId, "trigger", { tag: "first" });
    await new Promise((r) => setTimeout(r, 10));
    await enqueueJob(runId, "retry", { tag: "second" });

    const job = await claimNextJob("worker-a");
    expect(job!.id).toBe(first);
  });
});
