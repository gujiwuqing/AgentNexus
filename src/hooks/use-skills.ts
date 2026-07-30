"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Skill, SkillFormValues } from "@/types/skill";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function useSkills() {
  return useQuery({ queryKey: ["skills"], queryFn: () => fetchJson<Skill[]>("/api/skills") });
}

export function useSkill(id: string) {
  return useQuery({
    queryKey: ["skills", id],
    queryFn: () => fetchJson<Skill>(`/api/skills/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SkillFormValues) =>
      fetchJson<Skill>("/api/skills", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["skills"] }),
  });
}

export function useUpdateSkill(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<SkillFormValues>) =>
      fetchJson<Skill>(`/api/skills/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      queryClient.invalidateQueries({ queryKey: ["skills", id] });
    },
  });
}

export function useDeleteSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJson<void>(`/api/skills/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["skills"] }),
  });
}

export function useAgentSkills(agentId: string) {
  return useQuery({
    queryKey: ["agent-skills", agentId],
    queryFn: () => fetchJson<Skill[]>(`/api/agents/${agentId}/skills`),
    enabled: !!agentId,
  });
}

export function useSetAgentSkills(agentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (skillIds: string[]) =>
      fetchJson<void>(`/api/agents/${agentId}/skills`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ skillIds }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agent-skills", agentId] }),
  });
}
