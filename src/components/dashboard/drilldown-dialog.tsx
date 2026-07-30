"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { MessageSquare, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentAvatar } from "@/components/agents/agent-avatar";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { useDashboardDrilldown, type DrilldownParams } from "@/hooks/use-dashboard";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function DrilldownDialog({
  title,
  params,
  onClose,
}: {
  title: string;
  params: DrilldownParams | null;
  onClose: () => void;
}) {
  const t = useTranslations("dashboard.drilldown");
  const locale = useLocale();
  const router = useRouter();
  const { data: rows, isLoading, isError } = useDashboardDrilldown(params);

  return (
    <Dialog open={params != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {rows ? t("summary", { count: rows.length }) : t("description")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto -mx-2 px-2">
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          )}
          {isError && <p className="text-sm text-destructive py-4">{t("loadError")}</p>}
          {rows && rows.length === 0 && (
            <div className="py-10 text-center">
              <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">{t("empty")}</p>
            </div>
          )}
          {rows && rows.length > 0 && (
            <div className="space-y-1">
              {rows.map((row) => (
                <button
                  key={row.conversationId}
                  type="button"
                  className="w-full flex items-center gap-3 rounded-md px-2 py-2.5 text-left cursor-pointer hover:bg-muted/60 transition-colors"
                  onClick={() => {
                    onClose();
                    router.push(`/chat/${row.agentId}/${row.conversationId}`);
                  }}
                >
                  <AgentAvatar avatar={row.avatar} className="h-8 w-8 text-lg shrink-0" iconClassName="h-4 w-4" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{row.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {row.agentName} · {t("msgCount", { count: row.messageCount })} · {formatTokens(row.totalTokens)} tokens
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatRelativeTime(row.lastMessageAt, locale)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
