import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables } from "@/db/test-helpers";
import { createWorkflow } from "@/server/workflows";
import { GET, PATCH, DELETE } from "./route";

afterEach(clearAllTables);

const sampleGraph = {
  nodes: [{ id: "a", type: "agent" as const, label: "A", config: { agentId: "x", promptTemplate: "hi" } }],
  edges: [],
};

describe("GET /api/workflows/[id]", () => {
  it("returns the workflow", async () => {
    const w = await createWorkflow({ name: "Test", description: "", graph: sampleGraph });
    const res = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: w.id }) });
    expect(res.status).toBe(200);
    expect((await res.json()).name).toBe("Test");
  });

  it("returns 404", async () => {
    const res = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/workflows/[id]", () => {
  it("updates the workflow", async () => {
    const w = await createWorkflow({ name: "Old", description: "", graph: sampleGraph });
    const res = await PATCH(
      new Request("http://localhost", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "New" }) }),
      { params: Promise.resolve({ id: w.id }) }
    );
    expect(res.status).toBe(200);
    expect((await res.json()).name).toBe("New");
  });
});

describe("DELETE /api/workflows/[id]", () => {
  it("deletes the workflow", async () => {
    const w = await createWorkflow({ name: "Temp", description: "", graph: sampleGraph });
    const res = await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: w.id }) });
    expect(res.status).toBe(204);
  });
});
