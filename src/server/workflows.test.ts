import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables, authedUser } from "@/db/test-helpers";
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
    const { user } = await authedUser();
    const w = await createWorkflow({ name: "Test", description: "desc", graph: sampleGraph }, user.id);
    expect(w.id).toBeTruthy();
    expect(w.name).toBe("Test");
    const fetched = await getWorkflow(w.id);
    expect(fetched?.name).toBe("Test");
  });

  it("lists only the owner's workflows", async () => {
    const { user: alice } = await authedUser();
    const { user: bob } = await authedUser();
    await createWorkflow({ name: "A", description: "", graph: sampleGraph }, alice.id);
    await createWorkflow({ name: "B", description: "", graph: sampleGraph }, bob.id);
    const all = await listWorkflows(alice.id);
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("A");
  });

  it("updates a workflow owned by the user", async () => {
    const { user } = await authedUser();
    const w = await createWorkflow({ name: "Old", description: "", graph: sampleGraph }, user.id);
    const updated = await updateWorkflow(w.id, { name: "New" }, user.id);
    expect(updated?.name).toBe("New");
  });

  it("returns null when updating another user's workflow", async () => {
    const { user: alice } = await authedUser();
    const { user: bob } = await authedUser();
    const w = await createWorkflow({ name: "Alice's", description: "", graph: sampleGraph }, alice.id);
    expect(await updateWorkflow(w.id, { name: "Hacked" }, bob.id)).toBeNull();
  });

  it("deletes a workflow owned by the user", async () => {
    const { user } = await authedUser();
    const w = await createWorkflow({ name: "Temp", description: "", graph: sampleGraph }, user.id);
    expect(await deleteWorkflow(w.id, user.id)).toBe(true);
    expect(await getWorkflow(w.id)).toBeNull();
  });
});
