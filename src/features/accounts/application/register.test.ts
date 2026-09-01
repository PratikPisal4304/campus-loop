import { describe, expect, it, vi } from "vitest";
import { toEmail, toEntityId, type Email } from "@/core/types/branded";
import type { CreateUserInput, PasswordHasher, UserRepository } from "../domain/ports";
import type { User } from "../domain/user";
import { register, verifyCredentials, type AccountDeps } from "./register";

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

/**
 * A fake hasher so the tests do not pay bcrypt's deliberate slowness.
 *
 * It reverses rather than prefixing, so the "hash" never contains the plaintext as a
 * substring — otherwise the leak assertion below would pass or fail for the wrong reason.
 */
const digest = (plain: string) => `scrambled:${[...plain].reverse().join("")}`;

const fakeHasher: PasswordHasher = {
  hash: async (plain) => digest(plain),
  verify: async (plain, hash) => hash === digest(plain),
};

function makeDeps(overrides: Partial<UserRepository> = {}): AccountDeps {
  const users: UserRepository = {
    findById: async () => null,
    findByEmail: async () => null,
    findCredentialsByEmail: async () => null,
    emailExists: async () => false,
    create: async (input: CreateUserInput) => ({ ...alex, name: input.name, email: input.email }),
    updateProfile: async () => null,
    ...overrides,
  };
  return { users, hasher: fakeHasher };
}

describe("register", () => {
  it("hashes the password rather than storing it, unlike the prototype's localStorage", async () => {
    const create = vi.fn(async (_input: CreateUserInput) => alex);
    const result = await register(makeDeps({ create }), {
      name: "Alex Rivera",
      email: "alex@campus.edu",
      password: "campus1234",
    });

    expect(result.ok).toBe(true);
    const passed = create.mock.calls[0]?.[0];
    expect(passed?.passwordHash).toBe(digest("campus1234"));
    expect(JSON.stringify(passed)).not.toContain("campus1234");
  });

  it("normalises the email before storing it", async () => {
    const create = vi.fn(async (_input: CreateUserInput) => alex);
    await register(makeDeps({ create }), {
      name: "Alex",
      email: "  Alex@Campus.EDU  ",
      password: "campus1234",
    });
    expect(create.mock.calls[0]?.[0]?.email).toBe("alex@campus.edu");
  });

  it("refuses a duplicate email with a field-level message", async () => {
    const result = await register(makeDeps({ emailExists: async () => true }), {
      name: "Alex",
      email: "alex@campus.edu",
      password: "campus1234",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("EMAIL_TAKEN");
      expect(result.error.details?.email).toBeDefined();
    }
  });
});

describe("verifyCredentials", () => {
  const withUser = (passwordHash: string) =>
    makeDeps({
      findCredentialsByEmail: async (email: Email) =>
        email === alex.email ? { user: alex, passwordHash } : null,
    });

  it("accepts the right password", async () => {
    const result = await verifyCredentials(withUser(digest("campus1234")), {
      email: "alex@campus.edu",
      password: "campus1234",
    });
    expect(result.ok).toBe(true);
  });

  it("gives an identical answer for a wrong password and an unknown email", async () => {
    const wrongPassword = await verifyCredentials(withUser(digest("correct")), {
      email: "alex@campus.edu",
      password: "guess",
    });
    const unknownEmail = await verifyCredentials(withUser(digest("correct")), {
      email: "nobody@campus.edu",
      password: "guess",
    });

    expect(wrongPassword.ok).toBe(false);
    expect(unknownEmail.ok).toBe(false);
    // Identical code *and* message: anything else is an account-enumeration oracle.
    expect(unknownEmail).toEqual(wrongPassword);
  });

  it("still hashes on an unknown email, so the timing does not give the answer away", async () => {
    const hash = vi.fn(fakeHasher.hash);
    const deps: AccountDeps = { ...makeDeps(), hasher: { ...fakeHasher, hash } };
    await verifyCredentials(deps, { email: "nobody@campus.edu", password: "guess" });
    expect(hash).toHaveBeenCalledOnce();
  });
});
