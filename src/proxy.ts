import NextAuth from "next-auth";
import { authConfig } from "@/features/accounts/infrastructure/auth.config";

/**
 * Next 16's renamed middleware. It runs on the edge, so it uses the provider-free,
 * database-free half of the Auth.js config — see auth.config.ts.
 *
 * This is only the first of three authorization layers: it gates navigation cheaply, but
 * it does NOT run for direct server-action calls. Protected layouts call `requireUser()`,
 * and so does every mutating action.
 *
 * The deep import is deliberate and is the one place it is allowed: the feature barrel is
 * `server-only`, so importing it here would drag Mongoose into the edge bundle.
 */
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
