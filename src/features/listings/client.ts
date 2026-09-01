/**
 * Client-safe half of the listings feature.
 *
 * `index.ts` is `server-only` because it wires up Mongo repositories — importing it from a
 * `"use client"` component drags mongoose into the browser bundle and fails the build.
 * This barrel re-exports only the pure domain vocabulary: constants, labels, types and
 * total functions with no I/O.
 *
 * If you are on the server, import from `@/features/listings` instead.
 */
export {
  CATEGORIES,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  CONDITIONS,
  CONDITION_LABELS,
  MODES,
  MODE_LABELS,
  RENT_UNITS,
  RENT_UNIT_SUFFIX,
  isCategory,
  isCondition,
  isMode,
  priceRuleFor,
  swatchForKey,
  validatePrice,
  type Category,
  type Condition,
  type Mode,
  type RentUnit,
  type Swatch,
} from "./domain/listing";

export type { ListingCardView, ListingDetailView } from "./application/listing-views";
