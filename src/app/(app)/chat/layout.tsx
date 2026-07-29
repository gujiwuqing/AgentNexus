"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { AppSidebar } from "@/components/chat/app-sidebar";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ agentId?: string; conversationId?: string; workflowId?: string }>();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-[calc(100vh-3rem)]">
      <AppSidebar
        selectedAgentId={params.agentId}
        activeConversationId={params.conversationId}
        selectedWorkflowId={params.workflowId}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
