import { apiOk, apiError } from "@/lib/api-response";
import { saveFile } from "@/lib/files/storage";
import { createAttachment } from "@/server/attachments";
import { requireUser } from "@/lib/auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIMETYPES = new Set([
  "text/plain", "text/markdown", "text/csv",
  "application/pdf",
  "image/png", "image/jpeg", "image/gif", "image/webp",
]);

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) return apiError(400, "validation_error", "file is required");
  if (file.size > MAX_FILE_SIZE) return apiError(400, "file_too_large", "File exceeds 10MB limit");
  if (!ALLOWED_MIMETYPES.has(file.type)) return apiError(400, "unsupported_type", `Unsupported file type: ${file.type}`);

  const buffer = Buffer.from(await file.arrayBuffer());
  const storagePath = await saveFile(file.name, buffer);

  const attachment = await createAttachment({
    filename: file.name,
    mimetype: file.type,
    size: file.size,
    storagePath,
  });

  return apiOk(attachment, 201);
}
