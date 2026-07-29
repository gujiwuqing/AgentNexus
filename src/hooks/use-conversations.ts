"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Conversation } from "@/types/conversation";
import type { Message } from "@/types/message";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function useConversations(agentId: string) {
  return useQuery({
    queryKey: ["agents", agentId, "conversations"],
    queryFn: () => fetchJson<Conversation[]>(`/api/agents/${agentId}/conversations`),
    enabled: Boolean(agentId),
  });
}

export function useCreateConversation(agentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title?: string) =>
      fetchJson<Conversation>(`/api/agents/${agentId}/conversations`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agents", agentId, "conversations"] }),
  });
}

export function useRenameConversation(agentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      fetchJson<Conversation>(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title }),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["agents", agentId, "conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversations", id] });
    },
  });
}

export function useDeleteConversation(agentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJson<void>(`/api/conversations/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agents", agentId, "conversations"] }),
  });
}

export function useConversationDetail(conversationId: string) {
  return useQuery({
    queryKey: ["conversations", conversationId],
    queryFn: () =>
      fetchJson<{ conversation: Conversation; messages: Message[] }>(`/api/conversations/${conversationId}`),
    enabled: Boolean(conversationId),
  });
}
