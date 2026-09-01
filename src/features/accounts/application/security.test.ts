import { describe, expect, it, vi } from "vitest";
import { toEmail, toEntityId, type EntityId } from "@/core/types/branded";
import type { PasswordHasher, UserRepository } from "../domain/ports";
import type { User } from "../domain/user";
import type { AccountDeps } from "./register";
import { changePassword, deleteAccount } from "./security";

const alex: User = {
  id: toEntityId("507f1f77bcf86cd799439011"),
  name: "Alex Rivera",
  email: toEmail("alex@campus.edu"),
  role: "student",
  bio: null,
  campusArea: null,
  ratingSum: 0,
  ratingCount: 0,
  createdAt: new Date("2026-01-01"),
};

const digest = (plain: string) => `scrambled:${[...plain].reverse().join("")}`;

const fakeHasher: PasswordHasher = {
  hash: async (plain) => digest(plain),
  verify: async (plain, hash) => hash === digest(plain),
};

const CURRENT = "oldpass123";

function makeDeps(overrides: Partial<UserRepository> = {}): AccountDeps {
  const users: UserRepository = {
    findById: async () => alex,
    findByEmail: async () => null,
    findCredentialsByEmail: async () => null,
    findCredentialsById: async () => ({ user: alex, passwordHash: digest(CURRENT) }),
    emailExists: async () => false,
    create: async () => alex,
    updateProfile: async () => alex,
    updatePasswordHash: async () => true,
    delete: async () => true,
    ...overrides,
  };
  return { users, hasher: fakeHasher };
}

describe("changePassword", () => {
  it("stores a hash of the new password, never the password itself", async () => {
    const updatePasswordHash = vi.fn(async (_id: EntityId, _hash: string) => true);
    const result = await changePassword(makeDeps({ updatePasswordHash }), alex.id, {
      currentPassword: CURRENT,
      newPassword: "brandnew42",
    });

    expect(result.ok).toBe(true);
    expect(updatePasswordHash).toHaveBeenCalledWith(alex.id, digest("brandnew42"));
    const stored = updatePasswordHash.mock.calls[0]?.[1] ?? "";
    expect(stored).not.toContain("brandnew42");
  });

  it("refuses a new password that fails the signup policy, before touching the database", async () => {
    const findCredentialsById = vi.fn();
    const result = await changePassword(makeDeps({ findCredentialsById }), alex.id, {
      currentPassword: CURRENT,
      newPassword: "short1",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("WEAK_PASSWORD");
    expect(result.error.details?.newPassword).toBeDefined();
    expect(findCredentialsById).not.toHaveBeenCalled();
  });

  it("refuses to re-set the same password", async () => {
    const result = await changePassword(makeDeps(), alex.id, {
      currentPassword: CURRENT,
      newPassword: CURRENT,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("PASSWORD_UNCHANGED");
  });

  it("refuses when the current password is wrong — a session alone is not enough", async () => {
    const updatePasswordHash = vi.fn(async () => true);
    const result = await changePassword(makeDeps({ updatePasswordHash }), alex.id, {
      currentPassword: "notmypassword1",
      newPassword: "brandnew42",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_CREDENTIALS");
    expect(updatePasswordHash).not.toHaveBeenCalled();
  });

  it("fails rather than throwing when the account vanished mid-request", async () => {
    const result = await changePassword(
      makeDeps({ findCredentialsById: async () => null }),
      alex.id,
      { currentPassword: CURRENT, newPassword: "brandnew42" },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("NOT_FOUND");
  });
});

describe("deleteAccount", () => {
  it("deletes once the password checks out", async () => {
    const remove = vi.fn(async () => true);
    const result = await deleteAccount(makeDeps({ delete: remove }), alex.id, CURRENT);

    expect(result.ok).toBe(true);
    expect(remove).toHaveBeenCalledWith(alex.id);
  });

  it("does not delete on a wrong password", async () => {
    const remove = vi.fn(async () => true);
    const result = await deleteAccount(makeDeps({ delete: remove }), alex.id, "guess1234");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_CREDENTIALS");
    expect(remove).not.toHaveBeenCalled();
  });
});
