import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// The Prisma CLI reads `.env` by default; this project keeps its local secrets in
// `.env.local`, which is what Next reads too.
loadEnv({ path: ".env.local", quiet: true });

/**
 * Prisma 7 moved the connection URL out of schema.prisma. This is what `prisma migrate`
 * and `prisma db push` read; the runtime client gets its connection from the driver
 * adapter in `src/shared/db/connection.ts`.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL_UNPOOLED || env("DATABASE_URL") },
});
