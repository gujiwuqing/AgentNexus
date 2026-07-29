"use client";

import { useTranslations } from "next-intl";
import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/providers/confirm-provider";
import { useWorkflowVersions, useRestoreWorkflowVersion } from "@/hooks/use-workflows";

export function VersionHistoryPanel({
  workflowId,
  onRestored,
}: {
  workflowId: string;
  onRestored: () => void;
}) {
  const t = useTranslations("workflowExt.versionHistory");
  const { data: versions } = useWorkflowVersions(workflowId);
  const restore = useRestoreWorkflowVersion(workflowId);
  const confirm = useConfirm();

  async function handleRestore(versionNumber: number) {
    const ok = await confirm({ description: t("restoreConfirm", { number: versionNumber }) });
    if (!ok) return;
    restore.mutate(versionNumber, { onSuccess: onRestored });
  }

  if (!versions || versions.length === 0) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">{t("noVersions")}</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <History className="h-4 w-4" />
        {t("heading")}
      </h3>
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {versions.map((v) => (
          <div key={v.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{t("version", { number: v.versionNumber })}</Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(v.createdAt).toLocaleString()}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="cursor-pointer"
              onClick={() => handleRestore(v.versionNumber)}
              disabled={restore.isPending}
            >
              {t("restore")}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
