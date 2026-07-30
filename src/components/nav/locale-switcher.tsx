"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateUserLocale } from "@/i18n/actions";
import type { Locale } from "@/i18n/locale";

const LABELS: Record<Locale, string> = {
  "zh-CN": "中文",
  en: "EN",
};

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const t = useTranslations("nav");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const next: Locale = locale === "zh-CN" ? "en" : "zh-CN";

  function toggle() {
    startTransition(async () => {
      await updateUserLocale(next);
      router.refresh();
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-9 px-2 text-xs"
      onClick={toggle}
      disabled={isPending}
      aria-label={t("switchLanguage")}
    >
      {LABELS[next]}
    </Button>
  );
}
