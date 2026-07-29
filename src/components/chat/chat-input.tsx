"use client";

import { useRef, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function ChatInput({
  onSend,
  onStop,
  disabled,
}: {
  onSend: (content: string) => void;
  onStop?: () => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const t = useTranslations("chatExt.input");

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 150) + "px";
  }, [value]);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  return (
    <div className="border-t p-4 flex gap-2 items-end">
      <textarea
        ref={textareaRef}
        className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={t("placeholder")}
        rows={1}
        disabled={disabled}
      />
      {disabled && onStop ? (
        <Button variant="destructive" onClick={onStop}>
          {t("stop")}
        </Button>
      ) : (
        <Button onClick={submit} disabled={disabled || !value.trim()}>
          {t("send")}
        </Button>
      )}
    </div>
  );
}
