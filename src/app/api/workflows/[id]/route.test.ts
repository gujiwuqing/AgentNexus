import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables, authedUser } from "@/db/test-helpers";
import { createWorkflow } from "@/server/workflows";
import { GET, PATCH, DELETE } from "./route";

afterEach(clearAllTables);

const sampleGraph = {
  nodes: [{ id: "a", type: "agent" as const, label: "A", config: { agentId: "x", promptTemplate: "hi" } }],
  edges: [],
};

function req(cookie: string, init?: RequestInit) {
  return new Request("http://localhost", { headers: { ...(cookie ? { cookie } : {}) }, ...init });
}

describe("GET /api/workflows/[id]", () => {
  it("returns the workflow when owned", async () => {
    const { user, cookie } = await authedUser();
    const w = await createWorkflow({ name: "Test", description: "", graph: sampleGraph }, user.id);
    const res = await GET(req(cookie), { params: Promise.resolve({ id: w.id }) });
    expect(res.status).toBe(200);
    expect((await res.json()).name).toBe("Test");
  });

  it("returns 404", async () => {
    const { cookie } = await authedUser();
    const res = await GET(req(cookie), { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });

  it("returns 404 for another user's workflow", async () => {
    const { user: alice } = await authedUser();
    const { cookie: bob } = await authedUser();
    const w = await createWorkflow({ name: "Alice's", description: "", graph: sampleGraph }, alice.id);
    const res = await GET(req(bob), { params: Promise.resolve({ id: w.id }) });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/workflows/[id]", () => {
  it("updates the workflow", async () => {
    const { user, cookie } = await authedUser();
    const w = await createWorkflow({ name: "Old", description: "", graph: sampleGraph }, user.id);
    const res = await PATCH(
      req(cookie, { method: "PATCH", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ name: "New" }) }),
      { params: Promise.resolve({ id: w.id }) }
    );
    expect(res.status).toBe(200);
    expect((await res.json()).name).toBe("New");
  });
});

describe("DELETE /api/workflows/[id]", () => {
  it("deletes the workflow", async () => {
    const { user, cookie } = await authedUser();
    const w = await createWorkflow({ name: "Temp", description: "", graph: sampleGraph }, user.id);
    const res = await DELETE(req(cookie), { params: Promise.resolve({ id: w.id }) });
    expect(res.status).toBe(204);
  });
});
