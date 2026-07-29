import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables, authedUser } from "@/db/test-helpers";
import { POST } from "./route";

afterEach(clearAllTables);

describe("POST /api/auth/logout", () => {
  it("clears the session cookie", async () => {
    const { cookie } = await authedUser();
    const res = await POST(new Request("http://localhost/api/auth/logout", { method: "POST", headers: { cookie } }));
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("session_token=");
    expect(setCookie).toContain("Max-Age=0");
  });

  it("works without a session (no-op)", async () => {
    const res = await POST(new Request("http://localhost/api/auth/logout", { method: "POST" }));
    expect(res.status).toBe(200);
  });
});
