import { fail, ok, type Result } from "@/core/domain/result";
import { toEmail } from "@/core/types/branded";
import type { PasswordHasher, UserRepository } from "../domain/ports";
import type { User } from "../domain/user";

export interface AccountDeps {
  readonly users: UserRepository;
  readonly hasher: PasswordHasher;
}

export interface RegisterInput {
  readonly name: string;
  readonly email: string;
  readonly password: string;
}

export async function register(deps: AccountDeps, input: RegisterInput): Promise<Result<User>> {
  const email = toEmail(input.email);

  if (await deps.users.emailExists(email)) {
    // Registration is a form the user is actively filling in, so naming the conflict is
    // the right trade-off — unlike sign-in, where the same detail would be an oracle.
    return fail("EMAIL_TAKEN", "An account with this email already exists.", {
      email: "That email is already registered. Log in instead?",
    });
  }

  const passwordHash = await deps.hasher.hash(input.password);
  const user = await deps.users.create({ name: input.name.trim(), email, passwordHash });
  return ok(user);
}

/**
 * Verify a sign-in attempt.
 *
 * Returns the same failure whether the email is unknown or the password is wrong: telling
 * them apart turns the login form into a "does this person have an account here" oracle.
 */
export async function verifyCredentials(
  deps: AccountDeps,
  input: { email: string; password: string },
): Promise<Result<User>> {
  const email = toEmail(input.email);
  const found = await deps.users.findCredentialsByEmail(email);

  if (!found) {
    // Still spend the time hashing. Returning early on an unknown email makes the
    // response measurably faster, which leaks exactly what we just refused to say.
    await deps.hasher.hash(input.password);
    return fail("INVALID_CREDENTIALS", "That email and password don't match.");
  }

  const valid = await deps.hasher.verify(input.password, found.passwordHash);
  if (!valid) return fail("INVALID_CREDENTIALS", "That email and password don't match.");

  return ok(found.user);
}
