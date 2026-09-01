import "server-only";
import { redirect } from "next/navigation";
import { UnauthenticatedError } from "@/core/domain/errors";
import { toEmail, toEntityId, type EntityId } from "@/core/types/branded";
import { publicEnv } from "@/shared/env.public";
import { safeInternalPath } from "@/shared/safe-path";
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

/**
 * The same guard, but for anything a student triggers from the UI.
 *
 * A bare `requireUser()` throw becomes the generic "That didn't work" error screen, with
 * the form contents gone and no hint that the session simply expired. Sending them to
 * login with the destination attached means they carry on where they left off.
 */
export async function requireUserOrRedirect(returnTo?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (user) return user;

  const target = safeInternalPath(returnTo, publicEnv.siteUrl);
  redirect(target === "/" ? "/login" : `/login?next=${encodeURIComponent(target)}`);
}
