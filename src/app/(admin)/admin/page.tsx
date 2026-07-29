"use client";

import { useTranslations } from "next-intl";
import { Users, Bot, MessageSquare, Workflow } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

function StatCard({ title, value, icon: Icon }: { title: string; value: number; icon: typeof Users }) {
  return (
    <div className="rounded-lg border p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold mt-1">{value}</p>
        </div>
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const t = useTranslations("admin");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-6 py-8 lg:px-10">
        <h1 className="text-2xl font-semibold mb-8">{t("overview")}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-6 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-7 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 lg:px-10">
      <h1 className="text-2xl font-semibold mb-8">{t("overview")}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t("statUsers")} value={data?.userCount ?? 0} icon={Users} />
        <StatCard title={t("statAgents")} value={data?.agentCount ?? 0} icon={Bot} />
        <StatCard title={t("statConversations")} value={data?.conversationCount ?? 0} icon={MessageSquare} />
        <StatCard title={t("statWorkflows")} value={data?.workflowCount ?? 0} icon={Workflow} />
      </div>
    </div>
  );
}
