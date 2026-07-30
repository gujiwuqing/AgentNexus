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
import { useDeleteSkill } from "@/hooks/use-skills";

export function DeleteSkillButton({ skillId }: { skillId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const deleteSkill = useDeleteSkill();
  const t = useTranslations("skills.delete");

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
            disabled={deleteSkill.isPending}
            onClick={() =>
              deleteSkill.mutate(skillId, {
                onSuccess: () => router.push("/skills"),
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
