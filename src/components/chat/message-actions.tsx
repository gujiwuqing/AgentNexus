"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Check, RotateCcw, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function ActionButton({
  label,
  onClick,
  destructive,
  children,
}: {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          aria-label={label}
          className={`p-1 rounded hover:bg-muted ${destructive ? "text-muted-foreground hover:text-destructive" : "text-muted-foreground hover:text-foreground"}`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function MessageActions({
  role,
  content,
  isLast,
  onRegenerate,
  onDelete,
}: {
  role: string;
  content: string;
  isLast: boolean;
  onRegenerate?: () => void;
  onDelete?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations("chatExt.actions");

  function handleCopy() {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
      <ActionButton label={copied ? t("copied") : t("copy")} onClick={handleCopy}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </ActionButton>
      {role === "assistant" && isLast && onRegenerate && (
        <ActionButton label={t("regenerate")} onClick={onRegenerate}>
          <RotateCcw className="h-3.5 w-3.5" />
        </ActionButton>
      )}
      {onDelete && (
        <ActionButton label={t("delete")} onClick={onDelete} destructive>
          <Trash2 className="h-3.5 w-3.5" />
        </ActionButton>
      )}
    </div>
  );
}
