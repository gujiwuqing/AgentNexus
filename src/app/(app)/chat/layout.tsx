"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { PanelLeft } from "lucide-react";
import { AppSidebar } from "@/components/chat/app-sidebar";
import { useIsMobile } from "@/hooks/use-media-query";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ agentId?: string; conversationId?: string; workflowId?: string }>();
  const isMobile = useIsMobile();
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  if (isMobile) {
    return (
      <div className="flex h-full min-h-0 relative">
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-40 flex">
            <div className="fixed inset-0 bg-black/50" onClick={() => setMobileDrawerOpen(false)} />
            <div className="relative z-10 h-full animate-in slide-in-from-left duration-200">
              <AppSidebar
                selectedAgentId={params.agentId}
                activeConversationId={params.conversationId}
                selectedWorkflowId={params.workflowId}
                collapsed={false}
                onToggle={() => setMobileDrawerOpen(false)}
              />
            </div>
          </div>
        )}
        <button
          onClick={() => setMobileDrawerOpen(true)}
          aria-label="Open agent list"
          className="absolute top-2 left-2 z-10 h-8 w-8 rounded-md bg-background border shadow-sm flex items-center justify-center"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      <AppSidebar
        selectedAgentId={params.agentId}
        activeConversationId={params.conversationId}
        selectedWorkflowId={params.workflowId}
        collapsed={desktopCollapsed}
        onToggle={() => setDesktopCollapsed((c) => !c)}
      />
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
