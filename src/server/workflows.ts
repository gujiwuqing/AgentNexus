import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { workflows } from "@/db/schema";
import { createId } from "@/lib/id";
import type { WorkflowGraph } from "@/types/workflow";
import { createWorkflowVersionSnapshot } from "./workflow-versions";

type WorkflowInput = { name: string; description: string; graph: WorkflowGraph };

export async function createWorkflow(input: WorkflowInput, userId: string) {
  const id = createId();
  await db.insert(workflows).values({ ...input, id, userId });
  return getWorkflow(id);
}

export async function listWorkflows(userId: string) {
  return db.select().from(workflows).where(eq(workflows.userId, userId));
}

export async function getWorkflow(id: string) {
  const [row] = await db.select().from(workflows).where(eq(workflows.id, id));
  return row ?? null;
}

/** 取出归属某用户的 workflow，做权限隔离校验。 */
export async function getWorkflowOwnedBy(id: string, userId: string) {
  const [row] = await db.select().from(workflows).where(and(eq(workflows.id, id), eq(workflows.userId, userId)));
  return row ?? null;
}

export async function updateWorkflow(id: string, input: Partial<WorkflowInput>, userId: string) {
  const existing = await getWorkflowOwnedBy(id, userId);
  if (!existing) return null;
  await db
    .update(workflows)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(workflows.id, id));
  if (input.graph) {
    await createWorkflowVersionSnapshot(id, input.graph);
  }
  return getWorkflow(id);
}

export async function deleteWorkflow(id: string, userId: string) {
  const existing = await getWorkflowOwnedBy(id, userId);
  if (!existing) return false;
  await db.delete(workflows).where(eq(workflows.id, id));
  return true;
}
