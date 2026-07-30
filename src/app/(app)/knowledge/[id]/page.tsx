"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Trash2,
  Settings,
  Plus,
  Search,
  FileText,
  Layers,
  AlertCircle,
  Loader2,
  Eye,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useConfirm } from "@/components/providers/confirm-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useKnowledgeBase,
  useUpdateKnowledgeBase,
  useDeleteKnowledgeBase,
  useKnowledgeDocuments,
  useUploadDocument,
  useCreateTextDocument,
  useDeleteDocument,
  useReindexDocument,
  useReindexAllDocuments,
} from "@/hooks/use-knowledge";
import { DocumentList } from "@/components/knowledge/document-list";
import { DocumentUpload } from "@/components/knowledge/document-upload";
import { RetrievalTestPanel } from "@/components/knowledge/retrieval-test-panel";
import { DocumentViewerDialog } from "@/components/knowledge/document-viewer-dialog";
import { MarkdownView } from "@/components/markdown/markdown-view";
import { Breadcrumb } from "@/components/nav/breadcrumb";
import type { KnowledgeDocument } from "@/types/knowledge";

type StatusFilter = "all" | "completed" | "indexing" | "failed";

function StatPill({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof FileText;
  label: string;
  value: string | number;
  tone?: "default" | "destructive";
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5">
      <div
        className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${
          tone === "destructive" ? "bg-destructive/10" : "bg-primary/10"
        }`}
      >
        <Icon className={`h-4 w-4 ${tone === "destructive" ? "text-destructive" : "text-primary"}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-lg font-semibold leading-tight">{value}</p>
      </div>
    </div>
  );
}

