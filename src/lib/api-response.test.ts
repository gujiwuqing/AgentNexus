import { describe, it, expect } from "vitest";
import { apiError, apiOk } from "./api-response";

describe("apiOk", () => {
  it("returns a 200 JSON response with the given data", async () => {
    const res = apiOk({ foo: "bar" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ foo: "bar" });
  });

  it("supports a custom status", async () => {
    const res = apiOk({ id: "1" }, 201);
    expect(res.status).toBe(201);
  });
});

describe("apiError", () => {
  it("returns an error-shaped JSON response with the given status", async () => {
    const res = apiError(404, "not_found", "Agent not found");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: "not_found", message: "Agent not found" },
    });
  });
});
