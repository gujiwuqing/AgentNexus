import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getKnowledgeBaseOwnedBy } from "@/server/knowledge-bases";
import { getKnowledgeDocument } from "@/server/knowledge-documents";
import { readStoredFile } from "@/lib/files/storage";
import { extractText } from "@/lib/files/extractor";
import { detectFileKind } from "@/lib/files/file-kind";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string; docId: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id, docId } = await params;
  const kb = await getKnowledgeBaseOwnedBy(id, user.id);
  if (!kb) return apiError(404, "not_found", "Knowledge base not found");
  const doc = await getKnowledgeDocument(docId);
  if (!doc || doc.knowledgeBaseId !== id) return apiError(404, "not_found", "Document not found");

  try {
    const buffer = await readStoredFile(doc.storagePath);
    const text = await extractText(buffer, doc.mimetype, doc.filename);
    return NextResponse.json({
      content: text,
      kind: detectFileKind(doc.filename, doc.mimetype),
    });
  } catch {
    return apiError(500, "read_error", "Failed to read document content");
  }
}
