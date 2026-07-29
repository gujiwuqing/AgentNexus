"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MessagesSquare, Bot, Workflow, BookOpen, LayoutDashboard, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "agentnexus:onboarded";

const ITEMS = [
  { key: "chat", icon: MessagesSquare },
  { key: "agents", icon: Bot },
  { key: "workflows", icon: Workflow },
  { key: "knowledge", icon: BookOpen },
  { key: "dashboard", icon: LayoutDashboard },
] as const;

export function OnboardingDialog() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("onboarding");

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      // localStorage unavailable, skip onboarding silently
    }
  }, []);

  function handleClose() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="h-10 w-10 rounded-xl brand-gradient flex items-center justify-center mb-2">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-md bg-brand/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-brand" />
                </div>
                <div>
                  <p className="text-sm font-medium">{t(`items.${item.key}.title`)}</p>
                  <p className="text-xs text-muted-foreground">{t(`items.${item.key}.description`)}</p>
                </div>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button onClick={handleClose} className="w-full">
            {t("cta")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
