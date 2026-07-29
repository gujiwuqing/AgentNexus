"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAgents, useDeleteAgent } from "@/hooks/use-agents";
import {
  useConversations,
  useCreateConversation,
  useDeleteConversation,
  useRenameConversation,
} from "@/hooks/use-conversations";
import { useWorkflows, useDeleteWorkflow } from "@/hooks/use-workflows";
import { AgentConfigDialog } from "@/components/agents/agent-config-dialog";
import { AgentImportButton } from "@/components/agents/agent-import-button";

function ConversationList({
  agentId,
  activeConversationId,
}: {
  agentId: string;
  activeConversationId?: string;
}) {
  const router = useRouter();
  const { data: conversations } = useConversations(agentId);
  const createConversation = useCreateConversation(agentId);
  const deleteConversation = useDeleteConversation(agentId);
  const renameConversation = useRenameConversation(agentId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const t = useTranslations("chatExt.sidebar");

  function startEditing(id: string, title: string) {
    setEditingId(id);
    setEditingTitle(title);
  }

  function commitRename() {
    if (!editingId) return;
    const trimmed = editingTitle.trim();
    if (trimmed) renameConversation.mutate({ id: editingId, title: trimmed });
    setEditingId(null);
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        disabled={createConversation.isPending}
        onClick={() =>
          createConversation.mutate(undefined, {
            onSuccess: (conv) => router.push(`/chat/${agentId}/${conv.id}`),
          })
        }
      >
        {t("newChat")}
      </Button>
      {conversations?.map((conv) => (
        <div
          key={conv.id}
          className={`flex items-center gap-1 px-2 py-1 rounded text-sm hover:bg-muted ${
            conv.id === activeConversationId ? "bg-muted" : ""
          }`}
        >
          {editingId === conv.id ? (
            <Input
              className="h-6 text-xs px-1 flex-1"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setEditingId(null);
              }}
              autoFocus
            />
          ) : (
            <Link
              href={`/chat/${agentId}/${conv.id}`}
              className="flex-1 truncate"
              onDoubleClick={(e) => {
                e.preventDefault();
                startEditing(conv.id, conv.title);
              }}
            >
              {conv.title}
            </Link>
          )}
          <button
            className="text-muted-foreground hover:text-destructive text-xs shrink-0"
            onClick={() => {
              deleteConversation.mutate(conv.id);
              if (conv.id === activeConversationId) router.push(`/chat/${agentId}`);
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

export function AppSidebar({
  selectedAgentId,
  activeConversationId,
  selectedWorkflowId,
  collapsed,
  onToggle,
}: {
  selectedAgentId?: string;
  activeConversationId?: string;
  selectedWorkflowId?: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const { data: agents } = useAgents();
  const deleteAgent = useDeleteAgent();
  const { data: workflows } = useWorkflows();
  const deleteWorkflow = useDeleteWorkflow();
  const t = useTranslations("chatExt.sidebar");

  if (collapsed) {
    return (
      <div className="w-12 border-r flex flex-col items-center py-2 gap-2">
        <button onClick={onToggle} className="text-lg" aria-label={t("expand")}>☰</button>
        <Separator />
        {agents?.map((agent) => (
          <button
            key={agent.id}
            className={`text-xl rounded p-1 hover:bg-muted ${agent.id === selectedAgentId ? "bg-muted" : ""}`}
            onClick={() => router.push(`/chat/${agent.id}`)}
            title={agent.name}
          >
            {agent.avatar || "🤖"}
          </button>
        ))}
        <Separator />
        {workflows?.map((w) => (
          <button
            key={w.id}
            className={`text-xl rounded p-1 hover:bg-muted ${w.id === selectedWorkflowId ? "bg-muted" : ""}`}
            onClick={() => router.push(`/chat/workflows/${w.id}`)}
            title={w.name}
          >
            🔗
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="w-64 border-r flex flex-col">
      <div className="p-3 flex items-center justify-between border-b">
        <span className="font-semibold text-sm">{t("agentsHeading")}</span>
        <button onClick={onToggle} className="text-lg" aria-label={t("collapse")}>☰</button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {agents?.map((agent) => (
          <div key={agent.id}>
            <div
              className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted ${
                agent.id === selectedAgentId ? "bg-muted" : ""
              }`}
              onClick={() => router.push(`/chat/${agent.id}`)}
            >
              <span className="text-lg">{agent.avatar || "🤖"}</span>
              <span className="flex-1 truncate text-sm">{agent.name}</span>
              <AgentConfigDialog
                agentId={agent.id}
                trigger={
                  <button
                    className="text-muted-foreground hover:text-foreground text-xs"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={t("settingsFor", { name: agent.name })}
                  >
                    ⚙
                  </button>
                }
              />
              <button
                className="text-muted-foreground hover:text-destructive text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(t("confirmDeleteAgent"))) {
                    deleteAgent.mutate(agent.id);
                    if (agent.id === selectedAgentId) router.push("/chat");
                  }
                }}
                aria-label={t("deleteAgent", { name: agent.name })}
              >
                ✕
              </button>
            </div>
            {agent.id === selectedAgentId && (
              <div className="ml-4 mt-1">
                <ConversationList agentId={agent.id} activeConversationId={activeConversationId} />
              </div>
            )}
          </div>
        ))}

        <Separator className="my-2" />

        <div className="px-2 mb-1">
          <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">{t("workflowsHeading")}</span>
        </div>
        <div className="space-y-1">
          {workflows?.map((w) => (
            <div
              key={w.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted text-sm ${
                w.id === selectedWorkflowId ? "bg-muted" : ""
              }`}
              onClick={() => router.push(`/chat/workflows/${w.id}`)}
            >
              <span>🔗</span>
              <span className="flex-1 truncate">{w.name}</span>
              <button
                className="text-muted-foreground hover:text-destructive text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(t("confirmDeleteWorkflow"))) {
                    deleteWorkflow.mutate(w.id);
                    if (w.id === selectedWorkflowId) router.push("/chat");
                  }
                }}
              >
                ✕
              </button>
            </div>
          ))}
          {(!workflows || workflows.length === 0) && (
            <p className="text-xs text-muted-foreground px-2">{t("noWorkflows")}</p>
          )}
        </div>
      </div>

      <div className="p-2 border-t space-y-1">
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href="/agents/new">{t("newAgent")}</Link>
        </Button>
        <AgentImportButton />
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href="/workflows/new">{t("newWorkflow")}</Link>
        </Button>
      </div>
    </div>
  );
}
