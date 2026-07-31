"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type ScheduledTask = {
  id: string;
  name: string;
  type: "agent_chat" | "workflow_run";
  targetId: string;
  input: string;
  cronExpression: string;
  enabled: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ScheduledTaskFormValues = {
  name: string;
  type: "agent_chat" | "workflow_run";
  targetId: string;
  input: string;
  cronExpression: string;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function useScheduledTasks() {
  return useQuery({ queryKey: ["scheduled-tasks"], queryFn: () => fetchJson<ScheduledTask[]>("/api/scheduled-tasks") });
}

export function useCreateScheduledTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ScheduledTaskFormValues) =>
      fetchJson<ScheduledTask>("/api/scheduled-tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled-tasks"] }),
  });
}

export function useUpdateScheduledTask(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ScheduledTaskFormValues & { enabled: number }>) =>
      fetchJson<ScheduledTask>(`/api/scheduled-tasks/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled-tasks"] }),
  });
}

export function useDeleteScheduledTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJson<void>(`/api/scheduled-tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled-tasks"] }),
  });
}
