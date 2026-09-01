import "server-only";
import type { Review as ReviewRow } from "@prisma/client";
import type { UnitOfWork } from "@/core/domain/unit-of-work";
import { toEntityId, type EntityId } from "@/core/types/branded";
import { prisma } from "@/shared/db/connection";
import { clientFrom } from "@/shared/db/transaction";
import type { CreateReviewInput, RatingTotalsStore, ReviewRepository } from "../domain/ports";
import {
  STARS_MAX,
  STARS_MIN,
  isStars,
  type RatingTotals,
  type Review,
} from "../domain/review";

const DEFAULT_LIMIT = 20;

export class PrismaReviewRepository implements ReviewRepository {
  async findByRaterAndListing(raterId: EntityId, listingId: EntityId): Promise<Review | null> {
    const row = await prisma.review.findUnique({
      where: { raterId_listingId: { raterId, listingId } },
    });
    return row ? toDomain(row) : null;
  }

  async create(input: CreateReviewInput, uow?: UnitOfWork): Promise<Review> {
    const row = await clientFrom(uow).review.create({
      data: {
        stars: input.stars,
        comment: input.comment,
        raterId: input.raterId,
        subjectId: input.subjectId,
        listingId: input.listingId,
      },
    });
    return toDomain(row);
  }

  async listForSubject(subjectId: EntityId, limit = DEFAULT_LIMIT): Promise<readonly Review[]> {
    const rows = await prisma.review.findMany({
      where: { subjectId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toDomain);
  }

  async listAllForSubject(subjectId: EntityId, uow?: UnitOfWork): Promise<readonly Review[]> {
    // Runs on the transaction client when one is passed, so the recount totals exactly the
    // rows the review that triggered it can see.
    const rows = await clientFrom(uow).review.findMany({ where: { subjectId } });
    return rows.map(toDomain);
  }
}

/** The derived half of a rating lives on the user row, which is why this is its own port. */
export class PrismaRatingTotalsStore implements RatingTotalsStore {
  async set(subjectId: EntityId, totals: RatingTotals, uow?: UnitOfWork): Promise<void> {
    await clientFrom(uow).user.update({
      where: { id: subjectId },
      data: { ratingSum: totals.sum, ratingCount: totals.count },
    });
  }
}

function toDomain(row: ReviewRow): Review {
  return {
    id: toEntityId(row.id),
    // A check constraint keeps the column inside 1–5; the clamp is what lets the entity
    // stay typed as `Stars` without an assertion if a row ever predates that constraint.
    stars: isStars(row.stars) ? row.stars : row.stars < STARS_MIN ? STARS_MIN : STARS_MAX,
    comment: row.comment,
    raterId: toEntityId(row.raterId),
    subjectId: toEntityId(row.subjectId),
    listingId: toEntityId(row.listingId),
    createdAt: row.createdAt,
  };
}
