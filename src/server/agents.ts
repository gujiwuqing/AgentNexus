import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agents } from "@/db/schema";
import { createId } from "@/lib/id";
import type { AgentInput, AgentUpdateInput } from "@/lib/validation/agent";

export async function createAgent(input: AgentInput) {
  const id = createId();
  await db.insert(agents).values({ ...input, id });
  return getAgent(id);
}

export async function listAgents() {
  return db.select().from(agents);
}

export async function getAgent(id: string) {
  const [row] = await db.select().from(agents).where(eq(agents.id, id));
  return row ?? null;
}

export async function updateAgent(id: string, input: AgentUpdateInput) {
  const existing = await getAgent(id);
  if (!existing) return null;
  await db
    .update(agents)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(agents.id, id));
  return getAgent(id);
}

export async function deleteAgent(id: string) {
  const existing = await getAgent(id);
  if (!existing) return false;
  await db.delete(agents).where(eq(agents.id, id));
  return true;
}
