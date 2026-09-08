import "server-only";
import type { EntityId } from "@/core/types/branded";
import { toEntityId } from "@/core/types/branded";
import { prisma } from "@/shared/db/connection";
import type { Listing } from "../domain/listing";
import type { SavedItemRepository } from "../domain/ports";
import { toListing } from "./listing.mapper";

export class PrismaSavedItemRepository implements SavedItemRepository {
  async isSaved(userId: EntityId, listingId: EntityId): Promise<boolean> {
    const found = await prisma.savedItem.findUnique({
      where: { userId_listingId: { userId, listingId } },
      select: { id: true },
    });
    return found !== null;
  }

  /**
   * Which of these listings has this student saved?
   *
   * One query for the whole grid rather than one per card — Discover renders 24 cards, and
   * 24 round-trips to colour 24 hearts is how a page gets slow.
   */
  async savedIdsFor(
    userId: EntityId,
    listingIds: readonly EntityId[],
  ): Promise<readonly EntityId[]> {
    if (listingIds.length === 0) return [];
    const rows = await prisma.savedItem.findMany({
      where: { userId, listingId: { in: [...listingIds] } },
      select: { listingId: true },
    });
    return rows.map((row) => toEntityId(row.listingId));
  }

  async toggle(userId: EntityId, listingId: EntityId): Promise<boolean> {
    const key = { userId_listingId: { userId, listingId } };

    const existing = await prisma.savedItem.findUnique({ where: key, select: { id: true } });
    if (existing) {
      await prisma.savedItem.delete({ where: key });
      return false;
    }

    // A double-click can race two inserts. `upsert` lets the loser land on the same row
    // instead of failing on the unique constraint — the end state is "saved" either way.
    await prisma.savedItem.upsert({
      where: key,
      create: { userId, listingId },
      update: {},
    });
    return true;
  }

  async listFor(userId: EntityId): Promise<readonly Listing[]> {
    const rows = await prisma.savedItem.findMany({
      where: { userId, listing: { hiddenAt: null, seller: { suspendedAt: null } } },
      orderBy: { createdAt: "desc" },
      // One query with the join, rather than fetching ids then listings separately.
      include: { listing: true },
    });
    return rows.map((row) => toListing(row.listing));
  }

  async countFor(userId: EntityId): Promise<number> {
    return prisma.savedItem.count({
      where: { userId, listing: { hiddenAt: null, seller: { suspendedAt: null } } },
    });
  }

  /**
   * Kept for the port's contract, but the database already handles this: `SavedItem` has
   * `onDelete: Cascade` on its listing relation, so deleting a listing removes every save
   * of it atomically rather than relying on the caller to remember.
   */
  async removeAllFor(listingId: EntityId): Promise<void> {
    await prisma.savedItem.deleteMany({ where: { listingId } });
  }
}
