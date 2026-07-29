import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables } from "@/db/test-helpers";
import { GET, POST } from "./route";

afterEach(clearAllTables);

const sampleGraph = {
  nodes: [{ id: "a", type: "agent", label: "A", config: { agentId: "x", promptTemplate: "hi" } }],
  edges: [],
};

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/workflows", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/workflows", () => {
  it("creates a workflow", async () => {
    const res = await POST(jsonRequest({ name: "Test", description: "d", graph: sampleGraph }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Test");
    expect(body.id).toBeTruthy();
  });

  it("returns 400 for missing name", async () => {
    const res = await POST(jsonRequest({ description: "d", graph: sampleGraph }));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/workflows", () => {
  it("returns empty list initially", async () => {
    const res = await GET();
    expect(await res.json()).toEqual([]);
  });
});
