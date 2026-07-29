"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MessageSquare, Zap, DollarSign, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { TokenTrendChart } from "@/components/dashboard/token-trend-chart";
import { ModelDistributionChart } from "@/components/dashboard/model-distribution-chart";
import { AgentRankingList } from "@/components/dashboard/agent-ranking-list";
import { useDashboardStats, type DateRange } from "@/hooks/use-dashboard";

const RANGES: DateRange[] = ["7d", "30d", "90d"];
const RANGE_KEYS: Record<DateRange, string> = {
  "7d": "range7d",
  "30d": "range30d",
  "90d": "range90d",
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function DashboardPage() {
  const [range, setRange] = useState<DateRange>("7d");
  const { data, isLoading } = useDashboardStats(range);
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");

  if (isLoading) return <div className="p-8">{tc("loading")}</div>;

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 lg:px-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? "default" : "outline"}
              onClick={() => setRange(r)}
            >
              {t(RANGE_KEYS[r])}
            </Button>
          ))}
        </div>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              title={t("totalConversations")}
              value={String(data.overview.totalConversations)}
              icon={MessageSquare}
            />
            <StatCard
              title={t("totalMessages")}
              value={String(data.overview.totalMessages)}
              icon={BarChart3}
            />
            <StatCard
              title={t("totalTokens")}
              value={formatTokens(data.overview.totalTokens)}
              icon={Zap}
            />
            <StatCard
              title={t("estimatedCost")}
              value={`$${data.overview.estimatedCost.toFixed(4)}`}
              icon={DollarSign}
            />
          </div>

          <div className="mb-8">
            <TokenTrendChart data={data.tokenTrend} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AgentRankingList data={data.agentRanking} />
            <ModelDistributionChart data={data.modelDistribution} />
          </div>
        </>
      )}
    </div>
  );
}
