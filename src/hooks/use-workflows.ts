"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WorkflowGraph } from "@/types/workflow";
import type { WorkflowRunDetail } from "@/types/workflow-run";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

type Workflow = {
  id: string;
  name: string;
  description: string;
  graph: WorkflowGraph;
  publishedVersionNumber: number | null;
  createdAt: string;
  updatedAt: string;
};

export function useWorkflows() {
  return useQuery({
    queryKey: ["workflows"],
    queryFn: () => fetchJson<Workflow[]>("/api/workflows"),
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: ["workflows", id],
    queryFn: () => fetchJson<Workflow>(`/api/workflows/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description: string; graph: WorkflowGraph }) =>
      fetchJson<Workflow>("/api/workflows", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflows"] }),
  });
}

export function useUpdateWorkflow(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<{ name: string; description: string; graph: WorkflowGraph }>) =>
      fetchJson<Workflow>(`/api/workflows/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflows"] });
      qc.invalidateQueries({ queryKey: ["workflows", id] });
    },
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJson<void>(`/api/workflows/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflows"] }),
  });
}

/** 运行仍在推进的状态；处于这些状态时需轮询。 */
const ACTIVE_RUN_STATUSES = new Set(["queued", "running"]);
/** 轮询间隔：工作流异步执行，前端靠轮询获取进展。 */
const RUN_POLL_MS = 1_500;

export function useWorkflowRuns(workflowId: string) {
  return useQuery({
    queryKey: ["workflows", workflowId, "runs"],
    queryFn: () => fetchJson<{ id: string; status: string; input: string; versionNumber: number | null; createdAt: string }[]>(
      `/api/workflows/${workflowId}/runs`
    ),
    enabled: Boolean(workflowId),
    refetchInterval: (query) => {
      const runs = query.state.data;
      return runs?.some((r) => ACTIVE_RUN_STATUSES.has(r.status)) ? RUN_POLL_MS : false;
    },
  });
}

export function useWorkflowRunDetail(runId: string) {
  return useQuery({
    queryKey: ["workflow-runs", runId],
    queryFn: () => fetchJson<WorkflowRunDetail>(`/api/workflow-runs/${runId}`),
    enabled: Boolean(runId),
    refetchInterval: (query) => {
      const status = query.state.data?.run.status;
      return status && ACTIVE_RUN_STATUSES.has(status) ? RUN_POLL_MS : false;
    },
  });
}

export function useTriggerRun(workflowId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, stepMode, draft }: { input: string; stepMode?: boolean; draft?: boolean }) =>
      fetchJson<{ id: string; status: string; context: Record<string, string> }>(
        `/api/workflows/${workflowId}/runs`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ input, stepMode: stepMode ?? false, draft: draft ?? false }),
        }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflows", workflowId, "runs"] }),
  });
}

/** 发布当前草稿为正式版本；正式运行将锁定该版本快照。 */
export function usePublishWorkflow(workflowId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchJson<Workflow>(`/api/workflows/${workflowId}/publish`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflows"] });
      qc.invalidateQueries({ queryKey: ["workflows", workflowId] });
    },
  });
}

export type PendingInputRun = {
  id: string;
  workflowId: string;
  workflowName: string;
  input: string;
  currentNodeId: string | null;
  updatedAt: string;
};

/** 待办收件箱：所有等待人工输入的运行。导航角标与列表共用，30s 轻量轮询。 */
export function usePendingInputRuns() {
  return useQuery({
    queryKey: ["workflow-runs", "pending"],
    queryFn: () => fetchJson<PendingInputRun[]>("/api/workflow-runs/pending"),
    refetchInterval: 30_000,
  });
}

export function useResumeRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ runId, input }: { runId: string; input: string }) =>
      fetchJson<{ id: string; status: string; context: Record<string, string> }>(
        `/api/workflow-runs/${runId}/resume`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ input }),
        }
      ),
    onSuccess: (_, { runId }) => {
      qc.invalidateQueries({ queryKey: ["workflow-runs", runId] });
      // 提交输入后该运行离开待办态，同步刷新待办收件箱/角标
      qc.invalidateQueries({ queryKey: ["workflow-runs", "pending"] });
    },
  });
}

export function useRetryRun(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nodeId: string) =>
      fetchJson<{ id: string; status: string; context: Record<string, string> }>(
        `/api/workflow-runs/${runId}/retry`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ nodeId }),
        }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflow-runs", runId] }),
  });
}

export function useStepRun(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mode: "step" | "continue") =>
      fetchJson<{ id: string; status: string; context: Record<string, string> }>(
        `/api/workflow-runs/${runId}/step`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mode }),
        }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflow-runs", runId] }),
  });
}

export function useWorkflowVersions(workflowId: string) {
  return useQuery({
    queryKey: ["workflow-versions", workflowId],
    queryFn: () =>
      fetchJson<Array<{ id: string; versionNumber: number; createdAt: string }>>(
        `/api/workflows/${workflowId}/versions`
      ),
    enabled: Boolean(workflowId),
  });
}

export type GraphDiffResult = {
  from: string;
  to: string;
  diff: {
    addedNodes: string[];
    removedNodes: string[];
    changedNodes: string[];
    addedEdges: string[];
    removedEdges: string[];
    identical: boolean;
  };
};

/** 对比某历史版本与当前图的差异。versionNumber 为 null 时不请求。 */
export function useWorkflowVersionDiff(workflowId: string, versionNumber: number | null) {
  return useQuery({
    queryKey: ["workflow-version-diff", workflowId, versionNumber],
    queryFn: () =>
      fetchJson<GraphDiffResult>(`/api/workflows/${workflowId}/versions/${versionNumber}/diff`),
    enabled: Boolean(workflowId) && versionNumber != null,
  });
}

export function useRestoreWorkflowVersion(workflowId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (versionNumber: number) =>
      fetchJson<Workflow>(`/api/workflows/${workflowId}/versions/${versionNumber}/restore`, {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflows", workflowId] });
      qc.invalidateQueries({ queryKey: ["workflow-versions", workflowId] });
    },
  });
}
