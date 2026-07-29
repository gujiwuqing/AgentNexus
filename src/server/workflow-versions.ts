import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { workflowVersions } from "@/db/schema";
import { createId } from "@/lib/id";
import type { WorkflowGraph } from "@/types/workflow";

export async function getLatestVersionNumber(workflowId: string): Promise<number> {
  const [row] = await db
    .select({ maxVersion: sql<number>`coalesce(max(${workflowVersions.versionNumber}), 0)` })
    .from(workflowVersions)
    .where(eq(workflowVersions.workflowId, workflowId));
  return Number(row?.maxVersion ?? 0);
}

export async function createWorkflowVersionSnapshot(workflowId: string, graph: WorkflowGraph): Promise<number> {
  const current = await getLatestVersionNumber(workflowId);
  const nextVersion = current + 1;
  const id = createId();
  await db.insert(workflowVersions).values({ id, workflowId, versionNumber: nextVersion, graph });
  return nextVersion;
}

export async function listWorkflowVersions(workflowId: string) {
  return db
    .select({
      id: workflowVersions.id,
      versionNumber: workflowVersions.versionNumber,
      createdAt: workflowVersions.createdAt,
    })
    .from(workflowVersions)
    .where(eq(workflowVersions.workflowId, workflowId))
    .orderBy(desc(workflowVersions.versionNumber));
}

export async function getWorkflowVersion(workflowId: string, versionNumber: number) {
  const [row] = await db
    .select()
    .from(workflowVersions)
    .where(
      and(
        eq(workflowVersions.workflowId, workflowId),
        eq(workflowVersions.versionNumber, versionNumber),
      ),
    );
  return row ?? null;
}
