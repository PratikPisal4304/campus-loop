import { describe, expect, it } from "vitest";
import { toEntityId } from "@/core/types/branded";
import {
  MAX_COMMENT_LENGTH,
  averageOf,
  canReview,
  isStars,
  normaliseComment,
  totalsFrom,
  validateComment,
  validateStars,
} from "./review";

const rater = toEntityId("clr000000000000000000001");
const subject = toEntityId("clr000000000000000000002");

const eligibility = {
  raterId: rater,
  subjectId: subject,
  wereCounterparties: true,
  alreadyReviewed: false,
};

describe("isStars", () => {
  it("accepts the whole 1–5 scale", () => {
    expect([1, 2, 3, 4, 5].every(isStars)).toBe(true);
  });

  it("rejects out-of-range, fractional and non-finite values", () => {
    expect(isStars(0)).toBe(false);
    expect(isStars(6)).toBe(false);
    expect(isStars(4.5)).toBe(false);
    expect(isStars(Number.NaN)).toBe(false);
  });
});

describe("validateStars", () => {
  it("passes a valid rating", () => {
    expect(validateStars(3)).toBeNull();
  });

  it("explains the scale when the value is off it", () => {
    expect(validateStars(9)).toContain("1 to 5");
  });
});

describe("validateComment", () => {
  it("accepts an empty or short comment", () => {
    expect(validateComment("")).toBeNull();
    expect(validateComment("Smooth handoff, showed up on time.")).toBeNull();
  });

  it("rejects a comment past the limit and says how long it is", () => {
    const message = validateComment("x".repeat(MAX_COMMENT_LENGTH + 5));
    expect(message).toContain(String(MAX_COMMENT_LENGTH + 5));
  });

  it("measures the trimmed length, so trailing whitespace cannot fail a valid comment", () => {
    expect(validateComment(`${"x".repeat(MAX_COMMENT_LENGTH)}     `)).toBeNull();
  });
});

describe("normaliseComment", () => {
  it("collapses blank and missing comments to one null state", () => {
    expect(normaliseComment("   ")).toBeNull();
    expect(normaliseComment(null)).toBeNull();
    expect(normaliseComment(undefined)).toBeNull();
  });

  it("trims a real comment", () => {
    expect(normaliseComment("  fair price  ")).toBe("fair price");
  });
});

describe("canReview", () => {
  it("allows a counterparty rating someone for the first time", () => {
    expect(canReview(eligibility)).toBeNull();
  });

  it("refuses a self-review even when everything else lines up", () => {
    expect(canReview({ ...eligibility, subjectId: rater })).toBe("SELF_REVIEW");
  });

  it("refuses someone who never dealt with the subject", () => {
    expect(canReview({ ...eligibility, wereCounterparties: false })).toBe("NOT_A_COUNTERPARTY");
  });

  it("refuses a second rating for the same deal", () => {
    expect(canReview({ ...eligibility, alreadyReviewed: true })).toBe("ALREADY_REVIEWED");
  });

  it("reports self-review first — it is the truest reason, not just the first check", () => {
    expect(canReview({ ...eligibility, subjectId: rater, wereCounterparties: false })).toBe(
      "SELF_REVIEW",
    );
  });
});

describe("totalsFrom", () => {
  it("sums and counts the reviews given", () => {
    expect(totalsFrom([{ stars: 5 }, { stars: 4 }, { stars: 3 }])).toEqual({
      sum: 12,
      count: 3,
    });
  });

  it("returns zeroes for a student nobody has rated", () => {
    expect(totalsFrom([])).toEqual({ sum: 0, count: 0 });
  });

  it("is a recount, not an increment: removing a review lowers the totals", () => {
    const all = [{ stars: 5 }, { stars: 1 }] as const;
    expect(totalsFrom(all.slice(0, 1))).toEqual({ sum: 5, count: 1 });
  });
});

describe("averageOf", () => {
  it("rounds to one decimal, the precision a profile actually shows", () => {
    expect(averageOf({ sum: 14, count: 3 })).toBe(4.7);
  });

  it("is null with no ratings rather than 0, which would read as a bad seller", () => {
    expect(averageOf({ sum: 0, count: 0 })).toBeNull();
  });
});