function EditSettingsDialog({
  kbId,
  kb,
}: {
  kbId: string;
  kb: { name: string; description: string; chunkSize: number; chunkOverlap: number };
}) {
  const t = useTranslations("knowledge");
  const updateKB = useUpdateKnowledgeBase(kbId);
  const [name, setName] = useState(kb.name);
  const [description, setDescription] = useState(kb.description);
  const [chunkSize, setChunkSize] = useState(kb.chunkSize);
  const [chunkOverlap, setChunkOverlap] = useState(kb.chunkOverlap);
  const [open, setOpen] = useState(false);

  function handleSave() {
    updateKB.mutate(
      { name, description, chunkSize, chunkOverlap },
      { onSuccess: () => setOpen(false) }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="cursor-pointer">
          <Settings className="h-4 w-4 mr-1" />
          {t("settings")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("settings")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("description")}</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("chunkSize")}</Label>
              <Input
                type="number"
                min={100}
                max={2000}
                value={chunkSize}
                onChange={(e) => setChunkSize(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("chunkOverlap")}</Label>
              <Input
                type="number"
                min={0}
                max={500}
                value={chunkOverlap}
                onChange={(e) => setChunkOverlap(Number(e.target.value))}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t("chunkHint")}</p>
          <Button
            onClick={handleSave}
            disabled={updateKB.isPending || !name.trim()}
            className="cursor-pointer"
          >
            {updateKB.isPending ? t("saving") : t("saveChanges")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateTextDocDialog({ kbId }: { kbId: string }) {
  const t = useTranslations("knowledge");
  const createDoc = useCreateTextDocument(kbId);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(false);

  function handleCreate() {
    if (!title.trim() || !content.trim()) return;
    createDoc.mutate(
      { title: title.trim(), content: content.trim() },
      {
        onSuccess: () => {
          setTitle("");
          setContent("");
          setPreview(false);
          setOpen(false);
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="cursor-pointer">
          <Plus className="h-4 w-4 mr-1" />
          {t("createManual")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("createManual")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("docTitle")}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("docTitlePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("docContent")}</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs cursor-pointer gap-1.5"
                onClick={() => setPreview((v) => !v)}
                disabled={!content.trim()}
              >
                {preview ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {preview ? t("editMode") : t("previewMode")}
              </Button>
            </div>
            {preview ? (
              <div className="rounded-md border p-4 min-h-[260px] max-h-[420px] overflow-y-auto">
                <MarkdownView content={content} size="base" />
              </div>
            ) : (
              <Textarea
                rows={14}
                className="font-mono text-sm"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("docContentPlaceholder")}
              />
            )}
            <p className="text-xs text-muted-foreground">{t("markdownSupported")}</p>
          </div>
          <Button
            onClick={handleCreate}
            disabled={createDoc.isPending || !title.trim() || !content.trim()}
            className="cursor-pointer"
          >
            {createDoc.isPending ? t("creating") : t("create")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function KnowledgeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: kb, isLoading } = useKnowledgeBase(id);
  const { data: documents } = useKnowledgeDocuments(id);
  const uploadDoc = useUploadDocument(id);
  const deleteDoc = useDeleteDocument(id);
  const reindexDoc = useReindexDocument(id);
  const reindexAll = useReindexAllDocuments(id);
  const deleteKB = useDeleteKnowledgeBase();
  const t = useTranslations("knowledge");
  const tc = useTranslations("common");
  const confirm = useConfirm();

  const [viewerDoc, setViewerDoc] = useState<KnowledgeDocument | null>(null);
  const [docSearch, setDocSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const stats = useMemo(() => {
    const docs = documents ?? [];
    return {
      docCount: docs.length,
      chunkCount: docs.reduce((sum, d) => sum + d.chunkCount, 0),
      indexingCount: docs.filter((d) => d.status === "pending" || d.status === "processing").length,
      failedCount: docs.filter((d) => d.status === "failed").length,
    };
  }, [documents]);

  const filteredDocs = useMemo(() => {
    let docs = documents ?? [];
    const q = docSearch.trim().toLowerCase();
    if (q) docs = docs.filter((d) => d.filename.toLowerCase().includes(q));
    if (statusFilter === "completed") docs = docs.filter((d) => d.status === "completed");
    if (statusFilter === "failed") docs = docs.filter((d) => d.status === "failed");
    if (statusFilter === "indexing") {
      docs = docs.filter((d) => d.status === "pending" || d.status === "processing");
    }
    return docs;
  }, [documents, docSearch, statusFilter]);

  async function handleDeleteKB() {
    const ok = await confirm({
      description: t("deleteConfirm"),
      variant: "destructive",
      confirmLabel: tc("delete"),
    });
    if (!ok) return;
    deleteKB.mutate(id, {
      onSuccess: () => {
        toast.success(t("deleted"));
        router.push("/knowledge");
      },
      onError: (err) => toast.error(err.message),
    });
  }

  async function handleDeleteDoc(docId: string) {
    const ok = await confirm({
      description: t("deleteDocConfirm"),
      variant: "destructive",
      confirmLabel: tc("delete"),
    });
    if (!ok) return;
    deleteDoc.mutate(docId);
  }

  async function handleReindexAll() {
    const ok = await confirm({ description: t("reindexAllConfirm") });
    if (!ok) return;
    reindexAll.mutate(undefined, {
      onSuccess: (result) => toast.success(t("reindexAllStarted", { count: result.count })),
      onError: (err) => toast.error(err.message),
    });
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-6 py-8 lg:px-10 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!kb) return <div className="p-8">{tc("notFound")}</div>;

  const STATUS_FILTERS: Array<{ key: StatusFilter; label: string; count?: number }> = [
    { key: "all", label: t("filterAll"), count: stats.docCount },
    { key: "completed", label: t("statusCompleted") },
    { key: "indexing", label: t("filterIndexing"), count: stats.indexingCount },
    { key: "failed", label: t("statusFailed"), count: stats.failedCount },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 lg:px-10 animate-in fade-in duration-300">
      <Breadcrumb items={[{ label: t("title"), href: "/knowledge" }, { label: kb.name }]} />

      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold truncate">{kb.name}</h1>
          {kb.description && (
            <p className="text-sm text-muted-foreground mt-1">{kb.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <EditSettingsDialog kbId={id} kb={kb} />
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteKB}
            disabled={deleteKB.isPending}
            className="cursor-pointer text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {tc("delete")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatPill icon={FileText} label={t("statDocuments")} value={stats.docCount} />
        <StatPill icon={Layers} label={t("statChunks")} value={stats.chunkCount} />
        <StatPill icon={Loader2} label={t("statIndexing")} value={stats.indexingCount} />
        <StatPill
          icon={AlertCircle}
          label={t("statFailed")}
          value={stats.failedCount}
          tone={stats.failedCount > 0 ? "destructive" : "default"}
        />
      </div>

      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents">{t("documents")}</TabsTrigger>
          <TabsTrigger value="retrieval">{t("retrievalTest.title")}</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                placeholder={t("searchDocPlaceholder")}
                className="pl-9"
              />
            </div>
            <div className="flex gap-1">
              {STATUS_FILTERS.map((f) => (
                <Button
                  key={f.key}
                  size="sm"
                  variant={statusFilter === f.key ? "secondary" : "ghost"}
                  className="cursor-pointer h-9 text-xs"
                  onClick={() => setStatusFilter(f.key)}
                >
                  {f.label}
                  {f.count != null && f.count > 0 && (
                    <span className="ml-1 text-muted-foreground">{f.count}</span>
                  )}
                </Button>
              ))}
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              {(documents?.length ?? 0) > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer"
                  onClick={handleReindexAll}
                  disabled={reindexAll.isPending}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${reindexAll.isPending ? "animate-spin" : ""}`} />
                  {t("reindexAll")}
                </Button>
              )}
              <CreateTextDocDialog kbId={id} />
              <DocumentUpload
                onUpload={(file) => uploadDoc.mutate(file)}
                isUploading={uploadDoc.isPending}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{t("supportedFormats")}</p>

          <DocumentList
            documents={filteredDocs}
            onOpen={setViewerDoc}
            onReindex={(docId) => reindexDoc.mutate(docId)}
            onDelete={handleDeleteDoc}
            isReindexing={reindexDoc.isPending}
            isDeleting={deleteDoc.isPending}
            emptyLabel={
              (documents?.length ?? 0) > 0 ? t("noDocMatch") : t("noDocuments")
            }
          />
        </TabsContent>

        <TabsContent value="retrieval">
          <RetrievalTestPanel knowledgeBaseId={id} />
        </TabsContent>
      </Tabs>

      <DocumentViewerDialog kbId={id} doc={viewerDoc} onClose={() => setViewerDoc(null)} />
    </div>
  );
}
