import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables } from "@/db/test-helpers";
import { createAgent } from "@/server/agents";
import { GET, PATCH, DELETE } from "./route";

afterEach(clearAllTables);

function patchRequest(body: unknown) {
  return new Request("http://localhost/api/agents/x", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/agents/[id]", () => {
  it("returns the agent when it exists", async () => {
    const agent = await createAgent({ name: "Helper", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null });
    const res = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: agent.id }) });
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(agent.id);
  });

  it("returns 404 when the agent does not exist", async () => {
    const res = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/agents/[id]", () => {
  it("updates and returns the agent", async () => {
    const agent = await createAgent({ name: "Helper", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null });
    const res = await PATCH(patchRequest({ name: "Renamed" }), { params: Promise.resolve({ id: agent.id }) });
    expect(res.status).toBe(200);
    expect((await res.json()).name).toBe("Renamed");
  });

  it("returns 404 when updating a non-existent agent", async () => {
    const res = await PATCH(patchRequest({ name: "Renamed" }), { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/agents/[id]", () => {
  it("deletes the agent and returns 204", async () => {
    const agent = await createAgent({ name: "Helper", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null });
    const res = await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: agent.id }) });
    expect(res.status).toBe(204);
  });

  it("returns 404 when deleting a non-existent agent", async () => {
    const res = await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });
});
