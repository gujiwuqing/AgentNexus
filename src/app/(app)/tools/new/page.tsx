"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ToolForm } from "@/components/tools/tool-form";
import { useCreateCustomTool } from "@/hooks/use-custom-tools";

export default function NewToolPage() {
  const router = useRouter();
  const createTool = useCreateCustomTool();
  const t = useTranslations("customTools");

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 lg:px-10 animate-in fade-in duration-300">
      <h1 className="text-2xl font-semibold mb-8">{t("new")}</h1>
      <ToolForm
        submitLabel={t("create")}
        isSubmitting={createTool.isPending}
        onCancel={() => router.push("/tools")}
        onSubmit={(values) =>
          createTool.mutate(values, {
            onSuccess: (created) => router.push(`/tools/${created.id}`),
            onError: (err) => toast.error(err.message),
          })
        }
      />
    </div>
  );
}
