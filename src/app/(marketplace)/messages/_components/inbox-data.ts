import { toEntityId } from "@/core/types/branded";
import { getProfile } from "@/features/accounts";
import { getListingById } from "@/features/listings";
import type { ConversationSummaryView } from "@/features/messaging";

/** One inbox row, with the ids already resolved to the names a person recognises. */
export interface ConversationRow {
  readonly id: string;
  readonly otherParticipantId: string | null;
  readonly otherName: string;
  readonly initials: string;
  readonly listingId: string;
  readonly listingTitle: string;
  readonly listingSlug: string | null;
  readonly preview: string;
  readonly lastMessageAt: Date;
  readonly unreadCount: number;
}

const unique = (values: readonly (string | null)[]): string[] => [
  ...new Set(values.filter((value): value is string => Boolean(value))),
];

/**
 * Resolve every participant and listing referenced by the inbox in one pass.
 *
 * Deliberately not done per row inside the render loop: that would fire two awaits per
 * conversation and serialise the whole page behind them. Each distinct id is fetched
 * once, in parallel, and rows are then built from the maps.
 */
export async function toConversationRows(
  summaries: readonly ConversationSummaryView[],
): Promise<ConversationRow[]> {
  const participantIds = unique(summaries.map((summary) => summary.otherParticipantId));
  const listingIds = unique(summaries.map((summary) => summary.listingId));

  const [profiles, listings] = await Promise.all([
    Promise.all(participantIds.map((id) => getProfile(toEntityId(id)))),
    Promise.all(listingIds.map((id) => getListingById(toEntityId(id)))),
  ]);

  const profileById = new Map(
    profiles.flatMap((profile) => (profile ? [[profile.id, profile] as const] : [])),
  );
  const listingById = new Map(
    listings.flatMap((listing) => (listing ? [[listing.id, listing] as const] : [])),
  );

  return summaries.map((summary) => {
    const profile = summary.otherParticipantId
      ? profileById.get(summary.otherParticipantId)
      : undefined;
    const listing = listingById.get(summary.listingId);

    return {
      id: summary.id,
      otherParticipantId: summary.otherParticipantId,
      // A deleted account still has to render something addressable in the list.
      otherName: profile?.name ?? "Former student",
      initials: profile?.initials ?? "??",
      listingId: summary.listingId,
      listingTitle: listing?.title ?? "Listing removed",
      listingSlug: listing?.slug ?? null,
      preview: summary.lastMessagePreview,
      lastMessageAt: summary.lastMessageAt,
      unreadCount: summary.unreadCount,
    };
  });
}
