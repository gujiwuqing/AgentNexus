"use client";

import { useTranslations } from "next-intl";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ModelItem = {
  model: string;
  count: number;
  totalTokens: number;
};

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function ModelDistributionChart({
  data,
  onSelectModel,
}: {
  data: ModelItem[];
  onSelectModel?: (model: string) => void;
}) {
  const t = useTranslations("dashboard");

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">{t("modelDistribution")}</CardTitle>
        {onSelectModel && <p className="text-xs text-muted-foreground">{t("clickModelHint")}</p>}
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="model"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {data.map((item, i) => (
                  <Cell
                    key={i}
                    fill={COLORS[i % COLORS.length]}
                    className={onSelectModel ? "cursor-pointer" : undefined}
                    onClick={() => onSelectModel?.(item.model)}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--card-foreground))",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
