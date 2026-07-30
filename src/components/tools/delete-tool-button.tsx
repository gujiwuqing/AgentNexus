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
import { useDeleteCustomTool } from "@/hooks/use-custom-tools";

export function DeleteToolButton({ toolId }: { toolId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const deleteTool = useDeleteCustomTool();
  const t = useTranslations("customTools.delete");

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
            disabled={deleteTool.isPending}
            onClick={() =>
              deleteTool.mutate(toolId, {
                onSuccess: () => router.push("/tools"),
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
