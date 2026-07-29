"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useCreateAgent } from "@/hooks/use-agents";
import { agentInputSchema } from "@/lib/validation/agent";

export function AgentImportButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const createAgent = useCreateAgent();
  const t = useTranslations("agentsExt.import");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const parsed = agentInputSchema.safeParse(json);
      if (!parsed.success) {
        alert(t("invalidFile", { details: parsed.error.issues.map((i) => i.message).join(", ") }));
        return;
      }
      createAgent.mutate(parsed.data);
    } catch {
      alert(t("parseFailed"));
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <>
      <input ref={inputRef} type="file" accept=".json" onChange={handleFile} className="hidden" />
      <Button variant="ghost" size="sm" className="w-full" onClick={() => inputRef.current?.click()}>
        {t("button")}
      </Button>
    </>
  );
}
