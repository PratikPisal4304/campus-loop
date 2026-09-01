import "server-only";
import { Types } from "mongoose";
import { toEntityId, type EntityId } from "@/core/types/branded";
import { connectToDatabase } from "@/shared/db/connection";
import type { Listing } from "../domain/listing";
import type { SavedItemRepository } from "../domain/ports";
import { toListing } from "./listing.mapper";
import { ListingModel, type ListingDocument } from "./listing.schema";
import { SavedItemModel } from "./saved-item.schema";

export class MongoSavedItemRepository implements SavedItemRepository {
  async isSaved(userId: EntityId, listingId: EntityId): Promise<boolean> {
    await connectToDatabase();
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(listingId)) return false;
    const count = await SavedItemModel.countDocuments({
      userId: new Types.ObjectId(userId),
      listingId: new Types.ObjectId(listingId),
    })
      .limit(1)
      .exec();
    return count > 0;
  }

  /**
   * Which of these listings has this student saved?
   *
   * One query for the whole grid rather than one per card — the Discover page renders 24
   * cards, and 24 round-trips to colour 24 hearts is how a page gets slow.
   */
  async savedIdsFor(
    userId: EntityId,
    listingIds: readonly EntityId[],
  ): Promise<readonly EntityId[]> {
    await connectToDatabase();
    if (!Types.ObjectId.isValid(userId) || listingIds.length === 0) return [];
    const valid = listingIds.filter((id) => Types.ObjectId.isValid(id));
    if (valid.length === 0) return [];

    const rows = await SavedItemModel.find({
      userId: new Types.ObjectId(userId),
      listingId: { $in: valid.map((id) => new Types.ObjectId(id)) },
    })
      .select("listingId")
      .lean<{ listingId: Types.ObjectId }[]>()
      .exec();

    return rows.map((row) => toEntityId(row.listingId.toString()));
  }

  async toggle(userId: EntityId, listingId: EntityId): Promise<boolean> {
    await connectToDatabase();
    const filter = {
      userId: new Types.ObjectId(userId),
      listingId: new Types.ObjectId(listingId),
    };

    const deleted = await SavedItemModel.findOneAndDelete(filter).exec();
    if (deleted) return false;

    try {
      await SavedItemModel.create(filter);
    } catch (error: unknown) {
      // A double-click can race two inserts past the delete. The unique index rejects the
      // loser with E11000, which means the item is saved — exactly the state we wanted.
      if (!isDuplicateKeyError(error)) throw error;
    }
    return true;
  }

  async listFor(userId: EntityId): Promise<readonly Listing[]> {
    await connectToDatabase();
    if (!Types.ObjectId.isValid(userId)) return [];

    const saved = await SavedItemModel.find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .select("listingId")
      .lean<{ listingId: Types.ObjectId }[]>()
      .exec();
    if (saved.length === 0) return [];

    const ids = saved.map((row) => row.listingId);
    const docs = await ListingModel.find({ _id: { $in: ids } })
      .lean<ListingDocument[]>()
      .exec();

    // Mongo returns them in index order; re-sort to the order they were saved in, which
    // is the order the page claims to show.
    const byId = new Map(docs.map((doc) => [doc._id.toString(), doc]));
    return ids
      .map((id) => byId.get(id.toString()))
      .filter((doc): doc is ListingDocument => Boolean(doc))
      .map(toListing);
  }

  async countFor(userId: EntityId): Promise<number> {
    await connectToDatabase();
    if (!Types.ObjectId.isValid(userId)) return 0;
    return SavedItemModel.countDocuments({ userId: new Types.ObjectId(userId) }).exec();
  }

  /** Called when a listing is deleted, so nobody's saved list points at a ghost. */
  async removeAllFor(listingId: EntityId): Promise<void> {
    await connectToDatabase();
    if (!Types.ObjectId.isValid(listingId)) return;
    await SavedItemModel.deleteMany({ listingId: new Types.ObjectId(listingId) }).exec();
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}
