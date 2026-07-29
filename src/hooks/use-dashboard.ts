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
