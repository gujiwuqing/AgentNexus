"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  MessageSquare,
  Bot,
  Workflow,
  BookOpen,
  LayoutDashboard,
  Settings,
  Plus,
  CornerDownLeft,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { LucideIcon } from "lucide-react";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

type PaletteItem = {
  key: string;
  section: string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  href: string;
};

type ConversationRow = { id: string; title: string; agentId: string; agentName: string };

function matches(query: string, ...fields: Array<string | undefined>) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f?.toLowerCase().includes(q));
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const t = useTranslations("commandPalette");
  const tNav = useTranslations("nav");

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
    }
  }, [open]);

  const { data: agents } = useQuery({
    queryKey: ["agents"],
    queryFn: () => fetchJson<Array<{ id: string; name: string; description: string }>>("/api/agents"),
    enabled: open,
  });
  const { data: conversations } = useQuery({
    queryKey: ["conversations", "all"],
    queryFn: () => fetchJson<ConversationRow[]>("/api/conversations"),
    enabled: open,
  });
  const { data: workflows } = useQuery({
    queryKey: ["workflows"],
    queryFn: () => fetchJson<Array<{ id: string; name: string; description: string }>>("/api/workflows"),
    enabled: open,
  });
  const { data: knowledgeBases } = useQuery({
    queryKey: ["knowledge-bases"],
    queryFn: () => fetchJson<Array<{ id: string; name: string; description: string }>>("/api/knowledge-bases"),
    enabled: open,
  });

  const items = useMemo<PaletteItem[]>(() => {
    const hasQuery = query.trim().length > 0;
    const result: PaletteItem[] = [];

    const pages: Array<{ key: string; icon: LucideIcon; label: string; href: string }> = [
      { key: "chat", icon: MessageSquare, label: tNav("chat"), href: "/chat" },
      { key: "agents", icon: Bot, label: tNav("agents"), href: "/agents" },
      { key: "workflows", icon: Workflow, label: tNav("workflows"), href: "/workflows" },
      { key: "knowledge", icon: BookOpen, label: tNav("knowledge"), href: "/knowledge" },
      { key: "dashboard", icon: LayoutDashboard, label: tNav("dashboard"), href: "/dashboard" },
      { key: "settings", icon: Settings, label: tNav("settings"), href: "/settings" },
    ];
    for (const p of pages) {
      if (matches(query, p.label)) {
        result.push({ key: `page-${p.key}`, section: t("pages"), icon: p.icon, title: p.label, href: p.href });
      }
    }

    const actions = [
      { key: "new-agent", label: t("newAgent"), href: "/agents/new" },
      { key: "new-workflow", label: t("newWorkflow"), href: "/workflows/new" },
      { key: "new-knowledge", label: t("newKnowledgeBase"), href: "/knowledge/new" },
    ];
    for (const a of actions) {
      if (matches(query, a.label)) {
        result.push({ key: a.key, section: t("actions"), icon: Plus, title: a.label, href: a.href });
      }
    }

    const limit = hasQuery ? 8 : 4;
    for (const a of (agents ?? []).filter((a) => matches(query, a.name, a.description)).slice(0, limit)) {
      result.push({
        key: `agent-${a.id}`,
        section: t("agents"),
        icon: Bot,
        title: a.name,
        subtitle: a.description || undefined,
        href: `/chat/${a.id}`,
      });
    }
    for (const c of (conversations ?? []).filter((c) => matches(query, c.title, c.agentName)).slice(0, limit)) {
      result.push({
        key: `conv-${c.id}`,
        section: t("conversations"),
        icon: MessageSquare,
        title: c.title,
        subtitle: c.agentName,
        href: `/chat/${c.agentId}/${c.id}`,
      });
    }
    for (const w of (workflows ?? []).filter((w) => matches(query, w.name, w.description)).slice(0, limit)) {
      result.push({
        key: `wf-${w.id}`,
        section: t("workflows"),
        icon: Workflow,
        title: w.name,
        subtitle: w.description || undefined,
        href: `/chat/workflows/${w.id}`,
      });
    }
    for (const kb of (knowledgeBases ?? []).filter((kb) => matches(query, kb.name, kb.description)).slice(0, limit)) {
      result.push({
        key: `kb-${kb.id}`,
        section: t("knowledgeBases"),
        icon: BookOpen,
        title: kb.name,
        subtitle: kb.description || undefined,
        href: `/knowledge/${kb.id}`,
      });
    }

    return result;
  }, [query, agents, conversations, workflows, knowledgeBases, t, tNav]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  const navigate = useCallback(
    (item: PaletteItem) => {
      setOpen(false);
      router.push(item.href);
    },
    [router]
  );

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[selected];
      if (item) navigate(item);
    }
  }

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${selected}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  let lastSection = "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden top-[20%] translate-y-0">
        <DialogTitle className="sr-only">{t("title")}</DialogTitle>
        <div className="flex items-center gap-2 border-b px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={t("placeholder")}
            className="flex-1 h-12 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-flex px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono text-muted-foreground">Esc</kbd>
        </div>
        <div ref={listRef} className="max-h-[320px] overflow-y-auto p-2">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">{t("noResults")}</p>
          )}
          {items.map((item, i) => {
            const showHeader = item.section !== lastSection;
            lastSection = item.section;
            const Icon = item.icon;
            return (
              <div key={item.key}>
                {showHeader && (
                  <p className="px-2 pt-2 pb-1 text-[11px] font-semibold text-muted-foreground">{item.section}</p>
                )}
                <button
                  type="button"
                  data-index={i}
                  onClick={() => navigate(item)}
                  onMouseMove={() => setSelected(i)}
                  className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm text-left cursor-pointer ${
                    i === selected ? "bg-accent text-accent-foreground" : ""
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{item.title}</span>
                  {item.subtitle && (
                    <span className="truncate text-xs text-muted-foreground flex-1">{item.subtitle}</span>
                  )}
                  {i === selected && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground ml-auto" />}
                </button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
