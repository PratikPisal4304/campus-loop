import "server-only";
import pino from "pino";
import { env, isDevelopment } from "./env";

/**
 * Application logger.
 *
 * The redact list is not decoration — a marketplace logs form submissions and auth
 * attempts, and an unredacted `password` in a log file is a breach waiting to be found.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "password",
      "passwordHash",
      "confirmPassword",
      "*.password",
      "*.passwordHash",
      "*.signature",
      "req.headers.authorization",
      "req.headers.cookie",
    ],
    censor: "[redacted]",
  },
  ...(isDevelopment
    ? { transport: { target: "pino-pretty", options: { colorize: true } } }
    : {}),
});

/** A child logger tagged with the feature it belongs to, e.g. featureLogger("messaging"). */
export function featureLogger(feature: string) {
  return logger.child({ feature });
}
