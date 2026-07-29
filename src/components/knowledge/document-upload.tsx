"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACCEPTED = ".txt,.md,.csv,.pdf";

export function DocumentUpload({
  onUpload,
  isUploading,
}: {
  onUpload: (file: File) => void;
  isUploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("knowledge");

  return (
    <div className="relative inline-block">
      <Button
        variant="outline"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {isUploading ? t("uploading") : t("uploadDocument")}
      </Button>
      {isUploading && (
        <div className="absolute left-0 right-0 -bottom-1 h-0.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 bg-brand animate-[indeterminate_1.2s_ease-in-out_infinite] rounded-full" />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
