import type { NextAuthConfig } from "next-auth";
import type { Role } from "../domain/user";

/**
 * The EDGE half of the Auth.js setup.
 *
 * `src/proxy.ts` runs on the edge runtime, where Mongoose and bcrypt cannot go. So this
 * file deliberately holds no providers and no database access — just the session shape
 * and the route rules. The Node half (auth.ts) spreads this and adds the provider.
 *
 * The `session` callback MUST live here, not in auth.ts. The edge instance builds its own
 * session from this config alone; without this callback it would hand `proxy.ts` a
 * session with no `id`, and every ownership check downstream would silently see
 * `undefined` instead of the signed-in student.
 */
declare module "next-auth" {
  interface User {
    role?: Role;
  }
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
    };
  }
}

/**
 * Augmented on `@auth/core/jwt`, not `next-auth/jwt`: the latter is a bare
 * `export * from "@auth/core/jwt"` and declares no interface of its own, so TypeScript
 * refuses to augment it ("Invalid module name in augmentation").
 */
declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
    role?: Role;
  }
}

/**
 * Route roots that require a signed-in student. Everything else is public to browse.
 *
 * Matched by whole path segment, not by string prefix. `startsWith("/listings/new")` also
 * matched `/listings/new-lab-coat` — a real, public listing page that demanded a login
 * purely because of how its title slugged.
 */
const PROTECTED_ROOTS = [
  "/loop",
  "/saved",
  "/messages",
  "/settings",
  "/admin",
  "/listings/new",
];

function isUnder(pathname: string, root: string): boolean {
  return pathname === root || pathname.startsWith(`${root}/`);
}

export const authConfig = {
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const needsAuth =
        PROTECTED_ROOTS.some((root) => isUnder(pathname, root)) ||
        // /listings/[slug]/edit, but not /listings/[slug]
        /^\/listings\/[^/]+\/edit$/.test(pathname);
      if (!needsAuth) return true;
      return Boolean(auth?.user);
    },

    session({ session, token }) {
      if (token.uid) session.user.id = token.uid;
      if (token.role) session.user.role = token.role;
      return session;
    },
  },
} satisfies NextAuthConfig;
