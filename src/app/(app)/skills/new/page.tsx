"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { SkillForm } from "@/components/skills/skill-form";
import { useCreateSkill } from "@/hooks/use-skills";

export default function NewSkillPage() {
  const router = useRouter();
  const createSkill = useCreateSkill();
  const t = useTranslations("skills");

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 lg:px-10 animate-in fade-in duration-300">
      <h1 className="text-2xl font-semibold mb-8">{t("new")}</h1>
      <SkillForm
        submitLabel={t("create")}
        isSubmitting={createSkill.isPending}
        onCancel={() => router.push("/skills")}
        onSubmit={(values) =>
          createSkill.mutate(values, {
            onSuccess: (created) => router.push(`/skills/${created.id}`),
            onError: (err) => toast.error(err.message),
          })
        }
      />
    </div>
  );
}
