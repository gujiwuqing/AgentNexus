import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables, authedUser } from "@/db/test-helpers";
import { GET, POST } from "./route";

afterEach(clearAllTables);

function jsonRequest(cookie: string, body: unknown) {
  return new Request("http://localhost/api/agents", {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

function getRequest(cookie: string) {
  return new Request("http://localhost/api/agents", {
    headers: { ...(cookie ? { cookie } : {}) },
  });
}

describe("POST /api/agents", () => {
  it("creates an agent for the authed user and returns 201", async () => {
    const { cookie } = await authedUser();
    const res = await POST(jsonRequest(cookie, { name: "Helper" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Helper");
    expect(body.id).toBeTruthy();
  });

  it("returns 400 for invalid input", async () => {
    const { cookie } = await authedUser();
    const res = await POST(jsonRequest(cookie, { name: "" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("validation_error");
  });

  it("returns 401 without auth", async () => {
    const res = await POST(jsonRequest("", { name: "Helper" }));
    expect(res.status).toBe(401);
  });
});

describe("GET /api/agents", () => {
  it("returns an empty list initially", async () => {
    const { cookie } = await authedUser();
    const res = await GET(getRequest(cookie));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns only the authed user's agents", async () => {
    const { cookie: alice } = await authedUser();
    const { cookie: bob } = await authedUser();
    await POST(jsonRequest(alice, { name: "Alice's" }));
    const res = await GET(getRequest(bob));
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("returns 401 without auth", async () => {
    const res = await GET(getRequest(""));
    expect(res.status).toBe(401);
  });
});
