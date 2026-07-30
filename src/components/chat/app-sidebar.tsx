"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Plus,
  Settings,
  Trash2,
  X,
  Pencil,
  PanelLeftClose,
  PanelLeft,
  Search,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { AgentAvatar } from "@/components/agents/agent-avatar";
import { useConfirm } from "@/components/providers/confirm-provider";
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
import type { Conversation } from "@/types/conversation";

function groupConversationsByDate(conversations: Conversation[], labels: { today: string; yesterday: string; earlier: string }) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

  const groups: { label: string; items: Conversation[] }[] = [
    { label: labels.today, items: [] },
    { label: labels.yesterday, items: [] },
    { label: labels.earlier, items: [] },
  ];

  for (const conv of conversations) {
    const t = new Date(conv.updatedAt).getTime();
    if (t >= startOfToday) groups[0].items.push(conv);
    else if (t >= startOfYesterday) groups[1].items.push(conv);
    else groups[2].items.push(conv);
  }

  return groups.filter((g) => g.items.length > 0);
}

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
  const confirm = useConfirm();
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

  async function handleDelete(id: string) {
    const ok = await confirm({ description: t("confirmDeleteConversation"), variant: "destructive" });
    if (!ok) return;
    deleteConversation.mutate(id, { onError: (err) => toast.error(err.message) });
    if (id === activeConversationId) router.push(`/chat/${agentId}`);
  }

  const groups = useMemo(
    () =>
      conversations
        ? groupConversationsByDate(conversations, {
            today: t("today"),
            yesterday: t("yesterday"),
            earlier: t("earlier"),
          })
        : [],
    [conversations, t]
  );

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start gap-1.5"
        disabled={createConversation.isPending}
        onClick={() =>
          createConversation.mutate(undefined, {
            onSuccess: (conv) => router.push(`/chat/${agentId}/${conv.id}`),
            onError: (err) => toast.error(err.message),
          })
        }
      >
        <Plus className="h-3.5 w-3.5" />
        {t("newChat")}
      </Button>
      {groups.map((group) => (
        <div key={group.label} className="mt-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-0.5">
            {group.label}
          </p>
          {group.items.map((conv) => (
            <div
              key={conv.id}
              className={`group flex items-center gap-1 px-2 py-1.5 rounded-md text-sm hover:bg-sidebar-accent ${
                conv.id === activeConversationId ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""
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
              {editingId !== conv.id && (
                <button
                  className="text-muted-foreground hover:text-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => startEditing(conv.id, conv.title)}
                  aria-label={t("renameConversation")}
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
              <button
                className="text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDelete(conv.id)}
                aria-label={t("deleteConversation")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
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
  const confirm = useConfirm();
  const t = useTranslations("chatExt.sidebar");
  const [search, setSearch] = useState("");

  const filteredAgents = useMemo(() => {
    if (!agents) return agents;
    const q = search.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter((a) => a.name.toLowerCase().includes(q));
  }, [agents, search]);

  async function handleDeleteAgent(id: string, name: string) {
    const ok = await confirm({ description: t("confirmDeleteAgent", { name }), variant: "destructive" });
    if (!ok) return;
    deleteAgent.mutate(id, {
      onSuccess: () => {
        toast.success(t("agentDeleted", { name }));
        if (id === selectedAgentId) router.push("/chat");
      },
      onError: (err) => toast.error(err.message),
    });
  }

  async function handleDeleteWorkflow(id: string, name: string) {
    const ok = await confirm({ description: t("confirmDeleteWorkflow", { name }), variant: "destructive" });
    if (!ok) return;
    deleteWorkflow.mutate(id, {
      onSuccess: () => {
        toast.success(t("workflowDeleted", { name }));
        if (id === selectedWorkflowId) router.push("/chat");
      },
      onError: (err) => toast.error(err.message),
    });
  }

  if (collapsed) {
    return (
      <div className="w-12 border-r flex flex-col items-center py-2 gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggle} aria-label={t("expand")}>
          <PanelLeft className="h-4 w-4" />
        </Button>
        <Separator />
        {agents?.map((agent) => (
          <button
            key={agent.id}
            className={`rounded-full p-0.5 hover:ring-2 hover:ring-primary/40 ${agent.id === selectedAgentId ? "ring-2 ring-primary" : ""}`}
            onClick={() => router.push(`/chat/${agent.id}`)}
            title={agent.name}
          >
            <AgentAvatar avatar={agent.avatar} className="h-8 w-8 text-lg" iconClassName="h-4 w-4" />
          </button>
        ))}
        <Separator />
        {workflows?.map((w) => (
          <button
            key={w.id}
            className={`h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted ${w.id === selectedWorkflowId ? "bg-muted ring-2 ring-primary" : ""}`}
            onClick={() => router.push(`/chat/workflows/${w.id}`)}
            title={w.name}
          >
            <Workflow className="h-4 w-4 text-brand" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="w-64 border-r flex flex-col bg-sidebar">
      <div className="p-3 flex items-center justify-between border-b border-sidebar-border">
        <span className="font-semibold text-sm text-sidebar-foreground">{t("agentsHeading")}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggle} aria-label={t("collapse")}>
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-2 pb-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchAgents")}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredAgents?.map((agent) => (
          <div key={agent.id}>
            <div
              className={`group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-sidebar-accent ${
                agent.id === selectedAgentId ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""
              }`}
              onClick={() => router.push(`/chat/${agent.id}`)}
            >
              <AgentAvatar avatar={agent.avatar} className="h-7 w-7 text-base shrink-0" iconClassName="h-3.5 w-3.5" />
              <span className="flex-1 truncate text-sm">{agent.name}</span>
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <AgentConfigDialog
                  agentId={agent.id}
                  trigger={
                    <button
                      className="text-muted-foreground hover:text-foreground p-0.5"
                      onClick={(e) => e.stopPropagation()}
                      aria-label={t("settingsFor", { name: agent.name })}
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </button>
                  }
                />
                <button
                  className="text-muted-foreground hover:text-destructive p-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteAgent(agent.id, agent.name);
                  }}
                  aria-label={t("deleteAgent", { name: agent.name })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {agent.id === selectedAgentId && (
              <div className="ml-4 mt-1">
                <ConversationList agentId={agent.id} activeConversationId={activeConversationId} />
              </div>
            )}
          </div>
        ))}
        {filteredAgents && filteredAgents.length === 0 && (
          <p className="text-xs text-muted-foreground px-2 py-4 text-center">{t("noAgentsFound")}</p>
        )}

        <Separator className="my-2" />

        <div className="px-2 mb-1">
          <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">{t("workflowsHeading")}</span>
        </div>
        <div className="space-y-1">
          {workflows?.map((w) => (
            <div
              key={w.id}
              className={`group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-sidebar-accent text-sm ${
                w.id === selectedWorkflowId ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""
              }`}
              onClick={() => router.push(`/chat/workflows/${w.id}`)}
            >
              <div className="h-7 w-7 rounded-md bg-brand/10 flex items-center justify-center shrink-0">
                <Workflow className="h-3.5 w-3.5 text-brand" />
              </div>
              <span className="flex-1 truncate">{w.name}</span>
              <button
                className="text-muted-foreground hover:text-destructive p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteWorkflow(w.id, w.name);
                }}
                aria-label={t("deleteWorkflow", { name: w.name })}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {(!workflows || workflows.length === 0) && (
            <p className="text-xs text-muted-foreground px-2">{t("noWorkflows")}</p>
          )}
        </div>
      </div>

      <div className="p-2 border-t border-sidebar-border space-y-1">
        <Button asChild variant="outline" size="sm" className="w-full justify-start gap-1.5">
          <Link href="/agents/new">
            <Plus className="h-3.5 w-3.5" />
            {t("newAgent")}
          </Link>
        </Button>
        <AgentImportButton />
        <Button asChild variant="outline" size="sm" className="w-full justify-start gap-1.5">
          <Link href="/workflows/new">
            <Plus className="h-3.5 w-3.5" />
            {t("newWorkflow")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
