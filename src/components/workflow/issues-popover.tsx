"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GraphIssue } from "@/lib/workflow/validate-graph";

/**
 * 顶部工具栏的校验状态入口：无问题时显示绿色通过，有问题时可展开逐条查看。
 * 校验不阻断保存，只在运行前由后端拦截。
 */
export function IssuesPopover({ issues }: { issues: GraphIssue[] }) {
  const t = useTranslations("workflowExt.validation");
  const [open, setOpen] = useState(false);

  if (issues.length === 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-success mr-1">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {t("allGood")}
      </span>
    );
  }

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="ghost"
        className="h-8 cursor-pointer gap-1 text-amber-600 hover:text-amber-600"
        onClick={() => setOpen((v) => !v)}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        {t("issueCount", { count: issues.length })}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 w-80 rounded-lg border bg-popover shadow-md p-2">
            <p className="text-xs text-muted-foreground px-2 py-1">{t("hint")}</p>
            <div className="max-h-64 overflow-y-auto space-y-1 mt-1">
              {issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-2 rounded-md px-2 py-1.5 text-xs bg-muted/40">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
                  <div className="min-w-0">
                    {issue.nodeLabel && (
                      <p className="font-medium truncate">{issue.nodeLabel}</p>
                    )}
                    <p className="text-muted-foreground">{t(`codes.${issue.code}`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
