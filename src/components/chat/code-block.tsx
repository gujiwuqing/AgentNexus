"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Check } from "lucide-react";

export function CodeBlock({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const language = className?.replace("language-", "").replace("hljs ", "").split(" ")[0] ?? "";
  const t = useTranslations("chatExt.codeBlock");

  function handleCopy() {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative group">
      <div className="absolute right-2 top-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {language && (
          <span className="text-xs text-muted-foreground">{language}</span>
        )}
        <button
          onClick={handleCopy}
          aria-label={copied ? t("copied") : t("copy")}
          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-muted hover:bg-muted-foreground/20"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? t("copied") : t("copy")}
        </button>
      </div>
      <pre className={className}>
        <code>{children}</code>
      </pre>
    </div>
  );
}
