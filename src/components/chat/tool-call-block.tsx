"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Wrench, Users, ChevronDown, ChevronRight } from "lucide-react";

type ToolCallDisplay = {
  toolName: string;
  displayName: string;
  args: Record<string, unknown>;
  result: string;
};

export function ToolCallBlock({ toolCalls }: { toolCalls: ToolCallDisplay[] }) {
  const t = useTranslations("chatExt.toolCall");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div className="mt-2 space-y-1.5 w-full">
      {toolCalls.map((tc, i) => {
        const isDelegation = tc.toolName.startsWith("delegate_to_");
        const Icon = isDelegation ? Users : Wrench;
        const isExpanded = expandedIdx === i;
        return (
          <div key={i} className="border rounded-md text-xs bg-muted/30">
            <button
              type="button"
              className="w-full flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-muted/50"
              onClick={() => setExpandedIdx(isExpanded ? null : i)}
            >
              {isExpanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
              <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {isDelegation ? t("delegatedTo", { name: tc.displayName }) : t("calledTool", { name: tc.displayName })}
              </span>
            </button>
            {isExpanded && (
              <div className="px-3 pb-2 space-y-1.5 border-t">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground mt-1.5">{t("viewArgs")}</p>
                  <pre className="text-[10px] whitespace-pre-wrap bg-background rounded p-1.5 max-h-24 overflow-y-auto border">
                    {JSON.stringify(tc.args, null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground">{t("viewResult")}</p>
                  <pre className="text-[10px] whitespace-pre-wrap bg-background rounded p-1.5 max-h-24 overflow-y-auto border">
                    {tc.result || "-"}
                  </pre>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
