"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { MessagesSquare, Bot, LayoutDashboard, Workflow, BookOpen, Settings, Sparkles, Menu, X } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { LocaleSwitcher } from "./locale-switcher";
import { UserMenu } from "./user-menu";
import { cn } from "@/lib/utils";
import type { SafeUser } from "@/server/users";

const NAV_ITEMS = [
  { href: "/chat", key: "chat", icon: MessagesSquare },
  { href: "/agents", key: "agents", icon: Bot },
  { href: "/workflows", key: "workflows", icon: Workflow },
  { href: "/knowledge", key: "knowledge", icon: BookOpen },
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
] as const;

function SidebarContent({ user, onNavigate }: { user: SafeUser; onNavigate?: () => void }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/chat") return pathname === "/chat" || pathname.startsWith("/chat/");
    return pathname.startsWith(href);
  }

  return (
    <>
      <div className="h-14 flex items-center gap-2 px-4 border-b border-sidebar-border shrink-0">
        <div className="h-7 w-7 rounded-lg brand-gradient flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <span className="font-semibold text-sidebar-foreground">AgentNexus</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {t(item.key)}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-1 shrink-0">
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isActive("/settings")
              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {t("settings")}
        </Link>
        <div className="flex items-center justify-between px-1 pt-1">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
        <div className="pt-2">
          <UserMenu user={user} />
        </div>
      </div>
    </>
  );
}

export function PrimarySidebar({ user }: { user: SafeUser }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations("nav");

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 h-screen border-r bg-sidebar flex-col">
        <SidebarContent user={user} />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden flex items-center gap-2 h-12 px-3 border-b bg-sidebar shrink-0">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label={t("openMenu")}
          className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="h-6 w-6 rounded-md brand-gradient flex items-center justify-center shrink-0">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="font-semibold text-sm text-sidebar-foreground">AgentNexus</span>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 w-64 h-full bg-sidebar border-r flex flex-col animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label={t("closeMenu")}
              className="absolute top-3 right-3 p-1 rounded-md hover:bg-sidebar-accent text-sidebar-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent user={user} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
