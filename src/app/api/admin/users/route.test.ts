import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables, authedUser } from "@/db/test-helpers";
import { GET, POST } from "./route";

afterEach(clearAllTables);

function req(cookie: string, method: string, body?: unknown) {
  return new Request("http://localhost/api/admin/users", {
    method,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("GET /api/admin/users", () => {
  it("allows admin to list users", async () => {
    const { cookie } = await authedUser("admin");
    const res = await GET(req(cookie, "GET"));
    expect(res.status).toBe(200);
  });

  it("forbids regular user", async () => {
    const { cookie } = await authedUser("user");
    const res = await GET(req(cookie, "GET"));
    expect(res.status).toBe(403);
  });

  it("requires auth", async () => {
    const res = await GET(req("", "GET"));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/admin/users", () => {
  it("admin can create a regular user", async () => {
    const { cookie } = await authedUser("admin");
    const res = await POST(req(cookie, "POST", { email: "new@test.com", password: "pw12345", name: "New" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.role).toBe("user");
  });

  it("admin cannot create an admin", async () => {
    const { cookie } = await authedUser("admin");
    const res = await POST(req(cookie, "POST", { email: "new@test.com", password: "pw12345", name: "New", role: "admin" }));
    expect(res.status).toBe(403);
  });

  it("superAdmin can create an admin", async () => {
    const { cookie } = await authedUser("superAdmin");
    const res = await POST(req(cookie, "POST", { email: "new@test.com", password: "pw12345", name: "New", role: "admin" }));
    expect(res.status).toBe(201);
    expect((await res.json()).role).toBe("admin");
  });

  it("rejects duplicate email", async () => {
    const { cookie } = await authedUser("admin");
    await POST(req(cookie, "POST", { email: "dup@test.com", password: "pw12345", name: "A" }));
    const res = await POST(req(cookie, "POST", { email: "dup@test.com", password: "pw12345", name: "B" }));
    expect(res.status).toBe(409);
  });
});
