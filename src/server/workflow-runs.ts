import { eq, desc, and } from "drizzle-orm";
import { db } from "@/db";
import { workflowRuns, workflowStepLogs } from "@/db/schema";
import { createId } from "@/lib/id";
import { getWorkflow } from "./workflows";
import { getAgent } from "./agents";
import { getProviderConfig } from "./provider-config";
import { resolveProviderConfig } from "@/lib/ai/provider";
import { generateAgentReply } from "@/lib/ai/generate";
import { executeWorkflow, type EngineCallbacks, type EngineResult } from "@/lib/workflow/engine";
import type { WorkflowGraph, ExecutionContext } from "@/types/workflow";
import { getLatestVersionNumber } from "./workflow-versions";

/** paused 状态下 currentNodeId 存逗号分隔的待执行节点列表，其余状态存单个节点。 */
function resultCurrentNodeId(result: EngineResult): string | null {
  if (result.status === "paused") return result.pendingNodeIds?.join(",") ?? null;
  return result.currentNodeId ?? null;
}

export async function triggerWorkflowRun(workflowId: string, input: string, stepMode = false) {
  const workflow = await getWorkflow(workflowId);
  if (!workflow) throw new Error("Workflow not found");

  const runId = createId();
  const versionNumber = (await getLatestVersionNumber(workflowId)) || null;
  await db.insert(workflowRuns).values({ id: runId, workflowId, status: "running", input, context: {}, versionNumber });

  const callbacks = makeCallbacks(runId, workflow.userId);
  const graph = workflow.graph as WorkflowGraph;
  const result = await executeWorkflow(graph, input, callbacks, stepMode ? { stepMode } : undefined);

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

  return { id: runId, ...result };
}

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

export async function resumeWorkflowRun(runId: string, input: string) {
  const data = await getWorkflowRun(runId);
  if (!data || data.run.status !== "waiting_for_input" || !data.run.currentNodeId) return null;

  const workflow = await getWorkflow(data.run.workflowId);
  if (!workflow) return null;

  await db
    .update(workflowRuns)
    .set({ status: "running", updatedAt: new Date() })
    .where(eq(workflowRuns.id, runId));

  const callbacks = makeCallbacks(runId, workflow.userId);
  const graph = workflow.graph as WorkflowGraph;
  const result = await executeWorkflow(graph, data.run.input, callbacks, {
    resumeFromNodeId: data.run.currentNodeId,
    resumeInput: input,
    existingContext: (data.run.context ?? {}) as ExecutionContext,
  });

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

  return { id: runId, ...result };
}

/** 单步调试：从 paused 状态继续执行下一批节点（stepMode=true）或直接跑完（stepMode=false）。 */
export async function stepWorkflowRun(runId: string, stepMode: boolean) {
  const data = await getWorkflowRun(runId);
  if (!data || data.run.status !== "paused" || !data.run.currentNodeId) return null;

  const workflow = await getWorkflow(data.run.workflowId);
  if (!workflow) return null;

  await db
    .update(workflowRuns)
    .set({ status: "running", updatedAt: new Date() })
    .where(eq(workflowRuns.id, runId));

  const callbacks = makeCallbacks(runId, workflow.userId);
  const graph = workflow.graph as WorkflowGraph;
  const result = await executeWorkflow(graph, data.run.input, callbacks, {
    startNodeIds: data.run.currentNodeId.split(",").filter(Boolean),
    existingContext: (data.run.context ?? {}) as ExecutionContext,
    stepMode,
  });

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

  return { id: runId, ...result };
}

export async function retryWorkflowRun(runId: string, nodeId: string) {
  const data = await getWorkflowRun(runId);
  if (!data || data.run.status !== "failed") return null;

  const workflow = await getWorkflow(data.run.workflowId);
  if (!workflow) return null;

  await db
    .update(workflowRuns)
    .set({ status: "running", error: null, updatedAt: new Date() })
    .where(eq(workflowRuns.id, runId));

  const callbacks = makeCallbacks(runId, workflow.userId);
  const graph = workflow.graph as WorkflowGraph;
  const result = await executeWorkflow(graph, data.run.input, callbacks, {
    retryNodeId: nodeId,
    existingContext: (data.run.context ?? {}) as ExecutionContext,
  });

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

  return { id: runId, ...result };
}

function makeCallbacks(runId: string, userId: string): EngineCallbacks {
  return {
    async callAgent(agentId: string, prompt: string): Promise<string> {
      const agent = await getAgent(agentId);
      if (!agent) throw new Error(`Agent ${agentId} not found`);
      const globalConfig = await getProviderConfig(userId);
      const provider = resolveProviderConfig(agent.model, globalConfig);
      const messages = [
        ...(agent.systemPrompt ? [{ role: "system" as const, content: agent.systemPrompt }] : []),
        { role: "user" as const, content: prompt },
      ];
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
