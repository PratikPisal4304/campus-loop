import type { EntityId, Slug } from "@/core/types/branded";
import type { Listing } from "../domain/listing";
import type { ListingQuery, SellerStats } from "../domain/ports";
import {
  toCardView,
  toDetailView,
  type ListingCardView,
  type ListingDetailView,
} from "./listing-views";
import type { ListingDeps } from "./manage-listings";

export interface ListingResults {
  readonly items: readonly ListingCardView[];
  readonly total: number;
}

/**
 * Decorate a page of listings with this student's saved state.
 *
 * One extra query for the whole page, not one per card — see `savedIdsFor`.
 */
async function withSavedState(
  deps: ListingDeps,
  listings: readonly Listing[],
  viewerId: EntityId | null,
): Promise<readonly ListingCardView[]> {
  if (!viewerId || listings.length === 0) {
    return listings.map((listing) => toCardView(listing, false));
  }
  const savedIds = new Set(
    await deps.saved.savedIdsFor(
      viewerId,
      listings.map((listing) => listing.id),
    ),
  );
  return listings.map((listing) => toCardView(listing, savedIds.has(listing.id)));
}

export async function searchListings(
  deps: ListingDeps,
  query: ListingQuery,
  viewerId: EntityId | null,
): Promise<ListingResults> {
  const page = await deps.listings.search(query);
  return { items: await withSavedState(deps, page.items, viewerId), total: page.total };
}

export async function getListingBySlug(
  deps: ListingDeps,
  slug: Slug,
  viewerId: EntityId | null,
): Promise<ListingDetailView | null> {
  const listing = await deps.listings.findBySlug(slug);
  if (!listing) return null;
  const isSaved = viewerId ? await deps.saved.isSaved(viewerId, listing.id) : false;
  return toDetailView(listing, isSaved);
}

export async function getListingById(
  deps: ListingDeps,
  id: EntityId,
): Promise<ListingDetailView | null> {
  const listing = await deps.listings.findById(id);
  return listing ? toDetailView(listing) : null;
}

/** Everything a student has listed, including closed ones — this is their own dashboard. */
export async function listMyListings(
  deps: ListingDeps,
  sellerId: EntityId,
): Promise<readonly ListingCardView[]> {
  const page = await deps.listings.search({ sellerId, status: undefined, limit: 60 });
  return page.items.map((listing) => toCardView(listing));
}

export async function listSellerListings(
  deps: ListingDeps,
  sellerId: EntityId,
  viewerId: EntityId | null,
): Promise<readonly ListingCardView[]> {
  const page = await deps.listings.search({ sellerId, status: "active", limit: 60 });
  return withSavedState(deps, page.items, viewerId);
}

export async function listSavedListings(
  deps: ListingDeps,
  userId: EntityId,
): Promise<readonly ListingCardView[]> {
  const listings = await deps.saved.listFor(userId);
  // Everything here is saved by definition, so no second lookup.
  return listings.map((listing) => toCardView(listing, true));
}

export interface LoopStats extends SellerStats {
  readonly saved: number;
}

export async function getLoopStats(deps: ListingDeps, userId: EntityId): Promise<LoopStats> {
  const [stats, saved] = await Promise.all([
    deps.listings.statsForSeller(userId),
    deps.saved.countFor(userId),
  ]);
  return { ...stats, saved };
}

export function listActiveSlugs(deps: ListingDeps): Promise<readonly Slug[]> {
  return deps.listings.listActiveSlugs();
}

export function toggleSaved(
  deps: ListingDeps,
  userId: EntityId,
  listingId: EntityId,
): Promise<boolean> {
  return deps.saved.toggle(userId, listingId);
}
