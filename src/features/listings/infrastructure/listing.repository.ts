import "server-only";
import type { Prisma } from "@prisma/client";
import type { EntityId, Slug } from "@/core/types/branded";
import { cancelListingDeals } from "@/features/deals";
import { prisma } from "@/shared/db/connection";
import { canTransitionTo, type Listing, type ListingStatus } from "../domain/listing";
import { LISTING_PAGE_SIZE, LISTING_PAGE_SIZE_MAX } from "../domain/ports";
import type {
  CreateListingInput,
  ListingPage,
  ListingQuery,
  ListingRepository,
  SellerStats,
  UpdateListingInput,
} from "../domain/ports";
import { toListing } from "./listing.mapper";

export class PrismaListingRepository implements ListingRepository {
  async findById(id: EntityId): Promise<Listing | null> {
    const row = await prisma.listing.findUnique({ where: { id } });
    return row ? toListing(row) : null;
  }

  async findBySlug(slug: Slug): Promise<Listing | null> {
    const row = await prisma.listing.findUnique({
      where: { slug, seller: { suspendedAt: null } },
    });
    return row ? toListing(row) : null;
  }

  async search(query: ListingQuery): Promise<ListingPage> {
    const where: Prisma.ListingWhereInput = {
      ...(query.includeHidden ? {} : { hiddenAt: null }),
      seller: { suspendedAt: null },
    };

    // `status: undefined` means "any status" — that is how My Loop shows closed listings
    // alongside active ones. Only default to "active" when the caller said nothing.
    if ("status" in query) {
      if (query.status) where.status = query.status;
    } else {
      where.status = "active";
    }

    if (query.category) where.category = query.category;
    if (query.mode) where.mode = query.mode;
    if (query.condition) where.condition = query.condition;
    if (query.sellerId) where.sellerId = query.sellerId;

    const search = query.search?.trim();
    if (search) {
      // `contains` rather than full-text search: students look for partial model numbers
      // like "991" or "TI-84", and Postgres full-text search matches whole lexemes, so it
      // would miss both. The corpus is one campus, not the web.
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { pickupArea: { contains: search, mode: "insensitive" } },
      ];
    }

    const limit = Math.min(query.limit ?? LISTING_PAGE_SIZE, LISTING_PAGE_SIZE_MAX);
    // `?page=-3` reaches us as a negative skip; Prisma would reject it at the driver, so
    // floor it here and serve the first page instead.
    const skip = Number.isFinite(query.skip) ? Math.max(0, Math.trunc(query.skip ?? 0)) : 0;
    const [rows, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy: orderFor(query.sort),
        skip,
        take: limit,
      }),
      prisma.listing.count({ where }),
    ]);

    return { items: rows.map(toListing), total };
  }

  async slugExists(slug: Slug): Promise<boolean> {
    const found = await prisma.listing.findUnique({ where: { slug }, select: { id: true } });
    return found !== null;
  }

  async create(input: CreateListingInput): Promise<Listing> {
    const row = await prisma.listing.create({
      data: {
        slug: input.slug,
        title: input.title,
        description: input.description,
        category: input.category,
        condition: input.condition,
        mode: input.mode,
        pricePaise: input.pricePaise,
        rentUnit: input.rentUnit,
        pickupArea: input.pickupArea,
        // Prisma types a Json column as a structural JSON value; our readonly
        // ListingImage[] is compatible at runtime but not by index signature.
        images: input.images as unknown as Prisma.InputJsonValue,
        swatch: input.swatch,
        sellerId: input.sellerId,
      },
    });
    return toListing(row);
  }

  async update(id: EntityId, input: UpdateListingInput): Promise<Listing | null> {
    try {
      const row = await prisma.listing.update({
        where: { id },
        data: {
          title: input.title,
          description: input.description,
          category: input.category,
          condition: input.condition,
          mode: input.mode,
          pricePaise: input.pricePaise,
          rentUnit: input.rentUnit,
          pickupArea: input.pickupArea,
          images: input.images as unknown as Prisma.InputJsonValue,
        },
      });
      return toListing(row);
    } catch {
      // P2025 — the row vanished between the ownership check and the write. The port's
      // contract is "null means gone", not an exception.
      return null;
    }
  }

  async setStatus(id: EntityId, status: ListingStatus): Promise<Listing | null> {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM listings WHERE id = ${id} FOR UPDATE`;
      const listing = await tx.listing.findUnique({ where: { id } });
      if (!listing) return null;
      // Completed deals are created only by the two-party confirmation transaction.
      if (status === "sold" || !canTransitionTo(listing.status as ListingStatus, status))
        return null;
      if (status === "active" || status === "closed") await cancelListingDeals(tx, id);
      const row = await tx.listing.update({ where: { id }, data: { status } });
      return toListing(row);
    });
  }

  async remove(id: EntityId): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM listings WHERE id = ${id} FOR UPDATE`;
      await cancelListingDeals(tx, id);
      const subjects = await tx.review.findMany({
        where: { listingId: id },
        select: { subjectId: true },
        distinct: ["subjectId"],
      });
      await tx.listing.deleteMany({ where: { id } });
      for (const { subjectId } of subjects) {
        const rating = await tx.review.aggregate({
          where: { subjectId },
          _sum: { stars: true },
          _count: true,
        });
        await tx.user.updateMany({
          where: { id: subjectId },
          data: { ratingSum: rating._sum.stars ?? 0, ratingCount: rating._count },
        });
      }
    });
  }

  async statsForSeller(sellerId: EntityId): Promise<SellerStats> {
    // One grouped round-trip rather than three counts: My Loop renders all three numbers
    // at once, and they should agree with each other.
    const rows = await prisma.listing.groupBy({
      by: ["mode"],
      where: { sellerId, status: "active", hiddenAt: null, seller: { suspendedAt: null } },
      _count: { _all: true },
    });

    const byMode = new Map(rows.map((row) => [row.mode, row._count._all]));
    const listed = rows.reduce((sum, row) => sum + row._count._all, 0);
    return {
      listed,
      forSale: byMode.get("sell") ?? 0,
      forRent: byMode.get("rent") ?? 0,
    };
  }

  async listActiveSlugs(): Promise<readonly Slug[]> {
    const rows = await prisma.listing.findMany({
      where: { status: "active", hiddenAt: null, seller: { suspendedAt: null } },
      select: { slug: true },
    });
    return rows.map((row) => row.slug as Slug);
  }
}

function orderFor(sort: ListingQuery["sort"]): Prisma.ListingOrderByWithRelationInput[] {
  switch (sort) {
    case "price-asc":
      return [{ pricePaise: "asc" }, { createdAt: "desc" }];
    case "price-desc":
      return [{ pricePaise: "desc" }, { createdAt: "desc" }];
    default:
      return [{ createdAt: "desc" }];
  }
}

export async function availableSellerId(id: EntityId): Promise<EntityId | null> {
  const row = await prisma.listing.findFirst({
    where: {
      id,
      hiddenAt: null,
      seller: { suspendedAt: null },
      status: { in: ["active", "reserved"] },
    },
    select: { sellerId: true },
  });
  return row ? (row.sellerId as EntityId) : null;
}
