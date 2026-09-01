/**
 * Client-safe half of the reviews feature.
 *
 * `index.ts` is `server-only` because it wires up Prisma adapters — importing it from a
 * `"use client"` component fails the build. This barrel re-exports only the pure domain
 * vocabulary: constants, types and total functions with no I/O.
 *
 * If you are on the server, import from `@/features/reviews` instead.
 */
export {
  MAX_COMMENT_LENGTH,
  STARS_MAX,
  STARS_MIN,
  STAR_CHOICES,
  averageOf,
  isStars,
  validateComment,
  validateStars,
  type RatingTotals,
  type Stars,
} from "./domain/review";

export type { RateableDeal, ReviewView } from "./application/rate-seller";
