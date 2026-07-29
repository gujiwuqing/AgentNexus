import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables, authedUser } from "@/db/test-helpers";
import { GET } from "./route";

afterEach(clearAllTables);

function req(cookie: string) {
  return new Request("http://localhost/api/auth/me", { headers: { ...(cookie ? { cookie } : {}) } });
}

describe("GET /api/auth/me", () => {
  it("returns null without a session", async () => {
    const res = await GET(req(""));
    expect(res.status).toBe(200);
    expect(await res.json()).toBeNull();
  });

  it("returns the authed user with a session", async () => {
    const { user, cookie } = await authedUser();
    const res = await GET(req(cookie));
    const body = await res.json();
    expect(body.id).toBe(user.id);
    expect(body.email).toBe(user.email);
  });
});
