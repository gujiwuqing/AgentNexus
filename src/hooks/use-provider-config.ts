"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProviderConfig, ProviderConfigInput } from "@/types/provider-config";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export function useProviderConfig() {
  return useQuery({
    queryKey: ["settings", "ai-provider"],
    queryFn: () => fetchJson<ProviderConfig>("/api/settings/ai-provider"),
  });
}

export function useSaveProviderConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProviderConfigInput) =>
      fetchJson<ProviderConfig>("/api/settings/ai-provider", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings", "ai-provider"] }),
  });
}

export function useTestProviderConfig() {
  return useMutation({
    mutationFn: (input: ProviderConfigInput) =>
      fetchJson<{ success: boolean; message?: string }>("/api/settings/ai-provider/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
  });
}
