import "server-only";
import mongoose from "mongoose";
import { env, isProduction } from "../env";

/**
 * Mongoose connection, cached across hot reloads.
 *
 * In development Next re-evaluates modules on every edit. Without this cache each reload
 * would open a fresh pool and Mongo would eventually refuse connections, so the promise
 * is parked on `globalThis` — the one place module reloading does not reach.
 */
declare global {
  var __campusLoopMongoose: { promise: Promise<typeof mongoose> | null } | undefined;
}

const cache = (globalThis.__campusLoopMongoose ??= { promise: null });

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.promise) return cache.promise;

  cache.promise = mongoose
    .connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DB_NAME,
      serverSelectionTimeoutMS: 5_000,
      maxPoolSize: 10,
      readConcern: { level: "majority" },
      writeConcern: { w: "majority" },
      // Index building is a deploy step in production (`npm run db:indexes`), not
      // something to do on the request path.
      autoIndex: !isProduction,
    })
    .catch((error: unknown) => {
      // Clear the cache so the next request retries instead of forever awaiting a
      // promise that already rejected.
      cache.promise = null;
      throw error;
    });

  return cache.promise;
}
