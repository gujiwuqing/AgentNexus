import { db } from "@/db";
import { aiProviderConfig } from "@/db/schema";
import { createId } from "@/lib/id";
import type { ProviderConfigInput } from "@/lib/validation/provider";

export async function getProviderConfig() {
  const [row] = await db.select().from(aiProviderConfig);
  return row ?? null;
}

export async function upsertProviderConfig(input: ProviderConfigInput) {
  await db.delete(aiProviderConfig);
  const id = createId();
  await db.insert(aiProviderConfig).values({ ...input, id });
  return getProviderConfig();
}
