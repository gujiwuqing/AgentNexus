import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables } from "@/db/test-helpers";
import { GET, PUT } from "./route";

afterEach(clearAllTables);

function putRequest(body: unknown) {
  return new Request("http://localhost/api/settings/ai-provider", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/settings/ai-provider", () => {
  it("returns null when unset", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toBeNull();
  });
});

describe("PUT /api/settings/ai-provider", () => {
  it("saves and returns the config", async () => {
    const res = await PUT(putRequest({ baseUrl: "https://api.example/v1", model: "m1", apiKey: "k1" }));
    expect(res.status).toBe(200);
    expect((await res.json()).model).toBe("m1");
  });

  it("returns 400 for an invalid baseUrl", async () => {
    const res = await PUT(putRequest({ baseUrl: "not-a-url", model: "m1", apiKey: "k1" }));
    expect(res.status).toBe(400);
  });
});
