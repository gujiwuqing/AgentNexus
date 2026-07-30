"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConfirm } from "@/components/providers/confirm-provider";
import { useAuthMe } from "@/hooks/use-auth-me";

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const confirm = useConfirm();
  const { me } = useAuthMe();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [role, setRole] = useState<"user" | "admin" | "superAdmin">("user");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const res = await fetch(`/api/admin/users/${id}`);
    if (res.ok) {
      const u = await res.json();
      setName(u.name);
      setAvatar(u.avatar ?? "");
      setRole(u.role);
    }
    setLoaded(true);
  }
  if (!loaded) {
    void load();
    setLoaded(true);
  }

  const canElevate = me?.role === "superAdmin";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload: Record<string, unknown> = { name, avatar };
    if (canElevate) payload.role = role;
    if (newPassword) payload.newPassword = newPassword;
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      toast.success(t("save"));
      router.push("/admin/users");
    } else {
      const body = await res.json().catch(() => ({}));
      toast.error(body?.error?.message ?? tc("operationFailed"));
    }
  }

  async function handleDelete() {
    const ok = await confirm({ description: t("confirmDelete"), variant: "destructive", confirmLabel: tc("delete") });
    if (!ok) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(t("delete"));
      router.push("/admin/users");
    } else {
      const body = await res.json().catch(() => ({}));
      toast.error(body?.error?.message ?? tc("operationFailed"));
    }
  }

  if (!loaded) return <div className="p-8">{tc("loading")}</div>;

  return (
    <div className="w-full max-w-md mx-auto px-6 py-8 lg:px-10">
      <h1 className="text-2xl font-semibold mb-8">{t("editUser")}</h1>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t("name")}</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="avatar">{t("avatar")}</Label>
          <Input id="avatar" value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="🧑" />
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
        </div>
        <div className="space-y-2 border-t pt-4">
          <Label htmlFor="newPassword">{t("newPassword")}</Label>
          <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t("resetPassword")} />
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Button type="submit" disabled={saving}>{saving ? tc("saving") : t("save")}</Button>
          <Button type="button" variant="outline" onClick={() => router.push("/admin/users")}>{t("cancel")}</Button>
        </div>
      </form>
      <div className="mt-8 pt-6 border-t">
        <Button variant="destructive" onClick={handleDelete}>{t("delete")}</Button>
      </div>
    </div>
  );
}
