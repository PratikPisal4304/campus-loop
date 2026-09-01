import type { EntityId, Slug } from "@/core/types/branded";
import type { Listing } from "../domain/listing";
import { LISTING_PAGE_SIZE, LISTING_PAGE_SIZE_MAX } from "../domain/ports";
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
  /** Matches across every page, not just the ones returned here. */
  readonly total: number;
  /** 1-based page actually served — not always the one asked for, see `searchListings`. */
  readonly page: number;
  /** At least 1, so "Page 1 of 1" reads correctly on an empty result. */
  readonly pageCount: number;
  readonly pageSize: number;
}

function clampPageSize(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return LISTING_PAGE_SIZE;
  return Math.min(Math.max(1, Math.trunc(limit)), LISTING_PAGE_SIZE_MAX);
}

function clampSkip(skip: number | undefined): number {
  if (skip === undefined || !Number.isFinite(skip)) return 0;
  return Math.max(0, Math.trunc(skip));
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
  const pageSize = clampPageSize(query.limit);
  let skip = clampSkip(query.skip);

  let found = await deps.listings.search({ ...query, limit: pageSize, skip });
  const pageCount = Math.max(1, Math.ceil(found.total / pageSize));

  // A link past the last page — a stale bookmark, or listings closed since it was shared —
  // should land on the last page that exists. Otherwise the grid is empty while the count
  // beside it insists there are 32 items, which is the bug this whole change is about.
  if (found.items.length === 0 && found.total > 0) {
    skip = (pageCount - 1) * pageSize;
    found = await deps.listings.search({ ...query, limit: pageSize, skip });
  }

  return {
    items: await withSavedState(deps, found.items, viewerId),
    total: found.total,
    // Never past `pageCount`: an empty corpus asked for at `?page=11` still served page 1.
    page: Math.min(Math.floor(skip / pageSize) + 1, pageCount),
    pageCount,
    pageSize,
  };
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
