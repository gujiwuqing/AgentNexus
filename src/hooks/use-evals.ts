"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type EvalCase = {
  id: string;
  agentId: string;
  name: string;
  input: string;
  expectedOutput: string | null;
  criteria: string;
  createdAt: string;
};

export type EvalCaseFormValues = {
  name: string;
  input: string;
  expectedOutput?: string;
  criteria: string;
};

export type EvalRunResult = {
  caseId: string;
  name: string;
  score: number;
  feedback: string;
  output: string;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export function useEvalCases(agentId: string) {
  return useQuery({
    queryKey: ["eval-cases", agentId],
    queryFn: () => fetchJson<EvalCase[]>(`/api/agents/${agentId}/evals`),
    enabled: !!agentId,
  });
}

export function useCreateEvalCase(agentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EvalCaseFormValues) =>
      fetchJson<EvalCase>(`/api/agents/${agentId}/evals`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["eval-cases", agentId] }),
  });
}

export function useRunEvals(agentId: string) {
  return useMutation({
    mutationFn: () =>
      fetchJson<{ results: EvalRunResult[]; averageScore: number }>(`/api/agents/${agentId}/evals/run`, {
        method: "POST",
      }),
  });
}
