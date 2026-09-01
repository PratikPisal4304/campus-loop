import type { UnitOfWork } from "@/core/domain/unit-of-work";
import type { EntityId } from "@/core/types/branded";
import type { RatingTotals, Review, Stars } from "./review";

export interface CreateReviewInput {
  readonly stars: Stars;
  readonly comment: string | null;
  readonly raterId: EntityId;
  readonly subjectId: EntityId;
  readonly listingId: EntityId;
}

export interface ReviewRepository {
  /** The uniqueness rule, asked as a question: has this rater already rated this deal? */
  findByRaterAndListing(raterId: EntityId, listingId: EntityId): Promise<Review | null>;
  create(input: CreateReviewInput, uow?: UnitOfWork): Promise<Review>;
  /** Newest first — the order a profile reads them in. */
  listForSubject(subjectId: EntityId, limit?: number): Promise<readonly Review[]>;
  /**
   * Every review a subject has received, inside the same transaction as the write that
   * caused the recount — reading outside it would total a state that no longer exists.
   */
  listAllForSubject(subjectId: EntityId, uow?: UnitOfWork): Promise<readonly Review[]>;
}

/**
 * Where a subject's derived totals are stored.
 *
 * Separate from `ReviewRepository` because it writes a different aggregate — the person,
 * not the review — and the use case has to be able to see that it is two writes that must
 * land together.
 */
export interface RatingTotalsStore {
  set(subjectId: EntityId, totals: RatingTotals, uow?: UnitOfWork): Promise<void>;
}

export interface Deal {
  readonly listingId: EntityId;
  readonly listingTitle: string;
}

/**
 * The one fact reviews needs from the rest of the app: did these two students actually
 * deal with each other?
 *
 * A port rather than a direct import, exactly like messaging's `ListingLookup` — the use
 * case stays testable without a conversation store existing at all, and "counterparty"
 * stays a business word instead of a join.
 */
export interface DealLookup {
  /** Were `a` and `b` the two sides of a conversation about this listing? */
  wereCounterparties(listingId: EntityId, a: EntityId, b: EntityId): Promise<boolean>;
  /** Every deal the two of them had, for the "what am I rating?" picker. */
  sharedDeals(a: EntityId, b: EntityId): Promise<readonly Deal[]>;
}

/**
 * Display names for the students who left reviews. Reviews stores ids; a profile has to
 * render people.
 */
export interface RaterLookup {
  nameFor(userId: EntityId): Promise<string | null>;
}
