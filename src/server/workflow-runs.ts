import { eq, desc, and } from "drizzle-orm";
import { db } from "@/db";
import { workflowRuns, workflowStepLogs, workflows } from "@/db/schema";
import { createId } from "@/lib/id";
import { getWorkflow } from "./workflows";
import { getAgent } from "./agents";
import { getProviderConfig } from "./provider-config";
import { resolveProviderConfig } from "@/lib/ai/provider";
import { generateAgentReply } from "@/lib/ai/generate";
import { executeWorkflow, type EngineCallbacks, type EngineResult } from "@/lib/workflow/engine";
import { retrieveAgentRagContext, injectRagContext } from "@/lib/knowledge/agent-rag";
import type { WorkflowGraph, ExecutionContext } from "@/types/workflow";
import { getLatestVersionNumber, getWorkflowVersion } from "./workflow-versions";
import { enqueueJob, type ClaimedJob } from "./workflow-queue";

/** 单个节点的执行超时（默认 5 分钟），可用环境变量覆盖。 */
const NODE_TIMEOUT_MS = Number(process.env.WORKFLOW_NODE_TIMEOUT_MS ?? 5 * 60_000);

/** paused 状态下 currentNodeId 存逗号分隔的待执行节点列表，其余状态存单个节点。 */
function resultCurrentNodeId(result: EngineResult): string | null {
  if (result.status === "paused") return result.pendingNodeIds?.join(",") ?? null;
  return result.currentNodeId ?? null;
}

async function persistResult(runId: string, result: EngineResult) {
  await db
    .update(workflowRuns)
    .set({
      status: result.status,
      context: result.context,
      currentNodeId: resultCurrentNodeId(result),
      error: result.error ?? null,
      updatedAt: new Date(),
    })
    .where(eq(workflowRuns.id, runId));
}

// ---------------------------------------------------------------------------
// 入队：HTTP 请求只负责登记意图，立即返回；实际执行由 worker 消费队列完成。
// ---------------------------------------------------------------------------

export type EnqueueResult = { id: string; status: "queued" };

/**
 * 解析本次触发应运行的 graph 与锁定的版本号。
 * - draft（编辑器调试）：跑当前草稿，versionNumber 记为 null；
 * - 正式运行：优先已发布版本，其次最新快照（兼容未发布过的存量工作流），都没有则跑草稿。
 * 执行与运行前校验都必须用这里返回的 graph，保证“校验的”和“跑的”是同一份。
 */
export async function resolveTriggerGraph(
  workflowId: string,
  draft: boolean,
): Promise<{ graph: WorkflowGraph; versionNumber: number | null } | null> {
  const workflow = await getWorkflow(workflowId);
  if (!workflow) return null;
  if (!draft) {
    const versionNumber =
      workflow.publishedVersionNumber ?? (await getLatestVersionNumber(workflowId)) ?? 0;
    if (versionNumber > 0) {
      const version = await getWorkflowVersion(workflowId, versionNumber);
      if (version) return { graph: version.graph as WorkflowGraph, versionNumber };
    }
  }
  return { graph: workflow.graph as WorkflowGraph, versionNumber: null };
}

export async function enqueueWorkflowRun(
  workflowId: string,
  input: string,
  stepMode = false,
  opts: { draft?: boolean } = {},
): Promise<EnqueueResult> {
  const resolved = await resolveTriggerGraph(workflowId, opts.draft === true);
  if (!resolved) throw new Error("Workflow not found");

  const runId = createId();
  await db.insert(workflowRuns).values({
    id: runId,
    workflowId,
    status: "queued",
    input,
    context: {},
    versionNumber: resolved.versionNumber,
  });
  await enqueueJob(runId, "trigger", { stepMode });

  return { id: runId, status: "queued" };
}

export async function enqueueResumeRun(runId: string, input: string): Promise<EnqueueResult | null> {
  const data = await getWorkflowRun(runId);
  if (!data || data.run.status !== "waiting_for_input" || !data.run.currentNodeId) return null;

  // 恢复点在入队时捕获：状态即将变为 queued，执行时无法再依据状态判断
  await enqueueJob(runId, "resume", { input, resumeFromNodeId: data.run.currentNodeId });
  await db
    .update(workflowRuns)
    .set({ status: "queued", updatedAt: new Date() })
    .where(eq(workflowRuns.id, runId));

  return { id: runId, status: "queued" };
}

