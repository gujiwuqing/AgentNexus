import { eq } from "drizzle-orm";
import { db } from "@/db";
import { messageTraces } from "@/db/schema";
import { createId } from "@/lib/id";

export type TraceInput = {
  messageId: string;
  systemPrompt?: string;
  skillsInjected?: Array<{ name: string; icon: string }>;
  toolsAvailable?: string[];
  ragContext?: string;
  summaryUsed?: string;
  modelUsed?: string;
  tokenDetails?: { input?: number; output?: number; total?: number };
  latencyMs?: number;
};

export async function createTrace(input: TraceInput) {
  const id = createId();
  await db.insert(messageTraces).values({
    id,
    messageId: input.messageId,
    systemPrompt: input.systemPrompt ?? null,
    skillsInjected: input.skillsInjected ?? null,
    toolsAvailable: input.toolsAvailable ?? null,
    ragContext: input.ragContext ?? null,
    summaryUsed: input.summaryUsed ?? null,
    modelUsed: input.modelUsed ?? null,
    tokenDetails: input.tokenDetails ?? null,
    latencyMs: input.latencyMs ?? null,
  });
  return id;
}

export async function getTraceByMessageId(messageId: string) {
  const [row] = await db.select().from(messageTraces).where(eq(messageTraces.messageId, messageId));
  return row ?? null;
}
