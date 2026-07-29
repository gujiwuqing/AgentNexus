import { apiOk, apiError } from "@/lib/api-response";
import { getKnowledgeBaseOwnedBy } from "@/server/knowledge-bases";
import { listDocuments, createKnowledgeDocument } from "@/server/knowledge-documents";
import { saveFile } from "@/lib/files/storage";
import { indexDocument } from "@/lib/knowledge/indexer";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIMETYPES = new Set(["text/plain", "text/markdown", "text/csv", "application/pdf"]);

export async function GET(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const kb = await getKnowledgeBaseOwnedBy(id, user.id);
  if (!kb) return apiError(404, "not_found", "Knowledge base not found");
  const docs = await listDocuments(id);
  return apiOk(docs);
}

export async function POST(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const kb = await getKnowledgeBaseOwnedBy(id, user.id);
  if (!kb) return apiError(404, "not_found", "Knowledge base not found");

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return apiError(400, "validation_error", "file is required");
  if (file.size > MAX_FILE_SIZE) return apiError(400, "file_too_large", "File exceeds 10MB limit");
  if (!ALLOWED_MIMETYPES.has(file.type)) return apiError(400, "unsupported_type", `Unsupported type: ${file.type}`);

  const buffer = Buffer.from(await file.arrayBuffer());
  const storagePath = await saveFile(file.name, buffer);

  const doc = await createKnowledgeDocument({
    knowledgeBaseId: id,
    filename: file.name,
    mimetype: file.type,
    size: file.size,
    storagePath,
  });

  indexDocument(doc!.id).catch(console.error);

  return apiOk(doc, 201);
}
