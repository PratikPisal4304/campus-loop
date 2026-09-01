import "server-only";
import { Types, type QueryFilter, type SortOrder as MongoSortOrder } from "mongoose";
import type { EntityId, Slug } from "@/core/types/branded";
import { connectToDatabase } from "@/shared/db/connection";
import type {
  CreateListingInput,
  ListingPage,
  ListingQuery,
  ListingRepository,
  SellerStats,
  UpdateListingInput,
} from "../domain/ports";
import type { Listing, ListingStatus } from "../domain/listing";
import { toListing } from "./listing.mapper";
import { ListingModel, type ListingDocument } from "./listing.schema";

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 60;

export class MongoListingRepository implements ListingRepository {
  async findById(id: EntityId): Promise<Listing | null> {
    await connectToDatabase();
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await ListingModel.findById(new Types.ObjectId(id)).lean<ListingDocument>().exec();
    return doc ? toListing(doc) : null;
  }

  async findBySlug(slug: Slug): Promise<Listing | null> {
    await connectToDatabase();
    const doc = await ListingModel.findOne({ slug }).lean<ListingDocument>().exec();
    return doc ? toListing(doc) : null;
  }

  async search(query: ListingQuery): Promise<ListingPage> {
    await connectToDatabase();

    const filter: QueryFilter<ListingDocument> = {
      status: query.status ?? "active",
    };
    if (query.category) filter.category = query.category;
    if (query.mode) filter.mode = query.mode;
    if (query.condition) filter.condition = query.condition;
    if (query.sellerId && Types.ObjectId.isValid(query.sellerId)) {
      filter.sellerId = new Types.ObjectId(query.sellerId);
    }

    const search = query.search?.trim();
    if (search) {
      // A regex OR rather than $text: students search for partial model numbers like
      // "991" or "TI-84", and $text only matches whole indexed words, so it would miss
      // both. The result set here is a single campus, not a web-scale corpus.
      const pattern = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ title: pattern }, { description: pattern }, { pickupArea: pattern }];
    }

    const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const [docs, total] = await Promise.all([
      ListingModel.find(filter)
        .sort(sortFor(query.sort))
        .skip(query.skip ?? 0)
        .limit(limit)
        .lean<ListingDocument[]>()
        .exec(),
      ListingModel.countDocuments(filter).exec(),
    ]);

    return { items: docs.map(toListing), total };
  }

  async slugExists(slug: Slug): Promise<boolean> {
    await connectToDatabase();
    const count = await ListingModel.countDocuments({ slug }).limit(1).exec();
    return count > 0;
  }

  async create(input: CreateListingInput): Promise<Listing> {
    await connectToDatabase();
    const created = await ListingModel.create({
      ...input,
      sellerId: new Types.ObjectId(input.sellerId),
      images: [...input.images],
    });
    return toListing(created.toObject() as ListingDocument);
  }

  async update(id: EntityId, input: UpdateListingInput): Promise<Listing | null> {
    await connectToDatabase();
    if (!Types.ObjectId.isValid(id)) return null;
    const updated = await ListingModel.findByIdAndUpdate(
      new Types.ObjectId(id),
      { ...input, images: [...input.images] },
      { returnDocument: "after" },
    )
      .lean<ListingDocument>()
      .exec();
    return updated ? toListing(updated) : null;
  }

  async setStatus(id: EntityId, status: ListingStatus): Promise<Listing | null> {
    await connectToDatabase();
    if (!Types.ObjectId.isValid(id)) return null;
    const updated = await ListingModel.findByIdAndUpdate(
      new Types.ObjectId(id),
      { status },
      { returnDocument: "after" },
    )
      .lean<ListingDocument>()
      .exec();
    return updated ? toListing(updated) : null;
  }

  async remove(id: EntityId): Promise<void> {
    await connectToDatabase();
    if (!Types.ObjectId.isValid(id)) return;
    await ListingModel.findByIdAndDelete(new Types.ObjectId(id)).exec();
  }

  async statsForSeller(sellerId: EntityId): Promise<SellerStats> {
    await connectToDatabase();
    if (!Types.ObjectId.isValid(sellerId)) return { listed: 0, forSale: 0, forRent: 0 };

    // One grouped round-trip rather than three counts: the My Loop header renders all
    // three numbers at once, and they should agree with each other.
    const rows = await ListingModel.aggregate<{ _id: string; count: number }>([
      { $match: { sellerId: new Types.ObjectId(sellerId), status: "active" } },
      { $group: { _id: "$mode", count: { $sum: 1 } } },
    ]).exec();

    const byMode = new Map(rows.map((row) => [row._id, row.count]));
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    return {
      listed: total,
      forSale: byMode.get("sell") ?? 0,
      forRent: byMode.get("rent") ?? 0,
    };
  }

  async listActiveSlugs(): Promise<readonly Slug[]> {
    await connectToDatabase();
    const docs = await ListingModel.find({ status: "active" })
      .select("slug")
      .lean<{ slug: string }[]>()
      .exec();
    return docs.map((doc) => doc.slug as Slug);
  }
}

function sortFor(sort: ListingQuery["sort"]): Record<string, MongoSortOrder> {
  switch (sort) {
    case "price-asc":
      return { pricePaise: 1, createdAt: -1 };
    case "price-desc":
      return { pricePaise: -1, createdAt: -1 };
    default:
      return { createdAt: -1 };
  }
}

/** User input goes into a RegExp, so every metacharacter has to be defanged first. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
