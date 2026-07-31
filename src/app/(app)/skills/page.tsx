"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Search, FileText, Plus } from "lucide-react";
import { useSkills } from "@/hooks/use-skills";
import { SkillCard } from "@/components/skills/skill-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export default function SkillsPage() {
  const { data: skills, isLoading, error } = useSkills();
  const t = useTranslations("skills");
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const skill of skills ?? []) {
      for (const tag of skill.tags) tags.add(tag);
    }
    return [...tags].sort();
  }, [skills]);

  const filtered = useMemo(() => {
    if (!skills) return skills;
    const q = search.trim().toLowerCase();
    let list = skills;
    if (q) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          s.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    if (activeTag) {
      list = list.filter((s) => s.tags.includes(activeTag));
    }
    return [...list].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [skills, search, activeTag]);

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-8 lg:px-10 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">管理可复用的技能文档，挂载到 Agent 后注入专业能力</p>
        </div>
        <Button asChild>
          <Link href="/skills/new">
            <Plus className="h-4 w-4" />
            {t("new")}
          </Link>
        </Button>
      </div>

      {skills && skills.length > 0 && (
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="pl-9"
              />
            </div>
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant={activeTag === null ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setActiveTag(null)}
              >
                {t("tagAll")}
              </Badge>
              {allTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={activeTag === tag ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-destructive">{t("loadError", { message: error.message })}</p>}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      )}

      {skills && skills.length === 0 && (
        <EmptyState
          icon={FileText}
          title={t("emptyTitle")}
          description={t("empty")}
          action={
            <Button asChild>
              <Link href="/skills/new">
                <Plus className="h-4 w-4" />
                {t("new")}
              </Link>
            </Button>
          }
        />
      )}

      {filtered && filtered.length === 0 && skills && skills.length > 0 && (
        <p className="text-muted-foreground text-sm text-center py-16">{t("noSearchResults")}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered?.map((skill) => (
          <SkillCard key={skill.id} skill={skill} />
        ))}
      </div>
    </div>
  );
}
