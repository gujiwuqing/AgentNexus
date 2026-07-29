import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables, authedUser } from "@/db/test-helpers";
import { createAgent } from "@/server/agents";
import { GET, PATCH, DELETE } from "./route";

afterEach(clearAllTables);

function patchRequest(cookie: string, body: unknown) {
  return new Request("http://localhost/api/agents/x", {
    method: "PATCH",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

function req(cookie: string) {
  return new Request("http://localhost", { headers: { ...(cookie ? { cookie } : {}) } });
}

describe("GET /api/agents/[id]", () => {
  it("returns the agent when it exists and is owned", async () => {
    const { user, cookie } = await authedUser();
    const agent = await createAgent({ name: "Helper", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, user.id);
    const res = await GET(req(cookie), { params: Promise.resolve({ id: agent.id }) });
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(agent.id);
  });

  it("returns 404 when the agent does not exist", async () => {
    const { cookie } = await authedUser();
    const res = await GET(req(cookie), { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });

  it("returns 404 for another user's agent", async () => {
    const { user: alice } = await authedUser();
    const { cookie: bob } = await authedUser();
    const agent = await createAgent({ name: "Alice's", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, alice.id);
    const res = await GET(req(bob), { params: Promise.resolve({ id: agent.id }) });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/agents/[id]", () => {
  it("updates and returns the agent", async () => {
    const { user, cookie } = await authedUser();
    const agent = await createAgent({ name: "Helper", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, user.id);
    const res = await PATCH(patchRequest(cookie, { name: "Renamed" }), { params: Promise.resolve({ id: agent.id }) });
    expect(res.status).toBe(200);
    expect((await res.json()).name).toBe("Renamed");
  });

  it("returns 404 when updating a non-existent agent", async () => {
    const { cookie } = await authedUser();
    const res = await PATCH(patchRequest(cookie, { name: "Renamed" }), { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/agents/[id]", () => {
  it("deletes the agent and returns 204", async () => {
    const { user, cookie } = await authedUser();
    const agent = await createAgent({ name: "Helper", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null }, user.id);
    const res = await DELETE(req(cookie), { params: Promise.resolve({ id: agent.id }) });
    expect(res.status).toBe(204);
  });

  it("returns 404 when deleting a non-existent agent", async () => {
    const { cookie } = await authedUser();
    const res = await DELETE(req(cookie), { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });
});
