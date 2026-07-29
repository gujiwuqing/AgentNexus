"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/providers/confirm-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCreateShare, useRevokeShare } from "@/hooks/use-conversation-share";

export function ShareDialog({ conversationId }: { conversationId: string }) {
  const t = useTranslations("chatExt.share");
  const createShare = useCreateShare(conversationId);
  const revokeShare = useRevokeShare(conversationId);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState<"link" | "embed" | null>(null);
  const confirm = useConfirm();

  const shareUrl = token && typeof window !== "undefined" ? `${window.location.origin}/share/${token}` : "";
  const embedCode = token
    ? `<iframe src="${shareUrl}" width="100%" height="600" frameborder="0"></iframe>`
    : "";

  async function handleGenerate() {
    const result = await createShare.mutateAsync();
    setToken(result.token);
  }

  async function handleRevoke() {
    const ok = await confirm({ description: t("revokeConfirm"), variant: "destructive" });
    if (!ok) return;
    await revokeShare.mutateAsync();
    setToken(null);
  }

  function copyToClipboard(text: string, type: "link" | "embed") {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
          <Share2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {!token ? (
          <Button onClick={handleGenerate} disabled={createShare.isPending} className="cursor-pointer">
            {createShare.isPending ? t("generating") : t("generateLink")}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("copyLink")}</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="cursor-pointer"
                  onClick={() => copyToClipboard(shareUrl, "link")}
                >
                  {copied === "link" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("embedCode")}</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={embedCode}
                  className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="cursor-pointer"
                  onClick={() => copyToClipboard(embedCode, "embed")}
                >
                  {copied === "embed" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button
              variant="destructive"
              size="sm"
              className="cursor-pointer"
              onClick={handleRevoke}
              disabled={revokeShare.isPending}
            >
              {revokeShare.isPending ? t("revoking") : t("revoke")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
