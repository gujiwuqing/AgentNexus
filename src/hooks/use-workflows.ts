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

export function useWorkflowRuns(workflowId: string) {
  return useQuery({
    queryKey: ["workflows", workflowId, "runs"],
    queryFn: () => fetchJson<{ id: string; status: string; input: string; versionNumber: number | null; createdAt: string }[]>(
      `/api/workflows/${workflowId}/runs`
    ),
    enabled: Boolean(workflowId),
  });
}

export function useWorkflowRunDetail(runId: string) {
  return useQuery({
    queryKey: ["workflow-runs", runId],
    queryFn: () => fetchJson<WorkflowRunDetail>(`/api/workflow-runs/${runId}`),
    enabled: Boolean(runId),
  });
}

export function useTriggerRun(workflowId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, stepMode }: { input: string; stepMode?: boolean }) =>
      fetchJson<{ id: string; status: string; context: Record<string, string> }>(
        `/api/workflows/${workflowId}/runs`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ input, stepMode: stepMode ?? false }),
        }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflows", workflowId, "runs"] }),
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
    onSuccess: (_, { runId }) => qc.invalidateQueries({ queryKey: ["workflow-runs", runId] }),
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
