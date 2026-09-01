import "server-only";
import { UnauthenticatedError } from "@/core/domain/errors";
import { toEmail, toEntityId, type EntityId } from "@/core/types/branded";
import type { Role } from "../domain/user";
import { auth } from "./auth";

export interface SessionUser {
  readonly id: EntityId;
  readonly name: string;
  readonly email: string;
  readonly role: Role;
}

/** The signed-in student, or null. Server-side only — there is no `useSession` here. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: toEntityId(session.user.id),
    name: session.user.name,
    email: toEmail(session.user.email),
    role: session.user.role ?? "student",
  };
}

/**
 * Assert a signed-in student.
 *
 * Every server action calls this itself. `proxy.ts` gates *navigation*, but it does not
 * run for a direct server-action invocation — so relying on the proxy alone would leave
 * every mutation open to anyone who can POST.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthenticatedError();
  return user;
}
