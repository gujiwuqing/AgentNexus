import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables } from "@/db/test-helpers";
import { GET, POST } from "./route";

afterEach(clearAllTables);

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/agents", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/agents", () => {
  it("creates an agent and returns 201", async () => {
    const res = await POST(jsonRequest({ name: "Helper" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Helper");
    expect(body.id).toBeTruthy();
  });

  it("returns 400 for invalid input", async () => {
    const res = await POST(jsonRequest({ name: "" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("validation_error");
  });
});

describe("GET /api/agents", () => {
  it("returns an empty list initially", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns created agents", async () => {
    await POST(jsonRequest({ name: "Helper" }));
    const res = await GET();
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Helper");
  });
});
