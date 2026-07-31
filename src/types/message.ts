export type Message = {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  model: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  durationMs: number | null;
  attachments: Array<{ id: string; filename: string; mimetype: string; size: number }> | null;
  toolCalls: Array<{
    toolName: string;
    displayName: string;
    args: Record<string, unknown>;
    result: string;
  }> | null;
  activeSkills: Array<{ name: string; icon: string }> | null;
  createdAt: string;
};
