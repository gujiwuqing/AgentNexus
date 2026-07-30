"use client";

import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { SkillForm } from "@/components/skills/skill-form";
import { useSkill, useUpdateSkill } from "@/hooks/use-skills";
import { PageFormSkeleton } from "@/components/ui/page-skeleton";
import { DeleteSkillButton } from "@/components/skills/delete-skill-button";
import { Breadcrumb } from "@/components/nav/breadcrumb";

export default function SkillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: skill, isLoading } = useSkill(id);
  const updateSkill = useUpdateSkill(id);
  const t = useTranslations("skills");

  if (isLoading) return <PageFormSkeleton />;
  if (!skill) return <div className="p-8">{t("notFound")}</div>;

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 lg:px-10 animate-in fade-in duration-300">
      <Breadcrumb items={[{ label: t("title"), href: "/skills" }, { label: skill.name }]} />
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">{skill.name}</h1>
        <DeleteSkillButton skillId={skill.id} />
      </div>
      <SkillForm
        skill={skill}
        submitLabel={t("saveChanges")}
        isSubmitting={updateSkill.isPending}
        onCancel={() => router.push("/skills")}
        onSubmit={(values) =>
          updateSkill.mutate(values, {
            onSuccess: () => toast.success(t("saved")),
            onError: (err) => toast.error(err.message),
          })
        }
      />
    </div>
  );
}
