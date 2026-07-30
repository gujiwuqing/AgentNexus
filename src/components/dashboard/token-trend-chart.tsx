"use client";

import { useTranslations } from "next-intl";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TrendItem = {
  date: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  messageCount: number;
};

export function TokenTrendChart({
  data,
  onSelectDate,
}: {
  data: TrendItem[];
  onSelectDate?: (date: string) => void;
}) {
  const t = useTranslations("dashboard");

  const formatted = data.map((d) => ({
    ...d,
    fullDate: d.date,
    date: d.date.slice(5),
  }));

  function handleChartClick(state: unknown) {
    const s = state as { activePayload?: Array<{ payload?: { fullDate?: string } }> } | null;
    const fullDate = s?.activePayload?.[0]?.payload?.fullDate;
    if (fullDate && onSelectDate) onSelectDate(fullDate);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("tokenTrend")}</CardTitle>
        {onSelectDate && <p className="text-xs text-muted-foreground">{t("clickDayHint")}</p>}
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formatted} onClick={handleChartClick} className={onSelectDate ? "cursor-pointer" : undefined}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--card-foreground))",
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="promptTokens"
                name={t("promptTokens")}
                stackId="1"
                stroke="hsl(var(--chart-1))"
                fill="hsl(var(--chart-1))"
                fillOpacity={0.4}
              />
              <Area
                type="monotone"
                dataKey="completionTokens"
                name={t("completionTokens")}
                stackId="1"
                stroke="hsl(var(--chart-2))"
                fill="hsl(var(--chart-2))"
                fillOpacity={0.4}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
