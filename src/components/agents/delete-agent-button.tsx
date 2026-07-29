"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useDeleteAgent } from "@/hooks/use-agents";

export function DeleteAgentButton({ agentId }: { agentId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const deleteAgent = useDeleteAgent();
  const t = useTranslations("agentsExt.delete");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">{t("button")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("confirmTitle")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t("confirmBody")}</p>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={deleteAgent.isPending}
            onClick={() =>
              deleteAgent.mutate(agentId, {
                onSuccess: () => router.push("/agents"),
              })
            }
          >
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
