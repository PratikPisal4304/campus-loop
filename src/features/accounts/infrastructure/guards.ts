import "server-only";
import { notFound, redirect } from "next/navigation";
import { ForbiddenError, UnauthenticatedError } from "@/core/domain/errors";
import { toEmail, toEntityId, type EntityId } from "@/core/types/branded";
import { publicEnv } from "@/shared/env.public";
import { safeInternalPath } from "@/shared/safe-path";
import type { Role } from "../domain/user";
import { auth } from "./auth";
import { prisma } from "@/shared/db/connection";
import { isRole } from "../domain/user";

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
  const current = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      suspendedAt: true,
      sessionVersion: true,
    },
  });
  if (
    !current ||
    current.suspendedAt ||
    current.sessionVersion !== (session.user.sessionVersion ?? 0)
  )
    return null;
  return {
    id: toEntityId(session.user.id),
    name: current.name,
    email: toEmail(current.email),
    role: isRole(current.role) ? current.role : "student",
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
 * Assert a signed-in student holding a particular role.
 *
 * Roles, suspension and session versions are read from the database on every request,
 * so a previously issued JWT cannot bypass account suspension or password recovery.
 */
export async function requireRole(role: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== role) throw new ForbiddenError();
  return user;
}

/**
 * The same check for a page, answering with a 404 instead of a 403.
 *
 * A "you are not an admin" screen confirms that an admin surface exists at this URL and
 * invites someone to go looking for a way in. A student who wanders onto /admin should
 * see what a student sees for any URL that is not theirs: nothing here.
 */
export async function requireRoleOrNotFound(role: Role): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || user.role !== role) notFound();
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
