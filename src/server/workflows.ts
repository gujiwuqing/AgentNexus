import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workflows } from "@/db/schema";
import { createId } from "@/lib/id";
import type { WorkflowGraph } from "@/types/workflow";
import { createWorkflowVersionSnapshot } from "./workflow-versions";

type WorkflowInput = { name: string; description: string; graph: WorkflowGraph };

export async function createWorkflow(input: WorkflowInput) {
  const id = createId();
  await db.insert(workflows).values({ ...input, id });
  return getWorkflow(id);
}

export async function listWorkflows() {
  return db.select().from(workflows);
}

export async function getWorkflow(id: string) {
  const [row] = await db.select().from(workflows).where(eq(workflows.id, id));
  return row ?? null;
}

export async function updateWorkflow(id: string, input: Partial<WorkflowInput>) {
  const existing = await getWorkflow(id);
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

export async function deleteWorkflow(id: string) {
  const existing = await getWorkflow(id);
  if (!existing) return false;
  await db.delete(workflows).where(eq(workflows.id, id));
  return true;
}
