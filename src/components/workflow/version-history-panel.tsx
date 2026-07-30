"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { History, GitCompare, Plus, Minus, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/components/providers/confirm-provider";
import {
  useWorkflowVersions,
  useRestoreWorkflowVersion,
  useWorkflowVersionDiff,
} from "@/hooks/use-workflows";

function DiffLine({
  icon: Icon,
  label,
  items,
  tone,
}: {
  icon: typeof Plus;
  label: string;
  items: string[];
  tone: "added" | "removed" | "changed";
}) {
  if (items.length === 0) return null;
  const color =
    tone === "added" ? "text-emerald-600" : tone === "removed" ? "text-destructive" : "text-amber-600";
  return (
    <div className="flex items-start gap-1.5 text-[11px]">
      <Icon className={`h-3 w-3 shrink-0 mt-0.5 ${color}`} />
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span className="min-w-0 break-words">{items.join("、")}</span>
    </div>
  );
}

function VersionDiff({ workflowId, versionNumber }: { workflowId: string; versionNumber: number }) {
  const t = useTranslations("workflowExt.versionHistory");
  const { data, isLoading, isError } = useWorkflowVersionDiff(workflowId, versionNumber);

  if (isLoading) return <Skeleton className="h-12 w-full" />;
  if (isError) return <p className="text-[11px] text-destructive">{t("diffLoadError")}</p>;
  if (!data) return null;

  if (data.diff.identical) {
    return <p className="text-[11px] text-muted-foreground">{t("diffIdentical")}</p>;
  }

  return (
    <div className="space-y-1">
      <DiffLine icon={Plus} label={t("diffAddedNodes")} items={data.diff.addedNodes} tone="added" />
      <DiffLine icon={Minus} label={t("diffRemovedNodes")} items={data.diff.removedNodes} tone="removed" />
      <DiffLine icon={Pencil} label={t("diffChangedNodes")} items={data.diff.changedNodes} tone="changed" />
      <DiffLine icon={Plus} label={t("diffAddedEdges")} items={data.diff.addedEdges} tone="added" />
      <DiffLine icon={Minus} label={t("diffRemovedEdges")} items={data.diff.removedEdges} tone="removed" />
    </div>
  );
}

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
  const [comparing, setComparing] = useState<number | null>(null);

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
      <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
        {versions.map((v) => {
          const isComparing = comparing === v.versionNumber;
          return (
            <div key={v.id} className="rounded-md border px-3 py-2 text-sm space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="secondary" className="shrink-0">
                    {t("version", { number: v.versionNumber })}
                  </Badge>
                  <span className="text-xs text-muted-foreground truncate">
                    {new Date(v.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 cursor-pointer"
                    aria-label={t("compare")}
                    title={t("compare")}
                    onClick={() => setComparing(isComparing ? null : v.versionNumber)}
                  >
                    <GitCompare className={`h-3.5 w-3.5 ${isComparing ? "text-primary" : ""}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs cursor-pointer"
                    onClick={() => handleRestore(v.versionNumber)}
                    disabled={restore.isPending}
                  >
                    {t("restore")}
                  </Button>
                </div>
              </div>

              {isComparing && (
                <div className="border-t pt-2">
                  <p className="text-[11px] font-medium mb-1">
                    {t("diffTitle", { number: v.versionNumber })}
                  </p>
                  <VersionDiff workflowId={workflowId} versionNumber={v.versionNumber} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
