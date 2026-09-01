import { fail, ok, type Result } from "@/core/domain/result";
import type { EntityId } from "@/core/types/branded";
import { initialsFor, trustScoreFor, type TrustScore, type User } from "../domain/user";
import type { AccountDeps } from "./register";

/** What the UI needs about a person — never the whole entity, never a hash. */
export interface ProfileView {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  readonly bio: string | null;
  readonly campusArea: string | null;
  readonly trust: TrustScore;
  readonly joinedAt: Date;
}

export function toProfileView(user: User): ProfileView {
  return {
    id: user.id,
    name: user.name,
    initials: initialsFor(user.name),
    bio: user.bio,
    campusArea: user.campusArea,
    trust: trustScoreFor(user),
    joinedAt: user.createdAt,
  };
}

export async function getProfile(deps: AccountDeps, id: EntityId): Promise<ProfileView | null> {
  const user = await deps.users.findById(id);
  return user ? toProfileView(user) : null;
}

export interface UpdateProfileFormInput {
  readonly name: string;
  readonly bio: string;
  readonly campusArea: string;
}

export async function updateProfile(
  deps: AccountDeps,
  id: EntityId,
  input: UpdateProfileFormInput,
): Promise<Result<ProfileView>> {
  const updated = await deps.users.updateProfile(id, {
    name: input.name.trim(),
    // Empty strings become null so "cleared" and "never set" are the same state in the
    // database, rather than two states the UI has to tell apart.
    bio: input.bio.trim() || null,
    campusArea: input.campusArea.trim() || null,
  });

  if (!updated) return fail("NOT_FOUND", "We couldn't find your account.");
  return ok(toProfileView(updated));
}
