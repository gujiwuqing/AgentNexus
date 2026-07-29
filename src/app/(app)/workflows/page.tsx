"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useWorkflows } from "@/hooks/use-workflows";
import { WorkflowCard } from "@/components/workflow/workflow-card";
import { Button } from "@/components/ui/button";

export default function WorkflowsPage() {
  const { data: workflows, isLoading, error } = useWorkflows();
  const t = useTranslations("workflows");
  const tc = useTranslations("common");

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 lg:px-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Button asChild>
          <Link href="/workflows/new">{t("new")}</Link>
        </Button>
      </div>

      {isLoading && <p>{tc("loading")}</p>}
      {error && <p className="text-destructive">{t("loadError", { message: error.message })}</p>}
      {workflows && workflows.length === 0 && (
        <p className="text-muted-foreground">{t("empty")}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {workflows?.map((workflow) => (
          <WorkflowCard key={workflow.id} workflow={workflow} />
        ))}
      </div>
    </div>
  );
}
