import Link from "next/link";
import { useTranslations } from "next-intl";
import { BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KnowledgeBase } from "@/types/knowledge";

export function KnowledgeCard({ kb }: { kb: KnowledgeBase }) {
  const t = useTranslations("knowledge");

  return (
    <Link href={`/knowledge/${kb.id}`}>
      <Card className="hover:border-primary hover:shadow-md transition-all cursor-pointer h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {kb.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {kb.description || t("noDescription")}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
