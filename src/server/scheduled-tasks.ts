import { eq, and, lte, asc } from "drizzle-orm";
import { db } from "@/db";
import { scheduledTasks } from "@/db/schema";
import { createId } from "@/lib/id";

export type ScheduledTaskInput = {
  name: string;
  type: "agent_chat" | "workflow_run";
  targetId: string;
  input: string;
  cronExpression: string;
};

export async function createScheduledTask(input: ScheduledTaskInput, userId: string) {
  const id = createId();
  const nextRunAt = getNextCronTime(input.cronExpression);
  await db.insert(scheduledTasks).values({ id, userId, ...input, nextRunAt });
  return getScheduledTask(id);
}

export async function listScheduledTasks(userId: string) {
  return db.select().from(scheduledTasks).where(eq(scheduledTasks.userId, userId));
}

export async function getScheduledTask(id: string) {
  const [row] = await db.select().from(scheduledTasks).where(eq(scheduledTasks.id, id));
  return row ?? null;
}

export async function updateScheduledTask(id: string, input: Partial<ScheduledTaskInput & { enabled: number }>, userId: string) {
  const [existing] = await db.select().from(scheduledTasks).where(and(eq(scheduledTasks.id, id), eq(scheduledTasks.userId, userId)));
  if (!existing) return null;
  const updates: Record<string, unknown> = { ...input, updatedAt: new Date() };
  if (input.cronExpression) {
    updates.nextRunAt = getNextCronTime(input.cronExpression);
  }
  await db.update(scheduledTasks).set(updates).where(eq(scheduledTasks.id, id));
  return getScheduledTask(id);
}

export async function deleteScheduledTask(id: string, userId: string) {
  const [existing] = await db.select().from(scheduledTasks).where(and(eq(scheduledTasks.id, id), eq(scheduledTasks.userId, userId)));
  if (!existing) return false;
  await db.delete(scheduledTasks).where(eq(scheduledTasks.id, id));
  return true;
}

export async function getDueTasks() {
  const now = new Date();
  return db.select().from(scheduledTasks).where(
    and(eq(scheduledTasks.enabled, 1), lte(scheduledTasks.nextRunAt, now))
  ).orderBy(asc(scheduledTasks.nextRunAt));
}

export async function markTaskRun(id: string, cronExpression: string) {
  const nextRunAt = getNextCronTime(cronExpression);
  await db.update(scheduledTasks).set({ lastRunAt: new Date(), nextRunAt, updatedAt: new Date() }).where(eq(scheduledTasks.id, id));
}

function getNextCronTime(cron: string): Date {
  // 简化版 cron 解析：支持 "every Xm" / "every Xh" / 具体 HH:MM
  const now = new Date();
  const minuteMatch = cron.match(/^every\s+(\d+)m$/i);
  if (minuteMatch) {
    return new Date(now.getTime() + parseInt(minuteMatch[1]) * 60 * 1000);
  }
  const hourMatch = cron.match(/^every\s+(\d+)h$/i);
  if (hourMatch) {
    return new Date(now.getTime() + parseInt(hourMatch[1]) * 60 * 60 * 1000);
  }
  // HH:MM 格式 — 下一个该时间点
  const timeMatch = cron.match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch) {
    const target = new Date(now);
    target.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]), 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    return target;
  }
  // 默认 1 小时后
  return new Date(now.getTime() + 60 * 60 * 1000);
}
