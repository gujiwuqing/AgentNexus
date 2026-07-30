import { NextResponse } from "next/server";
import { apiOk, apiError } from "@/lib/api-response";
import { getAttachment, deleteAttachment } from "@/server/attachments";
import { readStoredFile, deleteStoredFile } from "@/lib/files/storage";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const attachment = await getAttachment(id);
  if (!attachment) return apiError(404, "not_found", "File not found");

  const buffer = await readStoredFile(attachment.storagePath);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": attachment.mimetype,
      "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.filename)}"`,
      "Content-Length": String(buffer.length),
    },
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const deleted = await deleteAttachment(id);
  if (!deleted) return apiError(404, "not_found", "File not found");
  await deleteStoredFile(deleted.storagePath);
  return apiOk({ success: true });
}
