"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Skill } from "@/types/skill";

export function SkillCard({ skill }: { skill: Skill }) {
  const t = useTranslations("skills");

  return (
    <Link href={`/skills/${skill.id}`}>
      <Card className="hover:border-primary hover:shadow-md transition-all cursor-pointer h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl shrink-0">{skill.icon || "⚡"}</span>
            {skill.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {skill.description || t("noDescription")}
          </p>
          <div className="flex gap-1 mt-2 flex-wrap">
            {skill.category && (
              <Badge variant="outline">{skill.category}</Badge>
            )}
            {skill.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
