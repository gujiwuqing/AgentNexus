import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreateShare(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/conversations/${conversationId}/share`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to create share");
      return res.json() as Promise<{ token: string }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversation-share", conversationId] }),
  });
}

export function useRevokeShare(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/conversations/${conversationId}/share`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke share");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversation-share", conversationId] }),
  });
}
