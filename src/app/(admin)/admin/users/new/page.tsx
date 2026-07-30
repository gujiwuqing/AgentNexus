"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthMe } from "@/hooks/use-auth-me";

export default function NewUserPage() {
  const router = useRouter();
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const { me } = useAuthMe();
  const canElevate = me?.role === "superAdmin";

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin" | "superAdmin">("user");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, name, password, role: canElevate ? role : "user" }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success(t("createUser"));
      router.push("/admin/users");
    } else {
      const body = await res.json().catch(() => ({}));
      toast.error(body?.error?.message ?? tc("operationFailed"));
    }
  }

  return (
    <div className="w-full max-w-md mx-auto px-6 py-8 lg:px-10">
      <h1 className="text-2xl font-semibold mb-8">{t("createUser")}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t("email")}</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">{t("name")}</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t("initialPassword")}</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">{t("role")}</Label>
          <Select value={role} onValueChange={(v) => setRole(v as "user" | "admin" | "superAdmin")} disabled={!canElevate}>
            <SelectTrigger id="role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">{t("roleUser")}</SelectItem>
              {canElevate && <SelectItem value="admin">{t("roleAdmin")}</SelectItem>}
              {canElevate && <SelectItem value="superAdmin">{t("roleSuperAdmin")}</SelectItem>}
            </SelectContent>
          </Select>
          {!canElevate && <p className="text-xs text-muted-foreground">{t("roleUser")}</p>}
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Button type="submit" disabled={saving}>{saving ? tc("saving") : t("save")}</Button>
          <Button type="button" variant="outline" onClick={() => router.push("/admin/users")}>{t("cancel")}</Button>
        </div>
      </form>
    </div>
  );
}
