"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useCreateKnowledgeBase } from "@/hooks/use-knowledge";

export default function NewKnowledgePage() {
  const router = useRouter();
  const createKB = useCreateKnowledgeBase();
  const t = useTranslations("knowledge");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [chunkSize, setChunkSize] = useState(500);
  const [chunkOverlap, setChunkOverlap] = useState(50);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createKB.mutate(
      { name: name.trim(), description: description.trim(), chunkSize, chunkOverlap },
      { onSuccess: (kb) => router.push(`/knowledge/${kb.id}`) }
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 lg:px-10">
      <h1 className="text-2xl font-semibold mb-8">{t("new")}</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">{t("name")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t("description")}</Label>
            <Textarea
              id="description"
              rows={1}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="chunkSize">{t("chunkSize")}</Label>
            <Input
              id="chunkSize"
              type="number"
              min={100}
              max={2000}
              value={chunkSize}
              onChange={(e) => setChunkSize(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chunkOverlap">{t("chunkOverlap")}</Label>
            <Input
              id="chunkOverlap"
              type="number"
              min={0}
              max={500}
              value={chunkOverlap}
              onChange={(e) => setChunkOverlap(Number(e.target.value))}
            />
          </div>
        </div>
        <div className="flex items-center gap-4 pt-2 border-t">
          <Button type="submit" disabled={createKB.isPending || !name.trim()}>
            {createKB.isPending ? t("creating") : t("create")}
          </Button>
        </div>
      </form>
    </div>
  );
}
