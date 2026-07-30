"use client";

import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ToolForm } from "@/components/tools/tool-form";
import { useCustomTool, useUpdateCustomTool } from "@/hooks/use-custom-tools";
import { PageFormSkeleton } from "@/components/ui/page-skeleton";
import { DeleteToolButton } from "@/components/tools/delete-tool-button";
import { Breadcrumb } from "@/components/nav/breadcrumb";

export default function ToolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: tool, isLoading } = useCustomTool(id);
  const updateTool = useUpdateCustomTool(id);
  const t = useTranslations("customTools");

  if (isLoading) return <PageFormSkeleton />;
  if (!tool) return <div className="p-8">{t("notFound")}</div>;

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 lg:px-10 animate-in fade-in duration-300">
      <Breadcrumb items={[{ label: t("title"), href: "/tools" }, { label: tool.displayName || tool.name }]} />
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">{tool.displayName || tool.name}</h1>
        <DeleteToolButton toolId={tool.id} />
      </div>
      <ToolForm
        tool={tool}
        submitLabel={t("saveChanges")}
        isSubmitting={updateTool.isPending}
        onCancel={() => router.push("/tools")}
        onSubmit={(values) =>
          updateTool.mutate(values, {
            onSuccess: () => toast.success(t("saved")),
            onError: (err) => toast.error(err.message),
          })
        }
      />
    </div>
  );
}
