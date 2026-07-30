import { db } from "@/db";
import { messages, conversations, agents } from "@/db/schema";
import { sql, eq, gte, lt, and, isNotNull } from "drizzle-orm";

export type DateRange = "7d" | "30d" | "90d";

function rangeDays(range: DateRange): number {
  return range === "7d" ? 7 : range === "30d" ? 30 : 90;
}

function rangeToDate(range: DateRange): Date {
  const now = new Date();
  return new Date(now.getTime() - rangeDays(range) * 24 * 60 * 60 * 1000);
}

function previousWindow(range: DateRange): { since: Date; until: Date } {
  const until = rangeToDate(range);
  const since = new Date(until.getTime() - rangeDays(range) * 24 * 60 * 60 * 1000);
  return { since, until };
}

async function getOverviewStatsInWindow(since: Date, until: Date | null, userId: string) {
  const dateFilter = until
    ? and(gte(messages.createdAt, since), lt(messages.createdAt, until), eq(conversations.userId, userId))
    : and(gte(messages.createdAt, since), eq(conversations.userId, userId));

  const [msgStats] = await db
    .select({
      totalMessages: sql<number>`count(*)`,
      totalTokens: sql<number>`coalesce(sum(${messages.totalTokens}), 0)`,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(dateFilter);

  const [convStats] = await db
    .select({ totalConversations: sql<number>`count(distinct ${conversations.id})` })
    .from(conversations)
    .innerJoin(messages, eq(messages.conversationId, conversations.id))
    .where(dateFilter);

  return {
    totalConversations: Number(convStats?.totalConversations ?? 0),
    totalMessages: Number(msgStats?.totalMessages ?? 0),
    totalTokens: Number(msgStats?.totalTokens ?? 0),
  };
}

export async function getOverviewStats(range: DateRange, userId: string) {
  return getOverviewStatsInWindow(rangeToDate(range), null, userId);
}

export async function getPreviousOverviewStats(range: DateRange, userId: string) {
  const { since, until } = previousWindow(range);
  return getOverviewStatsInWindow(since, until, userId);
}

export async function getTokenTrend(range: DateRange, userId: string) {
  const since = rangeToDate(range);

  const rows = await db
    .select({
      date: sql<string>`DATE(${messages.createdAt})`.as("date"),
      promptTokens: sql<number>`coalesce(sum(${messages.promptTokens}), 0)`,
      completionTokens: sql<number>`coalesce(sum(${messages.completionTokens}), 0)`,
      totalTokens: sql<number>`coalesce(sum(${messages.totalTokens}), 0)`,
      messageCount: sql<number>`count(*)`,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(and(gte(messages.createdAt, since), eq(conversations.userId, userId)))
    .groupBy(sql`DATE(${messages.createdAt})`)
    .orderBy(sql`DATE(${messages.createdAt})`);

  return rows.map((r) => ({
    date: String(r.date),
    promptTokens: Number(r.promptTokens),
    completionTokens: Number(r.completionTokens),
    totalTokens: Number(r.totalTokens),
    messageCount: Number(r.messageCount),
  }));
}

export async function getAgentRanking(range: DateRange, userId: string) {
  const since = rangeToDate(range);

  const rows = await db
    .select({
      agentId: agents.id,
      agentName: agents.name,
      avatar: agents.avatar,
      totalTokens: sql<number>`coalesce(sum(${messages.totalTokens}), 0)`,
      messageCount: sql<number>`count(${messages.id})`,
      conversationCount: sql<number>`count(distinct ${conversations.id})`,
    })
    .from(agents)
    .innerJoin(conversations, eq(conversations.agentId, agents.id))
    .innerJoin(messages, eq(messages.conversationId, conversations.id))
    .where(and(gte(messages.createdAt, since), eq(conversations.userId, userId), eq(agents.userId, userId)))
    .groupBy(agents.id, agents.name, agents.avatar)
    .orderBy(sql`coalesce(sum(${messages.totalTokens}), 0) desc`)
    .limit(10);

  return rows.map((r) => ({
    agentId: r.agentId,
    agentName: r.agentName,
    avatar: r.avatar,
    totalTokens: Number(r.totalTokens),
    messageCount: Number(r.messageCount),
    conversationCount: Number(r.conversationCount),
  }));
}

export async function getModelDistribution(range: DateRange, userId: string) {
  const since = rangeToDate(range);

  const rows = await db
    .select({
      model: messages.model,
      count: sql<number>`count(*)`,
      totalTokens: sql<number>`coalesce(sum(${messages.totalTokens}), 0)`,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(and(gte(messages.createdAt, since), eq(conversations.userId, userId), isNotNull(messages.model)))
    .groupBy(messages.model)
    .orderBy(sql`count(*) desc`);

  return rows.map((r) => ({
    model: r.model ?? "unknown",
    count: Number(r.count),
    totalTokens: Number(r.totalTokens),
  }));
}

async function getCostEstimationRowsInWindow(since: Date, until: Date | null, userId: string) {
  const dateFilter = until
    ? and(gte(messages.createdAt, since), lt(messages.createdAt, until), isNotNull(messages.totalTokens), eq(conversations.userId, userId))
    : and(gte(messages.createdAt, since), isNotNull(messages.totalTokens), eq(conversations.userId, userId));

  return db
    .select({
      model: messages.model,
      promptTokens: messages.promptTokens,
      completionTokens: messages.completionTokens,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(dateFilter);
}

export async function getCostEstimationRows(range: DateRange, userId: string) {
  return getCostEstimationRowsInWindow(rangeToDate(range), null, userId);
}

export async function getPreviousCostEstimationRows(range: DateRange, userId: string) {
  const { since, until } = previousWindow(range);
  return getCostEstimationRowsInWindow(since, until, userId);
}

export type DrilldownFilter = {
  agentId?: string;
  model?: string;
  /** YYYY-MM-DD，指定后忽略 range 起点，只看当天 */
  date?: string;
};

/** 仪表盘下钻：按 Agent/模型/日期筛选时间范围内的活跃对话，按 Token 用量降序。 */
export async function getConversationDrilldown(range: DateRange, userId: string, filter: DrilldownFilter) {
  const conds = [eq(conversations.userId, userId)];

  if (filter.date) {
    conds.push(sql`DATE(${messages.createdAt}) = ${filter.date}`);
  } else {
    conds.push(gte(messages.createdAt, rangeToDate(range)));
  }
  if (filter.agentId) conds.push(eq(conversations.agentId, filter.agentId));
  if (filter.model) conds.push(eq(messages.model, filter.model));

  const rows = await db
    .select({
      conversationId: conversations.id,
      title: conversations.title,
      agentId: conversations.agentId,
      agentName: agents.name,
      avatar: agents.avatar,
      messageCount: sql<number>`count(${messages.id})`,
      totalTokens: sql<number>`coalesce(sum(${messages.totalTokens}), 0)`,
      lastMessageAt: sql<string | Date>`max(${messages.createdAt})`,
    })
    .from(conversations)
    .innerJoin(agents, eq(conversations.agentId, agents.id))
    .innerJoin(messages, eq(messages.conversationId, conversations.id))
    .where(and(...conds))
    .groupBy(conversations.id, conversations.title, conversations.agentId, agents.name, agents.avatar)
    .orderBy(sql`coalesce(sum(${messages.totalTokens}), 0) desc`)
    .limit(50);

  return rows.map((r) => ({
    conversationId: r.conversationId,
    title: r.title,
    agentId: r.agentId,
    agentName: r.agentName,
    avatar: r.avatar,
    messageCount: Number(r.messageCount),
    totalTokens: Number(r.totalTokens),
    lastMessageAt:
      r.lastMessageAt instanceof Date ? r.lastMessageAt.toISOString() : String(r.lastMessageAt),
  }));
}
