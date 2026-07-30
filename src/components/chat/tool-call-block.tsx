"use client";

import { useState, memo } from "react";
import { useTranslations } from "next-intl";
import { Wrench, Users, ChevronDown, ChevronRight } from "lucide-react";
import { MarkdownContent } from "./markdown-content";

type ToolCallDisplay = {
  toolName: string;
  displayName: string;
  args: Record<string, unknown>;
  result: string;
};

function DelegationChain({ delegations }: { delegations: ToolCallDisplay[] }) {
  const t = useTranslations("chatExt.toolCall");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <div className="w-full border rounded-md overflow-hidden bg-muted/30">
      <div className="flex items-center gap-2 px-2.5 py-1.5 border-b bg-muted/50">
        <Users className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="text-xs font-medium">{t("delegationChain", { count: delegations.length })}</span>
      </div>
      <div className="px-2.5 py-1.5">
        {delegations.map((tc, i) => {
          const isExpanded = expandedIdx === i;
          const task = typeof tc.args?.task === "string" ? tc.args.task : JSON.stringify(tc.args);
          return (
            <div key={i} className="relative pl-6 pb-2 last:pb-0">
              {i < delegations.length - 1 && (
                <div className="absolute left-[9px] top-5 bottom-0 w-px bg-border" />
              )}
              <div className="absolute left-0 top-0.5 h-[18px] w-[18px] rounded-full brand-gradient flex items-center justify-center text-[9px] font-semibold text-white select-none">
                {i + 1}
              </div>
              <button
                type="button"
                className="w-full flex items-center gap-1.5 text-xs cursor-pointer hover:underline text-left"
                onClick={() => setExpandedIdx(isExpanded ? null : i)}
              >
                <span className="font-medium truncate">{t("delegatedTo", { name: tc.displayName })}</span>
                {isExpanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
              </button>
              <p className={`text-[11px] text-muted-foreground mt-0.5 ${isExpanded ? "whitespace-pre-wrap" : "line-clamp-2"}`}>
                {t("task")}: {task}
              </p>
              {isExpanded && (
                <div className="mt-1.5 rounded border bg-background p-2">
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1">{t("reply")}</p>
                  {tc.result ? (
                    <div className="text-xs">
                      <MarkdownContent content={tc.result} />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">-</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ToolCallBlockImpl({ toolCalls }: { toolCalls: ToolCallDisplay[] }) {
  const t = useTranslations("chatExt.toolCall");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (!toolCalls || toolCalls.length === 0) return null;

  const delegations = toolCalls.filter((tc) => tc.toolName.startsWith("delegate_to_"));
  const regularCalls = toolCalls.filter((tc) => !tc.toolName.startsWith("delegate_to_"));

  return (
    <div className="mt-2 space-y-1.5 w-full">
      {delegations.length > 0 && <DelegationChain delegations={delegations} />}
      {regularCalls.map((tc, i) => {
        const isExpanded = expandedIdx === i;
        return (
          <div key={i} className="border rounded-md text-xs bg-muted/30">
            <button
              type="button"
              className="w-full flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-muted/50"
              onClick={() => setExpandedIdx(isExpanded ? null : i)}
            >
              {isExpanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
              <Wrench className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{t("calledTool", { name: tc.displayName })}</span>
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

export const ToolCallBlock = memo(ToolCallBlockImpl);