export async function enqueueRetryRun(runId: string, nodeId: string): Promise<EnqueueResult | null> {
  const data = await getWorkflowRun(runId);
  if (!data || data.run.status !== "failed") return null;

  await enqueueJob(runId, "retry", { nodeId });
  await db
    .update(workflowRuns)
    .set({ status: "queued", error: null, updatedAt: new Date() })
    .where(eq(workflowRuns.id, runId));

  return { id: runId, status: "queued" };
}

/** 单步调试：从 paused 状态继续执行下一批节点（stepMode=true）或直接跑完（stepMode=false）。 */
export async function enqueueStepRun(runId: string, stepMode: boolean): Promise<EnqueueResult | null> {
  const data = await getWorkflowRun(runId);
  if (!data || data.run.status !== "paused" || !data.run.currentNodeId) return null;

  await enqueueJob(runId, "step", {
    stepMode,
    startNodeIds: data.run.currentNodeId.split(",").filter(Boolean),
  });
  await db
    .update(workflowRuns)
    .set({ status: "queued", updatedAt: new Date() })
    .where(eq(workflowRuns.id, runId));

  return { id: runId, status: "queued" };
}

// ---------------------------------------------------------------------------
// 执行：由 worker 调用，不在 HTTP 请求生命周期内。
// ---------------------------------------------------------------------------

/**
 * 执行一个已领取的作业。引擎内部会捕获节点异常并返回 failed，
 * 因此这里只在「运行/工作流已不存在」这类前置条件失败时抛错。
 */
export async function executeRunJob(job: Pick<ClaimedJob, "runId" | "kind" | "payload">): Promise<EngineResult> {
  const data = await getWorkflowRun(job.runId);
  if (!data) throw new Error(`Workflow run ${job.runId} not found`);

  const workflow = await getWorkflow(data.run.workflowId);
  if (!workflow) throw new Error(`Workflow ${data.run.workflowId} not found`);

  await db
    .update(workflowRuns)
    .set({ status: "running", updatedAt: new Date() })
    .where(eq(workflowRuns.id, job.runId));

  const callbacks = makeCallbacks(job.runId, workflow.userId);
  // versionNumber 非空则锁定执行入队时的版本快照（resume/retry/step 也能拿到同一份图）；
  // 为 null（草稿调试）或快照已被清理时，回退到当前草稿。
  let graph = workflow.graph as WorkflowGraph;
  if (data.run.versionNumber != null) {
    const version = await getWorkflowVersion(workflow.id, data.run.versionNumber);
    if (version) graph = version.graph as WorkflowGraph;
  }
  const existingContext = (data.run.context ?? {}) as ExecutionContext;
  const payload = job.payload ?? {};

  let result: EngineResult;
  switch (job.kind) {
    case "trigger":
      result = await executeWorkflow(graph, data.run.input, callbacks, {
        stepMode: payload.stepMode === true,
        nodeTimeoutMs: NODE_TIMEOUT_MS,
      });
      break;
    case "resume":
      result = await executeWorkflow(graph, data.run.input, callbacks, {
        resumeFromNodeId: String(payload.resumeFromNodeId ?? ""),
        resumeInput: String(payload.input ?? ""),
        existingContext,
        nodeTimeoutMs: NODE_TIMEOUT_MS,
      });
      break;
    case "retry":
      result = await executeWorkflow(graph, data.run.input, callbacks, {
        retryNodeId: String(payload.nodeId ?? ""),
        existingContext,
        nodeTimeoutMs: NODE_TIMEOUT_MS,
      });
      break;
    case "step":
      result = await executeWorkflow(graph, data.run.input, callbacks, {
        startNodeIds: Array.isArray(payload.startNodeIds) ? (payload.startNodeIds as string[]) : [],
        existingContext,
        stepMode: payload.stepMode === true,
        nodeTimeoutMs: NODE_TIMEOUT_MS,
      });
      break;
  }

  await persistResult(job.runId, result);
  return result;
}

