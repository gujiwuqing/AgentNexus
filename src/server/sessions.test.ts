import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables } from "@/db/test-helpers";
import { createUser } from "./users";
import { createSession, getSessionUser, deleteSession } from "./sessions";

afterEach(clearAllTables);

describe("sessions", () => {
  it("creates a session and resolves the user", async () => {
    const user = await createUser({ email: "a@b.com", password: "pw12345", name: "A", role: "user" });
    const session = await createSession(user!.id);
    expect(session.id).toHaveLength(64);
    const result = await getSessionUser(session.id);
    expect(result?.user.id).toBe(user!.id);
    expect(result?.user.email).toBe("a@b.com");
  });

  it("returns null for unknown session", async () => {
    expect(await getSessionUser("nonexistent")).toBeNull();
  });

  it("deletes a session", async () => {
    const user = await createUser({ email: "a@b.com", password: "pw12345", name: "A", role: "user" });
    const session = await createSession(user!.id);
    await deleteSession(session.id);
    expect(await getSessionUser(session.id)).toBeNull();
  });
});
