import { useQuery } from "@tanstack/react-query";

export type DashboardStats = {
  overview: {
    totalConversations: number;
    totalMessages: number;
    totalTokens: number;
    estimatedCost: number;
  };
  previousOverview: {
    totalConversations: number;
    totalMessages: number;
    totalTokens: number;
    estimatedCost: number;
  };
  tokenTrend: Array<{
    date: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    messageCount: number;
  }>;
  agentRanking: Array<{
    agentId: string;
    agentName: string;
    avatar: string;
    totalTokens: number;
    messageCount: number;
    conversationCount: number;
  }>;
  modelDistribution: Array<{
    model: string;
    count: number;
    totalTokens: number;
  }>;
};

export type DateRange = "7d" | "30d" | "90d";

async function fetchStats(range: DateRange): Promise<DashboardStats> {
  const res = await fetch(`/api/dashboard/stats?range=${range}`);
  if (!res.ok) throw new Error("Failed to fetch dashboard stats");
  return res.json();
}

export function useDashboardStats(range: DateRange) {
  return useQuery({
    queryKey: ["dashboard", range],
    queryFn: () => fetchStats(range),
  });
}

export type DrilldownParams = {
  range: DateRange;
  agentId?: string;
  model?: string;
  date?: string;
};

export type DrilldownConversation = {
  conversationId: string;
  title: string;
  agentId: string;
  agentName: string;
  avatar: string;
  messageCount: number;
  totalTokens: number;
  lastMessageAt: string;
};

async function fetchDrilldown(params: DrilldownParams): Promise<DrilldownConversation[]> {
  const qs = new URLSearchParams({ range: params.range });
  if (params.agentId) qs.set("agentId", params.agentId);
  if (params.model) qs.set("model", params.model);
  if (params.date) qs.set("date", params.date);
  const res = await fetch(`/api/dashboard/conversations?${qs.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch drilldown conversations");
  return res.json();
}

export function useDashboardDrilldown(params: DrilldownParams | null) {
  return useQuery({
    queryKey: ["dashboard", "drilldown", params],
    queryFn: () => fetchDrilldown(params!),
    enabled: params != null,
  });
}
