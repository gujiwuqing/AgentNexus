import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { evalCases, evalRuns } from "@/db/schema";
import { createId } from "@/lib/id";

export type EvalCaseInput = {
  agentId: string;
  name: string;
  input: string;
  expectedOutput?: string;
  criteria: string;
};

export async function createEvalCase(input: EvalCaseInput, userId: string) {
  const id = createId();
  await db.insert(evalCases).values({ id, userId, ...input });
  return getEvalCase(id);
}

export async function listEvalCases(agentId: string, userId: string) {
  return db.select().from(evalCases).where(and(eq(evalCases.agentId, agentId), eq(evalCases.userId, userId)));
}

export async function getEvalCase(id: string) {
  const [row] = await db.select().from(evalCases).where(eq(evalCases.id, id));
  return row ?? null;
}

export async function deleteEvalCase(id: string, userId: string) {
  const [existing] = await db.select().from(evalCases).where(and(eq(evalCases.id, id), eq(evalCases.userId, userId)));
  if (!existing) return false;
  await db.delete(evalCases).where(eq(evalCases.id, id));
  return true;
}

export type EvalRunInput = {
  caseId: string;
  actualOutput: string;
  score?: number;
  feedback?: string;
  model?: string;
  durationMs?: number;
};

export async function createEvalRun(input: EvalRunInput) {
  const id = createId();
  await db.insert(evalRuns).values({ id, ...input });
  return id;
}

export async function listEvalRuns(caseId: string) {
  return db.select().from(evalRuns).where(eq(evalRuns.caseId, caseId)).orderBy(desc(evalRuns.createdAt));
}
