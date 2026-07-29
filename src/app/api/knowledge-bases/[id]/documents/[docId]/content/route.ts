import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getKnowledgeDocument } from "@/server/knowledge-documents";
import { readStoredFile } from "@/lib/files/storage";
import { extractText } from "@/lib/files/extractor";

type Params = { params: Promise<{ id: string; docId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { docId } = await params;
  const doc = await getKnowledgeDocument(docId);
  if (!doc) return apiError(404, "not_found", "Document not found");

  try {
    const buffer = await readStoredFile(doc.storagePath);
    const text = await extractText(buffer, doc.mimetype);
    return NextResponse.json({ content: text });
  } catch {
    return apiError(500, "read_error", "Failed to read document content");
  }
}