/** 执行前置校验失败时，把运行标记为 failed，避免永久停在 queued。 */
export async function markRunFailed(runId: string, error: string) {
  await db
    .update(workflowRuns)
    .set({ status: "failed", error, updatedAt: new Date() })
    .where(eq(workflowRuns.id, runId));
}

// ---------------------------------------------------------------------------
// 读取
// ---------------------------------------------------------------------------

export async function getWorkflowRun(id: string) {
  const [run] = await db.select().from(workflowRuns).where(eq(workflowRuns.id, id));
  if (!run) return null;
  const stepLogs = await db
    .select()
    .from(workflowStepLogs)
    .where(eq(workflowStepLogs.runId, id));
  return { run, stepLogs };
}

export async function listWorkflowRuns(workflowId: string) {
  return db
    .select()
    .from(workflowRuns)
    .where(eq(workflowRuns.workflowId, workflowId))
    .orderBy(desc(workflowRuns.createdAt));
}

/**
 * 待办收件箱：某用户名下所有卡在“等待人工输入”的运行，跨工作流聚合。
 * join workflows 同时完成权限隔离与拿工作流名称。
 */
export async function listPendingInputRuns(userId: string) {
  return db
    .select({
      id: workflowRuns.id,
      workflowId: workflowRuns.workflowId,
      workflowName: workflows.name,
      input: workflowRuns.input,
      currentNodeId: workflowRuns.currentNodeId,
      updatedAt: workflowRuns.updatedAt,
    })
    .from(workflowRuns)
    .innerJoin(workflows, eq(workflowRuns.workflowId, workflows.id))
    .where(and(eq(workflows.userId, userId), eq(workflowRuns.status, "waiting_for_input")))
    .orderBy(desc(workflowRuns.updatedAt));
}

function makeCallbacks(runId: string, userId: string): EngineCallbacks {
  return {
    async callAgent(agentId: string, prompt: string): Promise<string> {
      const agent = await getAgent(agentId);
      if (!agent) throw new Error(`Agent ${agentId} not found`);
      const globalConfig = await getProviderConfig(userId);
      const provider = resolveProviderConfig(agent.model, globalConfig);
      // 工作流中的 Agent 节点同样注入其关联知识库，与对话场景保持一致
      const ragContext = await retrieveAgentRagContext(agent.id, prompt, globalConfig);
      const baseMessages = [
        ...(agent.systemPrompt ? [{ role: "system" as const, content: agent.systemPrompt }] : []),
        { role: "user" as const, content: prompt },
      ];
      const messages = injectRagContext(baseMessages, ragContext);
      return generateAgentReply(provider, messages, {
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
        topP: agent.topP,
      });
    },
    async onStepStart(nodeId, nodeType, input) {
      await db.insert(workflowStepLogs).values({
        runId,
        nodeId,
        nodeType,
        input,
        status: "running",
      });
    },
    async onStepComplete(nodeId, output) {
      const [log] = await db
        .select()
        .from(workflowStepLogs)
        .where(
          and(
            eq(workflowStepLogs.runId, runId),
            eq(workflowStepLogs.nodeId, nodeId),
            eq(workflowStepLogs.status, "running")
          )
        )
        .orderBy(desc(workflowStepLogs.startedAt))
        .limit(1);
      if (log) {
        await db
          .update(workflowStepLogs)
          .set({ output, status: "completed", completedAt: new Date() })
          .where(eq(workflowStepLogs.id, log.id));
      }
    },
    async onStepFail(nodeId, error) {
      const [log] = await db
        .select()
        .from(workflowStepLogs)
        .where(
          and(
            eq(workflowStepLogs.runId, runId),
            eq(workflowStepLogs.nodeId, nodeId),
            eq(workflowStepLogs.status, "running")
          )
        )
        .orderBy(desc(workflowStepLogs.startedAt))
        .limit(1);
      if (log) {
        await db
          .update(workflowStepLogs)
          .set({ output: error, status: "failed", completedAt: new Date() })
          .where(eq(workflowStepLogs.id, log.id));
      }
    },
    async onRunUpdate() {},
  };
}
