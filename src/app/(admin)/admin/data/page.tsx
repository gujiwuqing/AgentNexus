"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

type Row = { id: string; name?: string; title?: string; description?: string; ownerEmail: string; ownerName: string; createdAt: string };

function Section({ heading, endpoint }: { heading: string; endpoint: string }) {
  const { data, isLoading } = useQuery<Row[]>({
    queryKey: ["admin", "data", endpoint],
    queryFn: async () => {
      const res = await fetch(endpoint);
      return res.json();
    },
  });

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">{heading}</h2>
      <div className="rounded-lg border divide-y">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        {data?.map((row) => (
          <div key={row.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{row.name ?? row.title ?? "—"}</p>
              {row.description && <p className="text-xs text-muted-foreground truncate">{row.description}</p>}
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{row.ownerName}</span>
          </div>
        ))}
        {data && data.length === 0 && <p className="px-4 py-6 text-sm text-muted-foreground text-center">No data</p>}
      </div>
    </section>
  );
}

export default function AdminDataPage() {
  const t = useTranslations("admin");
  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 lg:px-10 space-y-8">
      <h1 className="text-2xl font-semibold">{t("data")}</h1>
      <Section heading={t("agents")} endpoint="/api/admin/data/agents" />
      <Section heading={t("workflows")} endpoint="/api/admin/data/workflows" />
      <Section heading={t("knowledgeBases")} endpoint="/api/admin/data/knowledge-bases" />
      <Section heading={t("conversations")} endpoint="/api/admin/data/conversations" />
    </div>
  );
}
