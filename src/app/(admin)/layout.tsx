import { redirect } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LayoutDashboard, Users, Database, ArrowLeft, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import type { SafeUser } from "@/server/users";
import { ThemeToggle } from "@/components/nav/theme-toggle";
import { LocaleSwitcher } from "@/components/nav/locale-switcher";

const NAV = [
  { href: "/admin", key: "overview", icon: LayoutDashboard },
  { href: "/admin/users", key: "users", icon: Users },
  { href: "/admin/data", key: "data", icon: Database, superAdminOnly: true },
] as const;

function Sidebar({ user }: { user: SafeUser }) {
  const t = useTranslations("admin");
  return (
    <aside className="w-56 shrink-0 h-screen border-r bg-sidebar flex flex-col">
      <div className="h-14 flex items-center gap-2 px-4 border-b border-sidebar-border">
        <div className="h-7 w-7 rounded-lg brand-gradient flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <span className="font-semibold text-sidebar-foreground">{t("title")}</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {NAV.filter((item) => !("superAdminOnly" in item && item.superAdminOnly) || user.role === "superAdmin").map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Icon className="h-4 w-4" />
              {t(item.key)}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border space-y-1">
        <Link
          href="/chat"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToApp")}
        </Link>
        <div className="flex items-center justify-between px-1 pt-1">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "user") redirect("/chat");
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col overflow-y-auto min-w-0">{children}</div>
    </div>
  );
}
