import "server-only";
import type { EntityId } from "@/core/types/branded";
import { initialsFor } from "@/features/accounts/client";
import { prisma } from "@/shared/db/connection";
import type { InboxDirectory, ListingSummary, ParticipantSummary } from "../domain/ports";

/**
 * Label lookup for the inbox: two `IN (…)` queries, whatever the page size.
 *
 * Reads the user and listing tables directly rather than calling the accounts and
 * listings barrels, because those expose one-id-at-a-time reads and the inbox needs the
 * batch. Both queries are narrow, read-only projections of columns the inbox renders —
 * no entity is reconstructed here, and `initialsFor` still comes from the accounts
 * feature so the two places cannot disagree about how a name is abbreviated.
 */
export class PrismaInboxDirectory implements InboxDirectory {
  async participantsByIds(ids: readonly EntityId[]): Promise<readonly ParticipantSummary[]> {
    if (ids.length === 0) return [];

    const rows = await prisma.user.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, name: true },
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      initials: initialsFor(row.name),
    }));
  }

  async listingsByIds(ids: readonly EntityId[]): Promise<readonly ListingSummary[]> {
    if (ids.length === 0) return [];

    const rows = await prisma.listing.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, title: true, slug: true },
    });
    return rows;
  }
}
