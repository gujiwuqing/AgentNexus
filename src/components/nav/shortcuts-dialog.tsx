"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const SHORTCUTS = [
  { keys: ["Enter"], labelKey: "send" },
  { keys: ["Shift", "Enter"], labelKey: "newline" },
  { keys: ["Ctrl", "Z"], labelKey: "undo" },
  { keys: ["Ctrl", "Shift", "Z"], labelKey: "redo" },
  { keys: ["?"], labelKey: "help" },
] as const;

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded border bg-muted text-xs font-mono font-medium">{children}</kbd>
  );
}

export function ShortcutsDialog() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("shortcuts");

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (e.key === "?") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="h-10 w-10 rounded-xl brand-gradient flex items-center justify-center mb-2">
            <Keyboard className="h-5 w-5 text-white" />
          </div>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {SHORTCUTS.map((s) => (
            <div key={s.labelKey} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t(s.labelKey)}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <Kbd>{k}</Kbd>
                    {i < s.keys.length - 1 && <span className="text-muted-foreground text-xs">+</span>}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
