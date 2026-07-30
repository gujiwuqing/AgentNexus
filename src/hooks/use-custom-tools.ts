"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CustomTool, CustomToolFormValues } from "@/types/custom-tool";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function useCustomTools() {
  return useQuery({ queryKey: ["custom-tools"], queryFn: () => fetchJson<CustomTool[]>("/api/custom-tools") });
}

export function useCustomTool(id: string) {
  return useQuery({
    queryKey: ["custom-tools", id],
    queryFn: () => fetchJson<CustomTool>(`/api/custom-tools/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateCustomTool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomToolFormValues) =>
      fetchJson<CustomTool>("/api/custom-tools", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["custom-tools"] }),
  });
}

export function useUpdateCustomTool(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CustomToolFormValues>) =>
      fetchJson<CustomTool>(`/api/custom-tools/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-tools"] });
      queryClient.invalidateQueries({ queryKey: ["custom-tools", id] });
    },
  });
}

export function useDeleteCustomTool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJson<void>(`/api/custom-tools/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["custom-tools"] }),
  });
}

export function useAgentCustomTools(agentId: string) {
  return useQuery({
    queryKey: ["agent-custom-tools", agentId],
    queryFn: () => fetchJson<CustomTool[]>(`/api/agents/${agentId}/custom-tools`),
    enabled: !!agentId,
  });
}

export function useSetAgentCustomTools(agentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (toolIds: string[]) =>
      fetchJson<void>(`/api/agents/${agentId}/custom-tools`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ toolIds }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agent-custom-tools", agentId] }),
  });
}
