-- Invariants Prisma's schema language cannot express.
--
-- The domain enforces all of these already; this is the backstop for the seed script,
-- for any future import, and for anything touching the database directly.

ALTER TABLE "reviews" ADD CONSTRAINT "reviews_stars_range" CHECK ("stars" BETWEEN 1 AND 5);
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_no_self_review" CHECK ("raterId" <> "subjectId");

-- A price cannot be negative. Unreachable through the actions today, but the invariant
-- lived only in TypeScript.
ALTER TABLE "listings" ADD CONSTRAINT "listings_price_non_negative" CHECK ("pricePaise" >= 0);

-- A report targets exactly one of: a listing, a person, or a conversation.
ALTER TABLE "reports" ADD CONSTRAINT "reports_single_target" CHECK (
  (("listingId" IS NOT NULL)::int + ("reportedUserId" IS NOT NULL)::int + ("conversationId" IS NOT NULL)::int) = 1
);
