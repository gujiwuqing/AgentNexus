import { z } from "zod";
import { apiOk, apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { getAdminUserById, updateUserByAdmin, resetUserPassword, deleteUser } from "@/server/admin";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  avatar: z.string().optional(),
  role: z.enum(["user", "admin", "superAdmin"]).optional(),
  newPassword: z.string().min(6).optional(),
});

function roleRank(role: string): number {
  return role === "superAdmin" ? 3 : role === "admin" ? 2 : 1;
}

export async function GET(request: Request, { params }: Params) {
  const user = await requireAdmin(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const target = await getAdminUserById(id);
  if (!target) return apiError(404, "not_found", "User not found");
  return apiOk(target);
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await requireAdmin(request);
  if (user instanceof Response) return user;
  const { id } = await params;

  if (id === user.id) return apiError(400, "bad_request", "Use the profile dialog to edit your own account");

  const target = await getAdminUserById(id);
  if (!target) return apiError(404, "not_found", "User not found");

  // admin 不能操作同级或更高角色
  if (user.role !== "superAdmin" && roleRank(target.role) >= roleRank(user.role)) {
    return apiError(403, "forbidden", "Cannot modify a user with equal or higher role");
  }

  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "validation_error", parsed.error.issues[0]?.message ?? "Invalid input");
  }

  // admin 不能把别人提权到 admin 或 superAdmin
  if (user.role !== "superAdmin" && parsed.data.role && parsed.data.role !== "user") {
    return apiError(403, "forbidden", "Only superAdmins can assign elevated roles");
  }

  const updated = await updateUserByAdmin(id, {
    name: parsed.data.name,
    avatar: parsed.data.avatar,
    role: parsed.data.role,
  });

  if (parsed.data.newPassword) {
    await resetUserPassword(id, parsed.data.newPassword);
  }

  return apiOk(updated);
}

export async function DELETE(request: Request, { params }: Params) {
  const user = await requireAdmin(request);
  if (user instanceof Response) return user;
  const { id } = await params;

  if (id === user.id) return apiError(400, "bad_request", "You cannot delete your own account");

  const target = await getAdminUserById(id);
  if (!target) return apiError(404, "not_found", "User not found");
  if (user.role !== "superAdmin" && roleRank(target.role) >= roleRank(user.role)) {
    return apiError(403, "forbidden", "Cannot delete a user with equal or higher role");
  }

  await deleteUser(id);
  return new Response(null, { status: 204 });
}
