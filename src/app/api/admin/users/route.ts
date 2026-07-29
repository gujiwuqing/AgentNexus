import { z } from "zod";
import { apiOk, apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { listUsersWithStats, createUserByAdmin } from "@/server/admin";

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  avatar: z.string().optional(),
  role: z.enum(["user", "admin", "superAdmin"]).default("user"),
});

export async function GET(request: Request) {
  const user = await requireAdmin(request);
  if (user instanceof Response) return user;
  const users = await listUsersWithStats();
  return apiOk(users);
}

export async function POST(request: Request) {
  const user = await requireAdmin(request);
  if (user instanceof Response) return user;

  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "validation_error", parsed.error.issues[0]?.message ?? "Invalid input");
  }

  // admin 只能创建 role=user 的账号；superAdmin 可创建任意角色
  if (user.role === "admin" && parsed.data.role !== "user") {
    return apiError(403, "forbidden", "Admins can only create regular users");
  }

  try {
    const created = await createUserByAdmin(parsed.data);
    return apiOk(created, 201);
  } catch (err) {
    const cause = (err as { cause?: { code?: string; message?: string } })?.cause;
    const message = err instanceof Error ? err.message : "Failed to create user";
    const isDuplicate = cause?.code === "ER_DUP_ENTRY" || /duplicate/i.test(message) || /duplicate/i.test(cause?.message ?? "");
    if (isDuplicate) {
      return apiError(409, "email_taken", "Email is already registered");
    }
    return apiError(500, "server_error", message);
  }
}
