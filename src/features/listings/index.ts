import "server-only";
import type { EntityId, Slug } from "@/core/types/branded";
import * as queries from "./application/queries";
import * as manage from "./application/manage-listings";
import type { ListingQuery } from "./domain/ports";
import { PrismaListingRepository } from "./infrastructure/listing.repository";
import { PrismaSavedItemRepository } from "./infrastructure/saved-item.repository";

/**
 * Public API of the listings feature.
 *
 * Also the composition root: it binds the Prisma adapters to the use cases so callers
 * never see a repository. Nothing outside this folder may import a deeper path.
 */
const deps: manage.ListingDeps = {
  listings: new PrismaListingRepository(),
  saved: new PrismaSavedItemRepository(),
};

// --- Reads ------------------------------------------------------------------

export const searchListings = (query: ListingQuery, viewerId: EntityId | null) =>
  queries.searchListings(deps, query, viewerId);

export const getListingBySlug = (slug: Slug, viewerId: EntityId | null) =>
  queries.getListingBySlug(deps, slug, viewerId);

export const getListingById = (id: EntityId) => queries.getListingById(deps, id);

/**
 * Who owns this listing? Exposed for the messaging feature's `ListingLookup` port, so it
 * can establish the real seller instead of trusting one supplied by the client.
 */
export const getListingSellerId = async (id: EntityId): Promise<EntityId | null> => {
  const listing = await deps.listings.findById(id);
  return listing?.sellerId ?? null;
};

export const listMyListings = (sellerId: EntityId) => queries.listMyListings(deps, sellerId);

export const listSellerListings = (sellerId: EntityId, viewerId: EntityId | null) =>
  queries.listSellerListings(deps, sellerId, viewerId);

export const listSavedListings = (userId: EntityId) => queries.listSavedListings(deps, userId);

export const getLoopStats = (userId: EntityId) => queries.getLoopStats(deps, userId);

export const listActiveSlugs = () => queries.listActiveSlugs(deps);

// --- Writes -----------------------------------------------------------------

export const createListing = (sellerId: EntityId, input: manage.ListingFormInput) =>
  manage.createListing(deps, sellerId, input);

export const updateListing = (
  actorId: EntityId,
  listingId: EntityId,
  input: manage.ListingFormInput,
) => manage.updateListing(deps, actorId, listingId, input);

export const closeListing = (actorId: EntityId, listingId: EntityId) =>
  manage.closeListing(deps, actorId, listingId);

export const deleteListing = (actorId: EntityId, listingId: EntityId) =>
  manage.deleteListing(deps, actorId, listingId);

export const toggleSaved = (userId: EntityId, listingId: EntityId) =>
  queries.toggleSaved(deps, userId, listingId);

// --- Types and domain vocabulary --------------------------------------------

export type { ListingCardView, ListingDetailView } from "./application/listing-views";
export type { ListingResults, LoopStats } from "./application/queries";
export type { ListingFormInput, ListingDeps } from "./application/manage-listings";
export type { ListingQuery, SortOrder } from "./domain/ports";
export {
  CATEGORIES,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  CONDITIONS,
  CONDITION_LABELS,
  MODES,
  MODE_LABELS,
  RENT_UNITS,
  isCategory,
  isCondition,
  isMode,
  MAX_PRICE_PAISE,
  MAX_PRICE_RUPEES,
  priceRuleFor,
  type Category,
  type Condition,
  type Mode,
  type RentUnit,
  type Swatch,
} from "./domain/listing";
