import "server-only";
import type { EntityId } from "@/core/types/branded";
import { getProfile } from "@/features/accounts";
import { withUnitOfWork } from "@/shared/db/transaction";
import * as reviews from "./application/rate-seller";
import { PrismaDealLookup } from "./infrastructure/deal.lookup";
import {
  PrismaRatingTotalsStore,
  PrismaReviewRepository,
} from "./infrastructure/review.repository";

/**
 * Public API of the reviews feature.
 *
 * Also the composition root: it binds the Prisma adapters — and the Prisma transaction
 * runner — to the use cases, which is what keeps `withUnitOfWork` out of the application
 * layer. Nothing outside this folder may import a deeper path.
 */
const deps: reviews.ReviewDeps = {
  reviews: new PrismaReviewRepository(),
  totals: new PrismaRatingTotalsStore(),
  deals: new PrismaDealLookup(),
  // Bound to the accounts feature through its public barrel. One lookup per rendered
  // review, and a profile renders a page of them at a time — cheap enough that a
  // dedicated denormalised name column would only be another thing to keep in sync.
  raters: {
    nameFor: async (userId: EntityId) => (await getProfile(userId))?.name ?? null,
  },
  runInTransaction: withUnitOfWork,
};

export const rateSeller = (input: reviews.RateSellerInput) => reviews.rateSeller(deps, input);

export const listReviewsFor = (subjectId: EntityId, limit?: number) =>
  reviews.listReviewsFor(deps, subjectId, limit);

export const listRateableDeals = (raterId: EntityId, subjectId: EntityId) =>
  reviews.listRateableDeals(deps, raterId, subjectId);

export const getRatingSummary = (subjectId: EntityId) =>
  reviews.getRatingSummary(deps, subjectId);

export type {
  RateSellerInput,
  RateableDeal,
  ReviewDeps,
  ReviewView,
} from "./application/rate-seller";

export {
  MAX_COMMENT_LENGTH,
  STARS_MAX,
  STARS_MIN,
  STAR_CHOICES,
  averageOf,
  canReview,
  isStars,
  totalsFrom,
  type RatingTotals,
  type Review,
  type ReviewRefusal,
  type Stars,
} from "./domain/review";
