import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { env, isProduction } from "../env";

/**
 * The Prisma client, cached across hot reloads.
 *
 * In development Next re-evaluates modules on every edit. Without this cache each reload
 * would construct a fresh client and open its own connection pool until Postgres refused
 * new connections, so the instance is parked on `globalThis` — the one place module
 * reloading does not reach.
 */
declare global {
  var __campusLoopPrisma: PrismaClient | undefined;
}

/**
 * Prisma 7 connects through a driver adapter rather than its own engine binary. `pg`
 * speaks plain Postgres, so the same adapter serves local Docker and Neon in production —
 * Neon's pooled connection string is a standard Postgres URL.
 */
export const prisma: PrismaClient =
  globalThis.__campusLoopPrisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
    log: isProduction ? ["error"] : ["error", "warn"],
  });

if (!isProduction) {
  globalThis.__campusLoopPrisma = prisma;
}
