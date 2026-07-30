import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { customTools } from "@/db/schema";
import { createId } from "@/lib/id";
import type { CustomToolInput, CustomToolUpdateInput } from "@/lib/validation/custom-tool";

export async function createCustomTool(input: CustomToolInput, userId: string) {
  const id = createId();
  await db.insert(customTools).values({ ...input, id, userId });
  return getCustomTool(id);
}

export async function listCustomTools(userId: string) {
  return db.select().from(customTools).where(eq(customTools.userId, userId));
}

export async function getCustomTool(id: string) {
  const [row] = await db.select().from(customTools).where(eq(customTools.id, id));
  return row ?? null;
}

export async function getCustomToolOwnedBy(id: string, userId: string) {
  const [row] = await db.select().from(customTools).where(and(eq(customTools.id, id), eq(customTools.userId, userId)));
  return row ?? null;
}

export async function updateCustomTool(id: string, input: CustomToolUpdateInput, userId: string) {
  const existing = await getCustomToolOwnedBy(id, userId);
  if (!existing) return null;
  await db.update(customTools).set({ ...input, updatedAt: new Date() }).where(eq(customTools.id, id));
  return getCustomTool(id);
}

export async function deleteCustomTool(id: string, userId: string) {
  const existing = await getCustomToolOwnedBy(id, userId);
  if (!existing) return false;
  await db.delete(customTools).where(eq(customTools.id, id));
  return true;
}
