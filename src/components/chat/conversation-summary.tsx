"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Brain } from "lucide-react";

export function ConversationSummary({ summary }: { summary: string | null }) {
  const [expanded, setExpanded] = useState(false);

  if (!summary) return null;

  return (
    <div className="mx-4 mb-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Brain className="h-3 w-3" />
        <span>对话记忆摘要</span>
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {expanded && (
        <div className="mt-2 p-3 rounded-md bg-muted/50 text-xs text-muted-foreground whitespace-pre-wrap border">
          {summary}
        </div>
      )}
    </div>
  );
}
