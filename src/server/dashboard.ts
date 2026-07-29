import { db } from "@/db";
import { messages, conversations, agents } from "@/db/schema";
import { sql, eq, gte, and, isNotNull } from "drizzle-orm";

export type DateRange = "7d" | "30d" | "90d";

function rangeToDate(range: DateRange): Date {
  const now = new Date();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export async function getOverviewStats(range: DateRange) {
  const since = rangeToDate(range);

  const [msgStats] = await db
    .select({
      totalMessages: sql<number>`count(*)`,
      totalTokens: sql<number>`coalesce(sum(${messages.totalTokens}), 0)`,
    })
    .from(messages)
    .where(gte(messages.createdAt, since));

  const [convStats] = await db
    .select({ totalConversations: sql<number>`count(distinct ${conversations.id})` })
    .from(conversations)
    .innerJoin(messages, eq(messages.conversationId, conversations.id))
    .where(gte(messages.createdAt, since));

  return {
    totalConversations: Number(convStats?.totalConversations ?? 0),
    totalMessages: Number(msgStats?.totalMessages ?? 0),
    totalTokens: Number(msgStats?.totalTokens ?? 0),
  };
}

export async function getTokenTrend(range: DateRange) {
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
    .where(gte(messages.createdAt, since))
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

export async function getAgentRanking(range: DateRange) {
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
    .where(gte(messages.createdAt, since))
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

export async function getModelDistribution(range: DateRange) {
  const since = rangeToDate(range);

  const rows = await db
    .select({
      model: messages.model,
      count: sql<number>`count(*)`,
      totalTokens: sql<number>`coalesce(sum(${messages.totalTokens}), 0)`,
    })
    .from(messages)
    .where(and(gte(messages.createdAt, since), isNotNull(messages.model)))
    .groupBy(messages.model)
    .orderBy(sql`count(*) desc`);

  return rows.map((r) => ({
    model: r.model ?? "unknown",
    count: Number(r.count),
    totalTokens: Number(r.totalTokens),
  }));
}

export async function getCostEstimationRows(range: DateRange) {
  const since = rangeToDate(range);

  return db
    .select({
      model: messages.model,
      promptTokens: messages.promptTokens,
      completionTokens: messages.completionTokens,
    })
    .from(messages)
    .where(and(gte(messages.createdAt, since), isNotNull(messages.totalTokens)));
}
