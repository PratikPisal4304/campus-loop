import type { EntityId } from "@/core/types/branded";

/**
 * One student's rating of another, for one deal.
 *
 * A review is tied to a `listingId` rather than floating free against a person: it is the
 * handoff that is being rated, which is what makes "one review per rater per listing"
 * a meaningful rule instead of an arbitrary rate limit.
 */
export interface Review {
  readonly id: EntityId;
  readonly stars: Stars;
  readonly comment: string | null;
  readonly raterId: EntityId;
  readonly subjectId: EntityId;
  readonly listingId: EntityId;
  readonly createdAt: Date;
}

export const STARS_MIN = 1;
export const STARS_MAX = 5;

/** The whole scale, in the order the UI renders it. */
export const STAR_CHOICES = [1, 2, 3, 4, 5] as const;
export type Stars = (typeof STAR_CHOICES)[number];

export const MAX_COMMENT_LENGTH = 400;

export function isStars(value: number): value is Stars {
  return Number.isInteger(value) && value >= STARS_MIN && value <= STARS_MAX;
}

/**
 * The pair of numbers `User.ratingSum` / `ratingCount` hold.
 *
 * Sum and count rather than an average, because an average cannot be updated
 * incrementally without drifting and it throws away the sample size that
 * `trustScoreFor` needs to decide whether a rating means anything yet.
 */
export interface RatingTotals {
  readonly sum: number;
  readonly count: number;
}

export const NO_RATINGS: RatingTotals = { sum: 0, count: 0 };

/**
 * Recompute a subject's totals from their reviews.
 *
 * Deliberately a full recount rather than `sum += stars`: an incremented counter and a
 * deleted review drift apart silently, and the drift is invisible — the profile just
 * shows a number nobody can reproduce. Reviews per student are in the tens, so the cost
 * of being able to prove the number is right is nothing.
 */
export function totalsFrom(reviews: readonly Pick<Review, "stars">[]): RatingTotals {
  return {
    sum: reviews.reduce((total, review) => total + review.stars, 0),
    count: reviews.length,
  };
}

/** The plain average, or null when there is nothing to average. */
export function averageOf(totals: RatingTotals): number | null {
  if (totals.count === 0) return null;
  return Math.round((totals.sum / totals.count) * 10) / 10;
}

/**
 * Why a rating was refused. Codes, not sentences, so the use case can map them to a
 * `Result` and the UI can decide how loudly to say it.
 */
export type ReviewRefusal = "SELF_REVIEW" | "NOT_A_COUNTERPARTY" | "ALREADY_REVIEWED";

export interface ReviewEligibility {
  readonly raterId: EntityId;
  readonly subjectId: EntityId;
  /** Did these two actually talk about this listing? Established by a port, not claimed. */
  readonly wereCounterparties: boolean;
  readonly alreadyReviewed: boolean;
}

/**
 * Who is allowed to rate whom.
 *
 * Ratings are the only number on this site that a stranger reads as a promise, so the bar
 * is a real interaction: you may rate the person you were in a conversation with about
 * that listing, once. Without the counterparty check a rating is just an anonymous
 * opinion form, and a handful of throwaway accounts can make anyone "Excellent".
 */
export function canReview(input: ReviewEligibility): ReviewRefusal | null {
  if (input.raterId === input.subjectId) return "SELF_REVIEW";
  if (!input.wereCounterparties) return "NOT_A_COUNTERPARTY";
  if (input.alreadyReviewed) return "ALREADY_REVIEWED";
  return null;
}

/** Returns an error message to show, or null when the star value is usable. */
export function validateStars(stars: number): string | null {
  return isStars(stars) ? null : `Pick a rating from ${STARS_MIN} to ${STARS_MAX} stars.`;
}

/** Returns an error message to show, or null when the comment is fine. */
export function validateComment(comment: string): string | null {
  const trimmed = comment.trim();
  if (trimmed.length > MAX_COMMENT_LENGTH) {
    return `Keep it under ${MAX_COMMENT_LENGTH} characters — that's ${trimmed.length}.`;
  }
  return null;
}

/** Empty becomes null: "left blank" and "cleared" are one state, not two. */
export function normaliseComment(comment: string | null | undefined): string | null {
  return comment?.trim() || null;
}
