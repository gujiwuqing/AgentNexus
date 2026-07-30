import type { LucideIcon } from "lucide-react";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;

  if (previous === 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-green-600">
        <ArrowUp className="h-3 w-3" />
        100%
      </span>
    );
  }

  const change = ((current - previous) / previous) * 100;
  const rounded = Math.round(Math.abs(change));

  if (rounded === 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
        <Minus className="h-3 w-3" />
        0%
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex items-center gap-0.5 text-xs font-medium",
        change > 0 ? "text-green-600" : "text-destructive"
      )}
    >
      {change > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {rounded}%
    </span>
  );
}

export function StatCard({
  title,
  value,
  icon: Icon,
  current,
  previous,
  onClick,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  current?: number;
  previous?: number;
  onClick?: () => void;
}) {
  return (
    <Card
      className={cn(onClick && "cursor-pointer transition-shadow hover:shadow-md")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-semibold">{value}</p>
              {current != null && previous != null && <TrendBadge current={current} previous={previous} />}
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
