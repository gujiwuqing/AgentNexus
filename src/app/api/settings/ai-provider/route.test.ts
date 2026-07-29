import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables, authedUser } from "@/db/test-helpers";
import { GET, PUT } from "./route";

afterEach(clearAllTables);

function putRequest(cookie: string, body: unknown) {
  return new Request("http://localhost/api/settings/ai-provider", {
    method: "PUT",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

function getRequest(cookie: string) {
  return new Request("http://localhost/api/settings/ai-provider", { headers: { ...(cookie ? { cookie } : {}) } });
}

describe("GET /api/settings/ai-provider", () => {
  it("returns null when unset", async () => {
    const { cookie } = await authedUser();
    const res = await GET(getRequest(cookie));
    expect(res.status).toBe(200);
    expect(await res.json()).toBeNull();
  });

  it("returns 401 without auth", async () => {
    const res = await GET(getRequest(""));
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/settings/ai-provider", () => {
  it("saves and returns the config", async () => {
    const { cookie } = await authedUser();
    const res = await PUT(putRequest(cookie, { baseUrl: "https://api.example/v1", model: "m1", apiKey: "k1" }));
    expect(res.status).toBe(200);
    expect((await res.json()).model).toBe("m1");
  });

  it("returns 400 for an invalid baseUrl", async () => {
    const { cookie } = await authedUser();
    const res = await PUT(putRequest(cookie, { baseUrl: "not-a-url", model: "m1", apiKey: "k1" }));
    expect(res.status).toBe(400);
  });

  it("isolates config per user", async () => {
    const { cookie: alice } = await authedUser();
    const { cookie: bob } = await authedUser();
    await PUT(putRequest(alice, { baseUrl: "https://api.example/v1", model: "alice-model", apiKey: "k1" }));
    const res = await GET(getRequest(bob));
    expect(await res.json()).toBeNull();
  });
});
