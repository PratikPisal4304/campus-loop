import { describe, expect, it } from "vitest";
import type { UnitOfWork } from "@/core/domain/unit-of-work";
import { toEntityId, type EntityId } from "@/core/types/branded";
import type {
  CreateReviewInput,
  Deal,
  DealLookup,
  RatingTotalsStore,
  RaterLookup,
  ReviewRepository,
} from "../domain/ports";
import { MAX_COMMENT_LENGTH, type RatingTotals, type Review } from "../domain/review";
import {
  getRatingSummary,
  listRateableDeals,
  listReviewsFor,
  rateSeller,
  type ReviewDeps,
} from "./rate-seller";

const buyer = toEntityId("clr000000000000000000001");
const seller = toEntityId("clr000000000000000000002");
const stranger = toEntityId("clr000000000000000000003");
const arduino = toEntityId("clr0000000000000000000aa");
const calculator = toEntityId("clr0000000000000000000bb");

/**
 * An in-memory store that applies the same writes the Prisma adapter would, so the
 * assertions look at the state a rating leaves behind rather than at which methods
 * happened to be called.
 */
function makeStore(
  options: {
    reviews?: readonly Review[];
    deals?: readonly Deal[];
    counterparties?: boolean;
  } = {},
) {
  const state = {
    reviews: [...(options.reviews ?? [])],
    totals: { sum: 0, count: 0 } as RatingTotals,
    committed: 0,
  };

  let nextId = 1;

  const reviews: ReviewRepository = {
    findByRaterAndListing: async (raterId, listingId) =>
      state.reviews.find(
        (review) => review.raterId === raterId && review.listingId === listingId,
      ) ?? null,
    create: async (input: CreateReviewInput) => {
      const created: Review = {
        id: toEntityId(`review-${nextId++}`),
        stars: input.stars,
        comment: input.comment,
        raterId: input.raterId,
        subjectId: input.subjectId,
        listingId: input.listingId,
        createdAt: new Date("2026-03-01T10:00:00Z"),
      };
      state.reviews.push(created);
      return created;
    },
    listForSubject: async (subjectId, limit) =>
      state.reviews.filter((review) => review.subjectId === subjectId).slice(0, limit),
    listAllForSubject: async (subjectId) =>
      state.reviews.filter((review) => review.subjectId === subjectId),
  };

  const totals: RatingTotalsStore = {
    set: async (_subjectId: EntityId, next: RatingTotals) => {
      state.totals = next;
    },
  };

  const deals: DealLookup = {
    wereCounterparties: async () => options.counterparties ?? true,
    sharedDeals: async () => options.deals ?? [],
  };

  const raters: RaterLookup = {
    nameFor: async (userId) => (userId === buyer ? "Alex Rivera" : null),
  };

  const deps: ReviewDeps = {
    reviews,
    totals,
    deals,
    raters,
    // A real transaction is not available in a unit test, so this stands in — and counts
    // the commits, which is how the "one transaction" claim below is actually checked.
    runInTransaction: async <T>(work: (uow: UnitOfWork) => Promise<T>) => {
      const result = await work({ handle: null });
      state.committed += 1;
      return result;
    },
  };

  return { deps, state };
}

function existingReview(overrides: Partial<Review> = {}): Review {
  return {
    id: toEntityId("review-existing"),
    stars: 4,
    comment: null,
    raterId: buyer,
    subjectId: seller,
    listingId: arduino,
    createdAt: new Date("2026-02-01T10:00:00Z"),
    ...overrides,
  };
}

