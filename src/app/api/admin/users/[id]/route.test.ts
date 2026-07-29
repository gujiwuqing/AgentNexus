import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables, authedUser } from "@/db/test-helpers";
import { createUserByAdmin, deleteUser } from "@/server/admin";
import { GET, PATCH, DELETE } from "./route";

afterEach(clearAllTables);

function req(cookie: string, method: string, body?: unknown) {
  return new Request("http://localhost/api/admin/users/x", {
    method,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("DELETE /api/admin/users/[id]", () => {
  it("admin cannot delete self", async () => {
    const { user, cookie } = await authedUser("admin");
    const res = await DELETE(req(cookie, "DELETE"), { params: Promise.resolve({ id: user.id }) });
    expect(res.status).toBe(400);
  });

  it("admin can delete a regular user", async () => {
    const { cookie } = await authedUser("admin");
    const target = await createUserByAdmin({ email: "t@t.com", password: "pw12345", name: "T", role: "user" });
    const res = await DELETE(req(cookie, "DELETE"), { params: Promise.resolve({ id: target.id }) });
    expect(res.status).toBe(204);
  });

  it("admin cannot delete another admin", async () => {
    const { cookie } = await authedUser("admin");
    const target = await createUserByAdmin({ email: "t@t.com", password: "pw12345", name: "T", role: "admin" });
    const res = await DELETE(req(cookie, "DELETE"), { params: Promise.resolve({ id: target.id }) });
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/admin/users/[id]", () => {
  it("admin can rename a regular user", async () => {
    const { cookie } = await authedUser("admin");
    const target = await createUserByAdmin({ email: "t@t.com", password: "pw12345", name: "T", role: "user" });
    const res = await PATCH(req(cookie, "PATCH", { name: "Renamed" }), { params: Promise.resolve({ id: target.id }) });
    expect(res.status).toBe(200);
    expect((await res.json()).name).toBe("Renamed");
  });

  it("admin cannot promote to admin", async () => {
    const { cookie } = await authedUser("admin");
    const target = await createUserByAdmin({ email: "t@t.com", password: "pw12345", name: "T", role: "user" });
    const res = await PATCH(req(cookie, "PATCH", { role: "admin" }), { params: Promise.resolve({ id: target.id }) });
    expect(res.status).toBe(403);
  });

  it("superAdmin can reset password", async () => {
    const { cookie } = await authedUser("superAdmin");
    const target = await createUserByAdmin({ email: "t@t.com", password: "pw12345", name: "T", role: "user" });
    const res = await PATCH(req(cookie, "PATCH", { newPassword: "newpass123" }), { params: Promise.resolve({ id: target.id }) });
    expect(res.status).toBe(200);
  });
});

void GET;
