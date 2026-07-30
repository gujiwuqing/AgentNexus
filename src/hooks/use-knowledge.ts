import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { KnowledgeBase, KnowledgeDocument } from "@/types/knowledge";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

export function useKnowledgeBases() {
  return useQuery({ queryKey: ["knowledge-bases"], queryFn: () => fetchJson<KnowledgeBase[]>("/api/knowledge-bases") });
}

export function useKnowledgeBase(id: string) {
  return useQuery({ queryKey: ["knowledge-bases", id], queryFn: () => fetchJson<KnowledgeBase>(`/api/knowledge-bases/${id}`) });
}

export function useCreateKnowledgeBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; chunkSize?: number; chunkOverlap?: number }) => {
      const res = await fetch("/api/knowledge-bases", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
      if (!res.ok) throw new Error("Failed to create");
      return res.json() as Promise<KnowledgeBase>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["knowledge-bases"] }),
  });
}

export function useUpdateKnowledgeBase(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name?: string; description?: string; chunkSize?: number; chunkOverlap?: number }) => {
      const res = await fetch(`/api/knowledge-bases/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
      if (!res.ok) throw new Error("Failed to update");
      return res.json() as Promise<KnowledgeBase>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knowledge-bases"] });
      qc.invalidateQueries({ queryKey: ["knowledge-bases", id] });
    },
  });
}

export function useDeleteKnowledgeBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/knowledge-bases/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["knowledge-bases"] }),
  });
}

export function useKnowledgeDocuments(knowledgeBaseId: string) {
  return useQuery({
    queryKey: ["knowledge-documents", knowledgeBaseId],
    queryFn: () => fetchJson<KnowledgeDocument[]>(`/api/knowledge-bases/${knowledgeBaseId}/documents`),
    refetchInterval: (query) => {
      const docs = query.state.data;
      const hasPending = docs?.some((d) => d.status === "pending" || d.status === "processing");
      return hasPending ? 2000 : false;
    },
  });
}

export function useUploadDocument(knowledgeBaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/knowledge-bases/${knowledgeBaseId}/documents`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      return res.json() as Promise<KnowledgeDocument>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["knowledge-documents", knowledgeBaseId] }),
  });
}

export function useCreateTextDocument(knowledgeBaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, content }: { title: string; content: string }) => {
      const filename = title.endsWith(".md") ? title : `${title}.md`;
      const blob = new Blob([content], { type: "text/markdown" });
      const file = new File([blob], filename, { type: "text/markdown" });
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/knowledge-bases/${knowledgeBaseId}/documents`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Create failed");
      return res.json() as Promise<KnowledgeDocument>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["knowledge-documents", knowledgeBaseId] }),
  });
}

export function useDeleteDocument(knowledgeBaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (docId: string) => {
      const res = await fetch(`/api/knowledge-bases/${knowledgeBaseId}/documents/${docId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["knowledge-documents", knowledgeBaseId] }),
  });
}

export function useReindexDocument(knowledgeBaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (docId: string) => {
      const res = await fetch(`/api/knowledge-bases/${knowledgeBaseId}/documents/${docId}/reindex`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to reindex");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["knowledge-documents", knowledgeBaseId] }),
  });
}

export type DocumentChunk = { id: string; chunkIndex: number; content: string };

export function useDocumentChunks(knowledgeBaseId: string, docId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["knowledge-chunks", knowledgeBaseId, docId],
    queryFn: () => fetchJson<DocumentChunk[]>(`/api/knowledge-bases/${knowledgeBaseId}/documents/${docId}/chunks`),
    enabled,
  });
}

export type RetrievalTestResult = { chunkId: string; content: string; score: number; documentId: string; filename: string | null };

export function useTestRetrieval(knowledgeBaseId: string) {
  return useMutation({
    mutationFn: async ({ query, topK }: { query: string; topK?: number }) => {
      const res = await fetch(`/api/knowledge-bases/${knowledgeBaseId}/test-retrieval`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query, topK }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error?.message ?? "Retrieval test failed");
      return body.results as RetrievalTestResult[];
    },
  });
}

export function useAgentKnowledgeBases(agentId: string) {
  return useQuery({
    queryKey: ["agent-knowledge-bases", agentId],
    queryFn: () => fetchJson<Array<{ id: string; name: string; description: string }>>(`/api/agents/${agentId}/knowledge-bases`),
    enabled: !!agentId,
  });
}

export function useSetAgentKnowledgeBases(agentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (knowledgeBaseIds: string[]) => {
      const res = await fetch(`/api/agents/${agentId}/knowledge-bases`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ knowledgeBaseIds }),
      });
      if (!res.ok) throw new Error("Failed to update");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-knowledge-bases", agentId] }),
  });
}
