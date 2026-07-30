"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CustomTool } from "@/types/custom-tool";

export function ToolCard({ tool }: { tool: CustomTool }) {
  const t = useTranslations("customTools");

  return (
    <Link href={`/tools/${tool.id}`}>
      <Card className="hover:border-primary hover:shadow-md transition-all cursor-pointer h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl shrink-0">{tool.icon || "🔧"}</span>
            <span className="truncate">{tool.displayName || tool.name}</span>
            <Badge
              variant={tool.type === "http" ? "default" : "secondary"}
              className="ml-auto shrink-0 text-[10px] uppercase"
            >
              {tool.type === "http" ? "HTTP" : "Prompt"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <p className="text-xs text-muted-foreground font-mono mb-1">{tool.name}</p>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {tool.description || t("noDescription")}
          </p>
          <div className="flex gap-1 mt-2 flex-wrap">
            {tool.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
