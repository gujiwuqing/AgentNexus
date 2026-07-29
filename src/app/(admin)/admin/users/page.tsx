"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentAvatar } from "@/components/agents/agent-avatar";

type AdminUser = {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: "user" | "admin" | "superAdmin";
  agentCount: number;
  conversationCount: number;
  createdAt: string;
};

function roleBadgeKey(role: string): string {
  return role === "superAdmin" ? "roleSuperAdmin" : role === "admin" ? "roleAdmin" : "roleUser";
}

export default function AdminUsersPage() {
  const t = useTranslations("admin");
  const { data, isLoading } = useQuery<AdminUser[]>({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      return res.json();
    },
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 lg:px-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{t("users")}</h1>
        <Button asChild>
          <Link href="/admin/users/new">
            <Plus className="h-4 w-4" />
            {t("createUser")}
          </Link>
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {data && (
        <div className="rounded-lg border divide-y">
          {data.map((u) => (
            <Link
              key={u.id}
              href={`/admin/users/${u.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
            >
              <AgentAvatar avatar={u.avatar} className="h-8 w-8 text-base shrink-0" iconClassName="h-4 w-4" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{u.name}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                <span>{u.agentCount} {t("agents")}</span>
                <span>{u.conversationCount} {t("conversations")}</span>
              </div>
              <Badge variant="secondary">{t(roleBadgeKey(u.role))}</Badge>
            </Link>
          ))}
          {data.length === 0 && <p className="px-4 py-8 text-sm text-muted-foreground text-center">{t("noData")}</p>}
        </div>
      )}
    </div>
  );
}
