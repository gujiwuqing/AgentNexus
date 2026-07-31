import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { createId } from "@/lib/id";

export type AssistantMessageMeta = {
  model?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  durationMs?: number | null;
  toolCalls?: Array<{
    toolName: string;
    displayName: string;
    args: Record<string, unknown>;
    result: string;
  }> | null;
  activeSkills?: Array<{ name: string; icon: string }> | null;
};

export async function listMessages(conversationId: string) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));
}

export async function getMessage(id: string) {
  const [row] = await db.select().from(messages).where(eq(messages.id, id));
  return row ?? null;
}

export async function appendUserMessage(
  conversationId: string,
  content: string,
  messageAttachments?: Array<{ id: string; filename: string; mimetype: string; size: number }> | null,
) {
  const id = createId();
  await db.insert(messages).values({
    id,
    conversationId,
    role: "user",
    content,
    attachments: messageAttachments ?? null,
  });
  return getMessage(id);
}

export async function appendAssistantMessage(
  conversationId: string,
  content: string,
  meta?: AssistantMessageMeta
) {
  const id = createId();
  await db.insert(messages).values({
    id,
    conversationId,
    role: "assistant",
    content,
    model: meta?.model ?? null,
    promptTokens: meta?.promptTokens ?? null,
    completionTokens: meta?.completionTokens ?? null,
    totalTokens: meta?.totalTokens ?? null,
    durationMs: meta?.durationMs ?? null,
    toolCalls: meta?.toolCalls ?? null,
    activeSkills: meta?.activeSkills ?? null,
  });
  return getMessage(id);
}

export async function deleteMessage(id: string) {
  const existing = await getMessage(id);
  if (!existing) return false;
  await db.delete(messages).where(eq(messages.id, id));
  return true;
}
