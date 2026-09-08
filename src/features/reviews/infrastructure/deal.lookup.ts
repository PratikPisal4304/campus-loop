import "server-only";
import { toEntityId, type EntityId } from "@/core/types/branded";
import { prisma } from "@/shared/db/connection";
import type { Deal, DealLookup } from "../domain/ports";

/**
 * "Did these two deal with each other?" answered from the conversation store.
 *
 * A conversation about a listing is the only durable record this app keeps of two
 * students actually meeting over an item — there is no order or handoff entity — so it is
 * what a rating is earned by. Reading the tables directly rather than going through
 * `@/features/messaging` is deliberate: its barrel exposes inboxes and threads, not this
 * question, and widening it to serve reviews would put a reviews concept inside messaging.
 * The port keeps that choice reversible — swap this adapter, and nothing above it moves.
 */
export class PrismaDealLookup implements DealLookup {
  async wereCounterparties(listingId: EntityId, a: EntityId, b: EntityId): Promise<boolean> {
    if (a === b) return false;

    const found = await prisma.deal.findFirst({
      where: {
        listingId,
        status: "completed",
        OR: [
          { buyerId: a, sellerId: b },
          { buyerId: b, sellerId: a },
        ],
      },
      select: { id: true },
    });
    return found !== null;
  }

  async sharedDeals(a: EntityId, b: EntityId): Promise<readonly Deal[]> {
    if (a === b) return [];

    const rows = await prisma.deal.findMany({
      where: {
        status: "completed",
        listingId: { not: null },
        OR: [
          { buyerId: a, sellerId: b },
          { buyerId: b, sellerId: a },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: { listingId: true, title: true },
    });
    // Two threads about one listing should not offer the same deal twice.
    const seen = new Set<string>();
    const deals: Deal[] = [];
    for (const row of rows) {
      if (!row.listingId || seen.has(row.listingId)) continue;
      seen.add(row.listingId);
      deals.push({ listingId: toEntityId(row.listingId), listingTitle: row.title });
    }
    return deals;
  }
}
