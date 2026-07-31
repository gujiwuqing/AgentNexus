"use client";

import { useQuery } from "@tanstack/react-query";

export type MessageTrace = {
  id: string;
  messageId: string;
  systemPrompt: string | null;
  skillsInjected: Array<{ name: string; icon: string }> | null;
  toolsAvailable: string[] | null;
  ragContext: string | null;
  summaryUsed: string | null;
  modelUsed: string | null;
  tokenDetails: { input?: number; output?: number; total?: number } | null;
  latencyMs: number | null;
  createdAt: string;
};

async function fetchTrace(messageId: string): Promise<MessageTrace | null> {
  const res = await fetch(`/api/messages/${messageId}/trace`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load trace");
  return res.json();
}

export function useMessageTrace(messageId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["message-trace", messageId],
    queryFn: () => fetchTrace(messageId),
    enabled,
  });
}
