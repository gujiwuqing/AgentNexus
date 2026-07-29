"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

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
    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
      <button
        onClick={handleCopy}
        className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted"
      >
        {copied ? t("copied") : t("copy")}
      </button>
      {role === "assistant" && isLast && onRegenerate && (
        <button
          onClick={onRegenerate}
          className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted"
        >
          {t("regenerate")}
        </button>
      )}
      {onDelete && (
        <button
          onClick={onDelete}
          className="text-xs text-muted-foreground hover:text-destructive px-1.5 py-0.5 rounded hover:bg-muted"
        >
          {t("delete")}
        </button>
      )}
    </div>
  );
}
