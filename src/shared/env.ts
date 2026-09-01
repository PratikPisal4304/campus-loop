import "server-only";
import { z } from "zod";
import { ConfigurationError } from "@/core/domain/errors";

/**
 * Server-side environment, validated once at module load.
 *
 * `next build` runs with NODE_ENV=production but has no access to real secrets, so the
 * required-secret check is skipped during the build phase and enforced at boot instead.
 * Do not "fix" a failing build by baking secrets into the image.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017/?replicaSet=rs0"),
  MONGODB_DB_NAME: z.string().min(1).default("campus_loop"),

  AUTH_SECRET: z.string().default(""),
  AUTH_URL: z.string().default("http://localhost:3000"),

  CLOUDINARY_CLOUD_NAME: z.string().default(""),
  CLOUDINARY_API_KEY: z.string().default(""),
  CLOUDINARY_API_SECRET: z.string().default(""),
  CLOUDINARY_UPLOAD_FOLDER: z.string().default("campus-loop"),

  SEED_PASSWORD: z.string().default("campus1234"),
});

/** Without these the app cannot serve a single authenticated request in production. */
const PRODUCTION_REQUIRED = ["MONGODB_URI", "AUTH_SECRET"] as const;

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const detail = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new ConfigurationError(`Invalid environment: ${detail}`);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";

const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

if (isProduction && !isBuildPhase) {
  const missing = PRODUCTION_REQUIRED.filter((key) => env[key].length === 0);
  if (missing.length > 0) {
    throw new ConfigurationError(
      `Missing required production environment: ${missing.join(", ")}`,
    );
  }
}

/**
 * Read an optional secret at the point of use, failing loudly instead of silently
 * degrading. Cloudinary is optional in development — listings fall back to their colour
 * swatch — but if something asks for the key it had better be there.
 */
export function requireEnv(key: keyof typeof env): string {
  const value = env[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new ConfigurationError(`Missing required environment variable: ${key}`);
  }
  return value;
}

/** Cloudinary is wired only when fully configured; callers degrade gracefully otherwise. */
export const hasCloudinary =
  env.CLOUDINARY_CLOUD_NAME.length > 0 &&
  env.CLOUDINARY_API_KEY.length > 0 &&
  env.CLOUDINARY_API_SECRET.length > 0;