describe("rateSeller", () => {
  it("stores the review and the recomputed totals together", async () => {
    const { deps, state } = makeStore();

    const result = await rateSeller(deps, {
      raterId: buyer,
      subjectId: seller,
      listingId: arduino,
      stars: 5,
      comment: "  Showed up on time, kit was exactly as described.  ",
    });

    expect(result.ok).toBe(true);
    expect(state.reviews).toHaveLength(1);
    expect(state.totals).toEqual({ sum: 5, count: 1 });
    expect(state.committed).toBe(1);
    if (result.ok) {
      expect(result.value.comment).toBe("Showed up on time, kit was exactly as described.");
      expect(result.value.raterName).toBe("Alex Rivera");
    }
  });

  it("refuses a rater who was never a counterparty on that listing", async () => {
    const { deps, state } = makeStore({ counterparties: false });

    const result = await rateSeller(deps, {
      raterId: stranger,
      subjectId: seller,
      listingId: arduino,
      stars: 5,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_A_COUNTERPARTY");
    // The important half: nothing was written, so the trust score cannot be inflated by
    // an account that only ever POSTed the form.
    expect(state.reviews).toHaveLength(0);
    expect(state.totals).toEqual({ sum: 0, count: 0 });
  });

  it("refuses a self-review", async () => {
    const { deps, state } = makeStore();

    const result = await rateSeller(deps, {
      raterId: seller,
      subjectId: seller,
      listingId: arduino,
      stars: 5,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SELF_REVIEW");
    expect(state.reviews).toHaveLength(0);
  });

  it("refuses a second rating for the same deal", async () => {
    const { deps, state } = makeStore({ reviews: [existingReview()] });

    const result = await rateSeller(deps, {
      raterId: buyer,
      subjectId: seller,
      listingId: arduino,
      stars: 1,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("ALREADY_REVIEWED");
    expect(state.reviews).toHaveLength(1);
  });

  it("lets the same rater rate the same person for a different deal", async () => {
    const { deps, state } = makeStore({ reviews: [existingReview()] });

    const result = await rateSeller(deps, {
      raterId: buyer,
      subjectId: seller,
      listingId: calculator,
      stars: 3,
    });

    expect(result.ok).toBe(true);
    expect(state.totals).toEqual({ sum: 7, count: 2 });
  });

  it("rejects a star value off the scale before touching the store", async () => {
    const { deps, state } = makeStore();

    for (const stars of [0, 6, 4.5]) {
      const result = await rateSeller(deps, {
        raterId: buyer,
        subjectId: seller,
        listingId: arduino,
        stars,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("INVALID_STARS");
    }
    expect(state.reviews).toHaveLength(0);
  });

  it("rejects an over-long comment rather than truncating someone's words", async () => {
    const { deps } = makeStore();

    const result = await rateSeller(deps, {
      raterId: buyer,
      subjectId: seller,
      listingId: arduino,
      stars: 4,
      comment: "x".repeat(MAX_COMMENT_LENGTH + 1),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.details?.comment).toBeDefined();
  });

  it("recounts every review the subject has, not just the new one", async () => {
    const { deps, state } = makeStore({
      reviews: [
        existingReview({
          id: toEntityId("r1"),
          stars: 2,
          raterId: stranger,
          listingId: calculator,
        }),
      ],
    });

    await rateSeller(deps, {
      raterId: buyer,
      subjectId: seller,
      listingId: arduino,
      stars: 4,
    });

    expect(state.totals).toEqual({ sum: 6, count: 2 });
  });

  it("writes the review and the totals inside the same open transaction", async () => {
    const { deps, state } = makeStore();
    let depth = 0;
    let totalsWrittenInside = false;

    const guarded: ReviewDeps = {
      ...deps,
      totals: {
        set: async (subjectId, next) => {
          totalsWrittenInside = depth > 0;
          await deps.totals.set(subjectId, next);
        },
      },
      runInTransaction: async <T>(work: (uow: UnitOfWork) => Promise<T>) => {
        depth += 1;
        try {
          return await work({ handle: null });
        } finally {
          depth -= 1;
        }
      },
    };

    await rateSeller(guarded, {
      raterId: buyer,
      subjectId: seller,
      listingId: arduino,
      stars: 5,
    });

    expect(totalsWrittenInside).toBe(true);
    expect(state.totals).toEqual({ sum: 5, count: 1 });
  });
});

describe("listReviewsFor", () => {
  it("resolves each rater to a name, falling back for a deleted account", async () => {
    const { deps } = makeStore({
      reviews: [
        existingReview({ id: toEntityId("r1") }),
        existingReview({ id: toEntityId("r2"), raterId: stranger, listingId: calculator }),
      ],
    });

    const views = await listReviewsFor(deps, seller);

    expect(views.map((view) => view.raterName)).toEqual(["Alex Rivera", "A student"]);
  });
});

describe("listRateableDeals", () => {
  it("offers only the shared deals the viewer has not already rated", async () => {
    const { deps } = makeStore({
      reviews: [existingReview()],
      deals: [
        { listingId: arduino, listingTitle: "Arduino Uno R3 starter kit" },
        { listingId: calculator, listingTitle: "Casio FX-991EX" },
      ],
    });

    const deals = await listRateableDeals(deps, buyer, seller);

    expect(deals).toEqual([{ listingId: calculator, listingTitle: "Casio FX-991EX" }]);
  });

  it("offers nothing on your own profile", async () => {
    const { deps } = makeStore({
      deals: [{ listingId: arduino, listingTitle: "Arduino Uno R3 starter kit" }],
    });

    expect(await listRateableDeals(deps, seller, seller)).toEqual([]);
  });
});

describe("getRatingSummary", () => {
  it("derives the average from the stored reviews", async () => {
    const { deps } = makeStore({
      reviews: [
        existingReview({ id: toEntityId("r1"), stars: 5 }),
        existingReview({ id: toEntityId("r2"), stars: 4, listingId: calculator }),
      ],
    });

    expect(await getRatingSummary(deps, seller)).toEqual({ sum: 9, count: 2, average: 4.5 });
  });
});
