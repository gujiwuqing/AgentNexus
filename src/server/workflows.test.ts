import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables } from "@/db/test-helpers";
import {
  createWorkflow,
  listWorkflows,
  getWorkflow,
  updateWorkflow,
  deleteWorkflow,
} from "./workflows";

afterEach(clearAllTables);

const sampleGraph = {
  nodes: [{ id: "a", type: "agent" as const, label: "A", config: { agentId: "x", promptTemplate: "hi" } }],
  edges: [],
};

describe("workflow service", () => {
  it("creates and retrieves a workflow", async () => {
    const w = await createWorkflow({ name: "Test", description: "desc", graph: sampleGraph });
    expect(w.id).toBeTruthy();
    expect(w.name).toBe("Test");
    const fetched = await getWorkflow(w.id);
    expect(fetched?.name).toBe("Test");
  });

  it("lists workflows", async () => {
    await createWorkflow({ name: "A", description: "", graph: sampleGraph });
    await createWorkflow({ name: "B", description: "", graph: sampleGraph });
    const all = await listWorkflows();
    expect(all).toHaveLength(2);
  });

  it("updates a workflow", async () => {
    const w = await createWorkflow({ name: "Old", description: "", graph: sampleGraph });
    const updated = await updateWorkflow(w.id, { name: "New" });
    expect(updated?.name).toBe("New");
  });

  it("returns null when updating non-existent", async () => {
    expect(await updateWorkflow("missing", { name: "X" })).toBeNull();
  });

  it("deletes a workflow", async () => {
    const w = await createWorkflow({ name: "Temp", description: "", graph: sampleGraph });
    expect(await deleteWorkflow(w.id)).toBe(true);
    expect(await getWorkflow(w.id)).toBeNull();
  });
});
