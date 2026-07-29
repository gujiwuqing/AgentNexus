import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables } from "@/db/test-helpers";
import { createUser } from "@/server/users";
import { POST } from "./route";

afterEach(clearAllTables);

function loginReq(email: string, password: string) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

describe("POST /api/auth/login", () => {
  it("logs in with correct credentials and sets cookie", async () => {
    await createUser({ email: "a@b.com", password: "pw12345", name: "A", role: "user" });
    const res = await POST(loginReq("a@b.com", "pw12345"));
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("session_token=");
    expect(setCookie).toContain("HttpOnly");
    const body = await res.json();
    expect(body.email).toBe("a@b.com");
  });

  it("rejects wrong password with 401", async () => {
    await createUser({ email: "a@b.com", password: "pw12345", name: "A", role: "user" });
    const res = await POST(loginReq("a@b.com", "wrong"));
    expect(res.status).toBe(401);
  });

  it("rejects unknown email with 401", async () => {
    const res = await POST(loginReq("nobody@b.com", "pw12345"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when fields missing", async () => {
    const res = await POST(loginReq("", ""));
    expect(res.status).toBe(400);
  });
});
