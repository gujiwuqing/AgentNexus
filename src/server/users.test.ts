import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables } from "@/db/test-helpers";
import { createUser, getUserByEmail, toSafeUser } from "./users";

afterEach(clearAllTables);

describe("users", () => {
  it("creates a user with hashed password and strips it in safe view", async () => {
    const row = await createUser({ email: "A@B.com", password: "pw12345", name: "A", role: "admin" });
    expect(row?.passwordHash).toBeTruthy();
    expect(row?.passwordHash).not.toBe("pw12345");
    const safe = toSafeUser(row!);
    expect(safe.email).toBe("A@B.com");
    expect(safe.role).toBe("admin");
    expect((safe as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it("finds user by email as stored", async () => {
    await createUser({ email: "a@b.com", password: "pw12345", name: "A", role: "user" });
    expect(await getUserByEmail("a@b.com")).toBeTruthy();
    expect(await getUserByEmail("x@y.com")).toBeNull();
  });
});
