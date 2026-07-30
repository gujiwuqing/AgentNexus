import { eq, desc, and, sql, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { workflowVersions, workflows } from "@/db/schema";
import { createId } from "@/lib/id";
import { isSameGraph } from "@/lib/workflow/graph-diff";
import type { WorkflowGraph } from "@/types/workflow";

/** 每个工作流保留的历史版本上限，超出后清理最旧的。 */
export const MAX_VERSIONS_PER_WORKFLOW = 30;

export async function getLatestVersionNumber(workflowId: string): Promise<number> {
  const [row] = await db
    .select({ maxVersion: sql<number>`coalesce(max(${workflowVersions.versionNumber}), 0)` })
    .from(workflowVersions)
    .where(eq(workflowVersions.workflowId, workflowId));
  return Number(row?.maxVersion ?? 0);
}

async function getLatestVersion(workflowId: string) {
  const [row] = await db
    .select()
    .from(workflowVersions)
    .where(eq(workflowVersions.workflowId, workflowId))
    .orderBy(desc(workflowVersions.versionNumber))
    .limit(1);
  return row ?? null;
}

/** 保留最近 MAX_VERSIONS_PER_WORKFLOW 个版本，删除更旧的快照；已发布版本始终保留（正式运行依赖它）。 */
async function pruneOldVersions(workflowId: string, latestVersion: number) {
  const threshold = latestVersion - MAX_VERSIONS_PER_WORKFLOW;
  if (threshold <= 0) return;
  const [workflow] = await db
    .select({ publishedVersionNumber: workflows.publishedVersionNumber })
    .from(workflows)
    .where(eq(workflows.id, workflowId));
  const published = workflow?.publishedVersionNumber;
  await db
    .delete(workflowVersions)
    .where(
      and(
        eq(workflowVersions.workflowId, workflowId),
        lt(workflowVersions.versionNumber, threshold + 1),
        ...(published != null ? [ne(workflowVersions.versionNumber, published)] : []),
      ),
    );
}

/**
 * 创建版本快照。若 graph 与最新版本完全一致则跳过——
 * 编辑器反复点保存不应堆出一堆内容相同的版本。
 */
export async function createWorkflowVersionSnapshot(workflowId: string, graph: WorkflowGraph): Promise<number> {
  const latest = await getLatestVersion(workflowId);
  if (latest && isSameGraph(latest.graph as WorkflowGraph, graph)) {
    return latest.versionNumber;
  }

  const nextVersion = (latest?.versionNumber ?? 0) + 1;
  const id = createId();
  await db.insert(workflowVersions).values({ id, workflowId, versionNumber: nextVersion, graph });
  await pruneOldVersions(workflowId, nextVersion);
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
