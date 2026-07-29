import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables, authedUser } from "@/db/test-helpers";
import { GET, POST } from "./route";

afterEach(clearAllTables);

const sampleGraph = {
  nodes: [{ id: "a", type: "agent", label: "A", config: { agentId: "x", promptTemplate: "hi" } }],
  edges: [],
};

function jsonRequest(cookie: string, body: unknown) {
  return new Request("http://localhost/api/workflows", {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

function getRequest(cookie: string) {
  return new Request("http://localhost/api/workflows", { headers: { ...(cookie ? { cookie } : {}) } });
}

describe("POST /api/workflows", () => {
  it("creates a workflow for the authed user", async () => {
    const { cookie } = await authedUser();
    const res = await POST(jsonRequest(cookie, { name: "Test", description: "d", graph: sampleGraph }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Test");
    expect(body.id).toBeTruthy();
  });

  it("returns 400 for missing name", async () => {
    const { cookie } = await authedUser();
    const res = await POST(jsonRequest(cookie, { description: "d", graph: sampleGraph }));
    expect(res.status).toBe(400);
  });

  it("returns 401 without auth", async () => {
    const res = await POST(jsonRequest("", { name: "Test", description: "d", graph: sampleGraph }));
    expect(res.status).toBe(401);
  });
});

describe("GET /api/workflows", () => {
  it("returns empty list initially", async () => {
    const { cookie } = await authedUser();
    const res = await GET(getRequest(cookie));
    expect(await res.json()).toEqual([]);
  });

  it("returns only the authed user's workflows", async () => {
    const { cookie: alice } = await authedUser();
    const { cookie: bob } = await authedUser();
    await POST(jsonRequest(alice, { name: "Alice's", description: "d", graph: sampleGraph }));
    const res = await GET(getRequest(bob));
    expect(await res.json()).toEqual([]);
  });
});
