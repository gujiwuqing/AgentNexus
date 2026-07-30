"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Upload } from "lucide-react";
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
        toast.error(t("invalidFile", { details: parsed.error.issues.map((i) => i.message).join(", ") }));
        return;
      }
      createAgent.mutate({ ...parsed.data, toolsConfig: { enabledTools: [] } });
    } catch {
      toast.error(t("parseFailed"));
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <>
      <input ref={inputRef} type="file" accept=".json" onChange={handleFile} className="hidden" />
      <Button variant="outline" size="sm" className="w-full" onClick={() => inputRef.current?.click()}>
        <Upload className="h-3.5 w-3.5" />
        {t("button")}
      </Button>
    </>
  );
}
