import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { skills } from "@/db/schema";
import { createId } from "@/lib/id";
import type { SkillInput, SkillUpdateInput } from "@/lib/validation/skill";

export async function createSkill(input: SkillInput, userId: string) {
  const id = createId();
  await db.insert(skills).values({ ...input, id, userId });
  return getSkill(id);
}

export async function listSkills(userId: string) {
  return db.select().from(skills).where(eq(skills.userId, userId));
}

export async function getSkill(id: string) {
  const [row] = await db.select().from(skills).where(eq(skills.id, id));
  return row ?? null;
}

export async function getSkillOwnedBy(id: string, userId: string) {
  const [row] = await db.select().from(skills).where(and(eq(skills.id, id), eq(skills.userId, userId)));
  return row ?? null;
}

export async function updateSkill(id: string, input: SkillUpdateInput, userId: string) {
  const existing = await getSkillOwnedBy(id, userId);
  if (!existing) return null;
  await db.update(skills).set({ ...input, updatedAt: new Date() }).where(eq(skills.id, id));
  return getSkill(id);
}

export async function deleteSkill(id: string, userId: string) {
  const existing = await getSkillOwnedBy(id, userId);
  if (!existing) return false;
  await db.delete(skills).where(eq(skills.id, id));
  return true;
}
