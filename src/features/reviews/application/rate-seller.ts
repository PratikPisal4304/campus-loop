import { fail, ok, type Result } from "@/core/domain/result";
import type { UnitOfWork } from "@/core/domain/unit-of-work";
import type { EntityId } from "@/core/types/branded";
import type {
  Deal,
  DealLookup,
  RatingTotalsStore,
  RaterLookup,
  ReviewRepository,
} from "../domain/ports";
import {
  averageOf,
  canReview,
  isStars,
  normaliseComment,
  totalsFrom,
  validateComment,
  validateStars,
  type RatingTotals,
  type Review,
  type ReviewRefusal,
} from "../domain/review";

export interface ReviewDeps {
  readonly reviews: ReviewRepository;
  readonly totals: RatingTotalsStore;
  /** Establishes that the rater and the subject actually dealt with each other. */
  readonly deals: DealLookup;
  readonly raters: RaterLookup;
  /**
   * Runs `work` atomically. A plain function rather than an import of
   * `@/shared/db/transaction`, so this layer never sees Prisma: the barrel injects the
   * real `withUnitOfWork`, tests inject one that just calls the callback.
   */
  readonly runInTransaction: <T>(work: (uow: UnitOfWork) => Promise<T>) => Promise<T>;
}

/** One review as a profile renders it — the rater is a person here, not an id. */
export interface ReviewView {
  readonly id: string;
  readonly stars: number;
  readonly comment: string | null;
  readonly raterId: string;
  /** Falls back to "A student" for an account that has since been deleted. */
  readonly raterName: string;
  readonly listingId: string;
  readonly createdAt: Date;
}

/** A listing the viewer may still rate this student for. */
export interface RateableDeal {
  readonly listingId: string;
  readonly listingTitle: string;
}

const REFUSALS: Record<ReviewRefusal, { code: string; message: string }> = {
  SELF_REVIEW: {
    code: "SELF_REVIEW",
    message: "You can't rate yourself.",
  },
  NOT_A_COUNTERPARTY: {
    code: "NOT_A_COUNTERPARTY",
    message:
      "You can only rate someone you've dealt with — complete a confirmed handoff first.",
  },
  ALREADY_REVIEWED: {
    code: "ALREADY_REVIEWED",
    message: "You've already rated this student for that item.",
  },
};

export interface RateSellerInput {
  readonly raterId: EntityId;
  readonly subjectId: EntityId;
  readonly listingId: EntityId;
  readonly stars: number;
  readonly comment?: string | null;
}

/**
 * Leave a rating for the person on the other side of a deal.
 *
 * The counterparty check is the whole point: `User.ratingSum` is read on every listing
 * card and every profile, so anything that can write it without a real interaction behind
 * it turns the trust score back into decoration.
 */
export async function rateSeller(
  deps: ReviewDeps,
  input: RateSellerInput,
): Promise<Result<ReviewView>> {
  // `isStars` also narrows, so the value reaches the repository as a `Stars` without a cast.
  if (!isStars(input.stars)) {
    const message = validateStars(input.stars) ?? "That rating isn't valid.";
    return fail("INVALID_STARS", message, { stars: message });
  }
  const stars = input.stars;

  const comment = normaliseComment(input.comment);
  if (comment) {
    const commentError = validateComment(comment);
    if (commentError) return fail("INVALID_COMMENT", commentError, { comment: commentError });
  }

  // Both facts are gathered before the policy runs, so the policy itself stays a pure
  // function of what is true rather than a sequence of awaits with rules hidden between.
  const [wereCounterparties, existing] = await Promise.all([
    deps.deals.wereCounterparties(input.listingId, input.raterId, input.subjectId),
    deps.reviews.findByRaterAndListing(input.raterId, input.listingId),
  ]);

  const refusal = canReview({
    raterId: input.raterId,
    subjectId: input.subjectId,
    wereCounterparties,
    alreadyReviewed: existing !== null,
  });
  if (refusal) {
    const { code, message } = REFUSALS[refusal];
    return fail(code, message);
  }

  /**
   * The review row and the subject's totals are one fact stored twice. Written apart, a
   * crash between them leaves a profile whose average nobody can derive from the reviews
   * printed underneath it — the exact kind of number students stop believing.
   */
  const created = await deps.runInTransaction(async (uow) => {
    const review = await deps.reviews.create(
      {
        stars,
        comment,
        raterId: input.raterId,
        subjectId: input.subjectId,
        listingId: input.listingId,
      },
      uow,
    );
    const all = await deps.reviews.listAllForSubject(input.subjectId, uow);
    await deps.totals.set(input.subjectId, totalsFrom(all), uow);
    return review;
  });

  return ok(await toView(deps, created));
}

/** The reviews a student has received, newest first. */
export async function listReviewsFor(
  deps: ReviewDeps,
  subjectId: EntityId,
  limit?: number,
): Promise<readonly ReviewView[]> {
  const reviews = await deps.reviews.listForSubject(subjectId, limit);
  return Promise.all(reviews.map((review) => toView(deps, review)));
}

/**
 * Which of their shared deals the viewer may still rate this student for.
 *
 * Drives the picker in the rating form: offering a listing the viewer cannot rate would
 * mean the only way to discover the rule is to be refused by it.
 */
export async function listRateableDeals(
  deps: ReviewDeps,
  raterId: EntityId,
  subjectId: EntityId,
): Promise<readonly RateableDeal[]> {
  if (raterId === subjectId) return [];

  const deals = await deps.deals.sharedDeals(raterId, subjectId);
  const open = await Promise.all(
    deals.map(async (deal: Deal) => {
      const existing = await deps.reviews.findByRaterAndListing(raterId, deal.listingId);
      return existing ? null : deal;
    }),
  );

  return open
    .filter((deal): deal is Deal => deal !== null)
    .map((deal) => ({ listingId: deal.listingId, listingTitle: deal.listingTitle }));
}

/** The totals as stored, plus the average — for anything that wants the number directly. */
export async function getRatingSummary(
  deps: ReviewDeps,
  subjectId: EntityId,
): Promise<RatingTotals & { readonly average: number | null }> {
  const reviews = await deps.reviews.listAllForSubject(subjectId);
  const totals = totalsFrom(reviews);
  return { ...totals, average: averageOf(totals) };
}

async function toView(deps: ReviewDeps, review: Review): Promise<ReviewView> {
  const raterName = await deps.raters.nameFor(review.raterId);
  return {
    id: review.id,
    stars: review.stars,
    comment: review.comment,
    raterId: review.raterId,
    raterName: raterName ?? "A student",
    listingId: review.listingId,
    createdAt: review.createdAt,
  };
}
