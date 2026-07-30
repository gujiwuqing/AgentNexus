"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MessageSquare, Zap, DollarSign, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/stat-card";
import { TokenTrendChart } from "@/components/dashboard/token-trend-chart";
import { ModelDistributionChart } from "@/components/dashboard/model-distribution-chart";
import { AgentRankingList } from "@/components/dashboard/agent-ranking-list";
import { DrilldownDialog } from "@/components/dashboard/drilldown-dialog";
import { useDashboardStats, type DateRange, type DrilldownParams } from "@/hooks/use-dashboard";

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
  const [drilldown, setDrilldown] = useState<{ title: string; params: DrilldownParams } | null>(null);
  const t = useTranslations("dashboard");

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 lg:px-10 animate-in fade-in duration-300">
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

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-6 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-7 w-16" />
            </div>
          ))}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              title={t("totalConversations")}
              value={String(data.overview.totalConversations)}
              icon={MessageSquare}
              current={data.overview.totalConversations}
              previous={data.previousOverview.totalConversations}
              onClick={() =>
                setDrilldown({
                  title: t("drilldown.rangeTitle", { range: t(RANGE_KEYS[range]) }),
                  params: { range },
                })
              }
            />
            <StatCard
              title={t("totalMessages")}
              value={String(data.overview.totalMessages)}
              icon={BarChart3}
              current={data.overview.totalMessages}
              previous={data.previousOverview.totalMessages}
            />
            <StatCard
              title={t("totalTokens")}
              value={formatTokens(data.overview.totalTokens)}
              icon={Zap}
              current={data.overview.totalTokens}
              previous={data.previousOverview.totalTokens}
            />
            <StatCard
              title={t("estimatedCost")}
              value={`$${data.overview.estimatedCost.toFixed(4)}`}
              icon={DollarSign}
              current={data.overview.estimatedCost}
              previous={data.previousOverview.estimatedCost}
            />
          </div>

          <div className="mb-8">
            <TokenTrendChart
              data={data.tokenTrend}
              onSelectDate={(date) =>
                setDrilldown({
                  title: t("drilldown.dateTitle", { date }),
                  params: { range, date },
                })
              }
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AgentRankingList
              data={data.agentRanking}
              onSelectAgent={(agent) =>
                setDrilldown({
                  title: t("drilldown.agentTitle", { name: agent.agentName }),
                  params: { range, agentId: agent.agentId },
                })
              }
            />
            <ModelDistributionChart
              data={data.modelDistribution}
              onSelectModel={(model) =>
                setDrilldown({
                  title: t("drilldown.modelTitle", { model }),
                  params: { range, model },
                })
              }
            />
          </div>

          <DrilldownDialog
            title={drilldown?.title ?? ""}
            params={drilldown?.params ?? null}
            onClose={() => setDrilldown(null)}
          />
        </>
      )}
    </div>
  );
}
