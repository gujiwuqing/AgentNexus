import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { createId } from "@/lib/id";

const UPLOADS_DIR = join(process.cwd(), "uploads");

function getMonthDir(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot) : "";
}

export async function saveFile(filename: string, buffer: Buffer): Promise<string> {
  const month = getMonthDir();
  const dir = join(UPLOADS_DIR, month);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  const storageName = `${createId()}${getExtension(filename)}`;
  const storagePath = `uploads/${month}/${storageName}`;
  await writeFile(join(process.cwd(), storagePath), buffer);
  return storagePath;
}

export async function readStoredFile(storagePath: string): Promise<Buffer> {
  return readFile(join(process.cwd(), storagePath));
}

export async function deleteStoredFile(storagePath: string): Promise<void> {
  const fullPath = join(process.cwd(), storagePath);
  if (existsSync(fullPath)) await unlink(fullPath);
}
