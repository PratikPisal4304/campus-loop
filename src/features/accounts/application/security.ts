import { fail, ok, type Result } from "@/core/domain/result";
import type { EntityId } from "@/core/types/branded";
import { validatePassword } from "../domain/password";
import type { AccountDeps } from "./register";

export interface ChangePasswordInput {
  readonly currentPassword: string;
  readonly newPassword: string;
}

/**
 * Change a signed-in student's password.
 *
 * The current password is re-verified even though the session already proves who they
 * are: a session cookie left open on a shared library machine is the exact scenario this
 * form is dangerous in, and knowing the old password is what separates the owner from
 * whoever sat down next.
 */
export async function changePassword(
  deps: AccountDeps,
  id: EntityId,
  input: ChangePasswordInput,
): Promise<Result<null>> {
  const policyError = validatePassword(input.newPassword);
  if (policyError) {
    return fail("WEAK_PASSWORD", policyError, { newPassword: policyError });
  }

  if (input.newPassword === input.currentPassword) {
    return fail("PASSWORD_UNCHANGED", "That's already your password.", {
      newPassword: "Choose a password you haven't used here before.",
    });
  }

  const found = await deps.users.findCredentialsById(id);
  if (!found) return fail("NOT_FOUND", "We couldn't find your account.");

  const valid = await deps.hasher.verify(input.currentPassword, found.passwordHash);
  if (!valid) {
    return fail("INVALID_CREDENTIALS", "That's not your current password.", {
      currentPassword: "That's not your current password.",
    });
  }

  const updated = await deps.users.updatePasswordHash(
    id,
    await deps.hasher.hash(input.newPassword),
  );
  if (!updated) return fail("NOT_FOUND", "We couldn't find your account.");

  return ok(null);
}

/**
 * Delete an account and everything hanging off it.
 *
 * Irreversible, so it costs the password as well as the session — the same reasoning as
 * `changePassword`, with a worse outcome if it is wrong. The cascades in the schema take
 * care of listings, saved items, threads and reports.
 */
export async function deleteAccount(
  deps: AccountDeps,
  id: EntityId,
  password: string,
): Promise<Result<null>> {
  const found = await deps.users.findCredentialsById(id);
  if (!found) return fail("NOT_FOUND", "We couldn't find your account.");

  const valid = await deps.hasher.verify(password, found.passwordHash);
  if (!valid) {
    return fail("INVALID_CREDENTIALS", "That password isn't right.", {
      password: "That password isn't right.",
    });
  }

  const deleted = await deps.users.delete(id);
  if (!deleted) return fail("NOT_FOUND", "We couldn't find your account.");

  return ok(null);
}
