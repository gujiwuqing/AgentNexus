"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2, Settings, Plus, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
} from "@/hooks/use-knowledge";
import { DocumentList } from "@/components/knowledge/document-list";
import { DocumentUpload } from "@/components/knowledge/document-upload";

function EditSettingsDialog({ kbId, kb }: { kbId: string; kb: { name: string; description: string; chunkSize: number; chunkOverlap: number } }) {
  const t = useTranslations("knowledge");
  const updateKB = useUpdateKnowledgeBase(kbId);
  const [name, setName] = useState(kb.name);
  const [description, setDescription] = useState(kb.description);
  const [chunkSize, setChunkSize] = useState(kb.chunkSize);
  const [chunkOverlap, setChunkOverlap] = useState(kb.chunkOverlap);
  const [open, setOpen] = useState(false);

  function handleSave() {
    updateKB.mutate({ name, description, chunkSize, chunkOverlap }, {
      onSuccess: () => setOpen(false),
    });
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
              <Input type="number" min={100} max={2000} value={chunkSize} onChange={(e) => setChunkSize(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>{t("chunkOverlap")}</Label>
              <Input type="number" min={0} max={500} value={chunkOverlap} onChange={(e) => setChunkOverlap(Number(e.target.value))} />
            </div>
          </div>
          <Button onClick={handleSave} disabled={updateKB.isPending || !name.trim()} className="cursor-pointer">
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

  function handleCreate() {
    if (!title.trim() || !content.trim()) return;
    createDoc.mutate({ title: title.trim(), content: content.trim() }, {
      onSuccess: () => {
        setTitle("");
        setContent("");
        setOpen(false);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="cursor-pointer">
          <Plus className="h-4 w-4 mr-1" />
          {t("createManual")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("createManual")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("docTitle")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("docTitlePlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label>{t("docContent")}</Label>
            <Textarea
              rows={12}
              className="font-mono text-sm"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("docContentPlaceholder")}
            />
          </div>
          <Button onClick={handleCreate} disabled={createDoc.isPending || !title.trim() || !content.trim()} className="cursor-pointer">
            {createDoc.isPending ? t("creating") : t("create")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DocContentPreview({ kbId, docId, filename }: { kbId: string; docId: string; filename: string }) {
  const t = useTranslations("knowledge");
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function loadContent() {
    if (content !== null) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/knowledge-bases/${kbId}/documents/${docId}/content`);
      if (res.ok) {
        const data = await res.json();
        setContent(data.content ?? "");
      } else {
        setContent(t("contentLoadError"));
      }
    } catch {
      setContent(t("contentLoadError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) loadContent(); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer">
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{filename}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[60vh]">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          ) : (
            <pre className="text-sm whitespace-pre-wrap font-mono bg-muted rounded-lg p-4">{content}</pre>
          )}
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
  const deleteKB = useDeleteKnowledgeBase();
  const t = useTranslations("knowledge");
  const tc = useTranslations("common");

  if (isLoading) return <div className="p-8">{tc("loading")}</div>;
  if (!kb) return <div className="p-8">Not found</div>;

  function handleDeleteKB() {
    if (!confirm(t("deleteConfirm"))) return;
    deleteKB.mutate(id, { onSuccess: () => router.push("/knowledge") });
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 lg:px-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">{kb.name}</h1>
          {kb.description && (
            <p className="text-sm text-muted-foreground mt-1">{kb.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <EditSettingsDialog kbId={id} kb={kb} />
          <Button variant="destructive" size="sm" onClick={handleDeleteKB} disabled={deleteKB.isPending} className="cursor-pointer">
            <Trash2 className="h-4 w-4 mr-1" />
            {tc("delete")}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("documents")}</h2>
          <div className="flex items-center gap-2">
            <CreateTextDocDialog kbId={id} />
            <DocumentUpload
              onUpload={(file) => uploadDoc.mutate(file)}
              isUploading={uploadDoc.isPending}
            />
          </div>
        </div>

        <DocumentList
          documents={documents ?? []}
          onReindex={(docId) => reindexDoc.mutate(docId)}
          onDelete={(docId) => deleteDoc.mutate(docId)}
          isReindexing={reindexDoc.isPending}
          isDeleting={deleteDoc.isPending}
          renderPreview={(doc) => (
            <DocContentPreview kbId={id} docId={doc.id} filename={doc.filename} />
          )}
        />
      </div>
    </div>
  );
}
