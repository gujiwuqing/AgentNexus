import { eq } from "drizzle-orm";
import { db } from "@/db";
import { attachments } from "@/db/schema";
import { createId } from "@/lib/id";

export type CreateAttachmentInput = {
  filename: string;
  mimetype: string;
  size: number;
  storagePath: string;
};

export async function createAttachment(input: CreateAttachmentInput) {
  const id = createId();
  await db.insert(attachments).values({ id, ...input });
  return getAttachment(id);
}

export async function getAttachment(id: string) {
  const [row] = await db.select().from(attachments).where(eq(attachments.id, id));
  return row ?? null;
}

export async function getAttachmentsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const results = await Promise.all(ids.map((id) => getAttachment(id)));
  return results.filter(Boolean);
}

export async function linkAttachmentToMessage(attachmentId: string, messageId: string) {
  await db
    .update(attachments)
    .set({ messageId })
    .where(eq(attachments.id, attachmentId));
}

export async function deleteAttachment(id: string) {
  const existing = await getAttachment(id);
  if (!existing) return null;
  await db.delete(attachments).where(eq(attachments.id, id));
  return existing;
}
