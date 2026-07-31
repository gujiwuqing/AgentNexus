"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Skill } from "@/types/skill";

export function SkillCard({ skill }: { skill: Skill }) {
  const t = useTranslations("skills");

  return (
    <Link
      href={`/skills/${skill.id}`}
      className="block rounded-lg border p-4 hover:border-primary/50 hover:bg-muted/30 transition-colors group"
    >
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0 text-sm group-hover:bg-primary/10">
          {skill.icon || <FileText className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium truncate">{skill.name}</h3>
            {skill.version && (
              <span className="text-[10px] text-muted-foreground font-mono">v{skill.version}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {skill.description || t("noDescription")}
          </p>
          {skill.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {skill.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
