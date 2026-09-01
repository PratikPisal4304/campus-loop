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

    const found = await prisma.conversation.findFirst({
      where: {
        listingId,
        // Two `some` clauses, not one with an `in`: a single clause is satisfied by one
        // participant matching either id, which would let anyone who ever messaged the
        // seller rate any *other* student on that listing.
        AND: [
          { participants: { some: { userId: a } } },
          { participants: { some: { userId: b } } },
        ],
      },
      select: { id: true },
    });
    return found !== null;
  }

  async sharedDeals(a: EntityId, b: EntityId): Promise<readonly Deal[]> {
    if (a === b) return [];

    const rows = await prisma.conversation.findMany({
      where: {
        AND: [
          { participants: { some: { userId: a } } },
          { participants: { some: { userId: b } } },
        ],
      },
      orderBy: { lastMessageAt: "desc" },
      select: { listing: { select: { id: true, title: true } } },
    });

    // Two threads about one listing should not offer the same deal twice.
    const seen = new Set<string>();
    const deals: Deal[] = [];
    for (const row of rows) {
      if (seen.has(row.listing.id)) continue;
      seen.add(row.listing.id);
      deals.push({ listingId: toEntityId(row.listing.id), listingTitle: row.listing.title });
    }
    return deals;
  }
}
