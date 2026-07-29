"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type TeamMemberDisplay = {
  memberAgentId: string;
  memberAgentName: string;
  memberAgentAvatar: string;
  roleDescription: string;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export function useAgentTeamMembers(agentId: string) {
  return useQuery({
    queryKey: ["agent-team-members", agentId],
    queryFn: () => fetchJson<TeamMemberDisplay[]>(`/api/agents/${agentId}/team-members`),
    enabled: Boolean(agentId),
  });
}

export function useSetAgentTeamMembers(agentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (members: Array<{ memberAgentId: string; roleDescription?: string }>) =>
      fetchJson<TeamMemberDisplay[]>(`/api/agents/${agentId}/team-members`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ members }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-team-members", agentId] }),
  });
}
