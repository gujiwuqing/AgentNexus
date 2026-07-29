import { eq } from "drizzle-orm";
import { db } from "@/db";
import { aiProviderConfig } from "@/db/schema";
import { createId } from "@/lib/id";
import type { ProviderConfigInput } from "@/lib/validation/provider";

export async function getProviderConfig(userId: string) {
  const [row] = await db.select().from(aiProviderConfig).where(eq(aiProviderConfig.userId, userId));
  return row ?? null;
}

export async function upsertProviderConfig(input: ProviderConfigInput, userId: string) {
  await db.delete(aiProviderConfig).where(eq(aiProviderConfig.userId, userId));
  const id = createId();
  await db.insert(aiProviderConfig).values({ ...input, id, userId });
  return getProviderConfig(userId);
}
