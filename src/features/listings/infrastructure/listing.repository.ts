import "server-only";
import type { Prisma } from "@prisma/client";
import type { EntityId, Slug } from "@/core/types/branded";
import { prisma } from "@/shared/db/connection";
import type { Listing, ListingStatus } from "../domain/listing";
import type {
  CreateListingInput,
  ListingPage,
  ListingQuery,
  ListingRepository,
  SellerStats,
  UpdateListingInput,
} from "../domain/ports";
import { toListing } from "./listing.mapper";

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 60;

export class PrismaListingRepository implements ListingRepository {
  async findById(id: EntityId): Promise<Listing | null> {
    const row = await prisma.listing.findUnique({ where: { id } });
    return row ? toListing(row) : null;
  }

  async findBySlug(slug: Slug): Promise<Listing | null> {
    const row = await prisma.listing.findUnique({ where: { slug } });
    return row ? toListing(row) : null;
  }

  async search(query: ListingQuery): Promise<ListingPage> {
    const where: Prisma.ListingWhereInput = {};

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

    const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const [rows, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy: orderFor(query.sort),
        skip: query.skip ?? 0,
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
    try {
      const row = await prisma.listing.update({ where: { id }, data: { status } });
      return toListing(row);
    } catch {
      return null;
    }
  }

  async remove(id: EntityId): Promise<void> {
    try {
      await prisma.listing.delete({ where: { id } });
    } catch {
      // Already gone is the state the caller asked for.
    }
  }

  async statsForSeller(sellerId: EntityId): Promise<SellerStats> {
    // One grouped round-trip rather than three counts: My Loop renders all three numbers
    // at once, and they should agree with each other.
    const rows = await prisma.listing.groupBy({
      by: ["mode"],
      where: { sellerId, status: "active" },
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
      where: { status: "active" },
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
