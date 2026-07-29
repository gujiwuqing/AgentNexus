"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useKnowledgeBases } from "@/hooks/use-knowledge";
import { KnowledgeCard } from "@/components/knowledge/knowledge-card";
import { Button } from "@/components/ui/button";

export default function KnowledgePage() {
  const { data: knowledgeBases, isLoading, error } = useKnowledgeBases();
  const t = useTranslations("knowledge");
  const tc = useTranslations("common");

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 lg:px-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Button asChild>
          <Link href="/knowledge/new">{t("new")}</Link>
        </Button>
      </div>

      {isLoading && <p>{tc("loading")}</p>}
      {error && <p className="text-destructive">{t("loadError", { message: error.message })}</p>}
      {knowledgeBases && knowledgeBases.length === 0 && (
        <p className="text-muted-foreground">{t("empty")}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {knowledgeBases?.map((kb) => (
          <KnowledgeCard key={kb.id} kb={kb} />
        ))}
      </div>
    </div>
  );
}
