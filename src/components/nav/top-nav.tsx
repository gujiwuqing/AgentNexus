import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ThemeToggle } from "./theme-toggle";
import { LocaleSwitcher } from "./locale-switcher";

export async function TopNav() {
  const t = await getTranslations("nav");

  return (
    <nav className="h-12 border-b flex items-center px-4 text-sm">
      <div className="flex items-center gap-4 flex-1">
        <Link href="/chat" className="font-semibold">
          AgentNexus
        </Link>
        <Link href="/agents" className="text-muted-foreground hover:text-foreground">
          {t("agents")}
        </Link>
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
          {t("dashboard")}
        </Link>
        <Link href="/workflows" className="text-muted-foreground hover:text-foreground">
          {t("workflows")}
        </Link>
        <Link href="/knowledge" className="text-muted-foreground hover:text-foreground">
          {t("knowledge")}
        </Link>
        <Link href="/settings" className="text-muted-foreground hover:text-foreground">
          {t("settings")}
        </Link>
      </div>
      <div className="flex items-center gap-1">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
    </nav>
  );
}
