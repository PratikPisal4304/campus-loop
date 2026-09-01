import type { EntityId, Slug } from "@/core/types/branded";
import type {
  Category,
  Condition,
  Listing,
  ListingImage,
  ListingStatus,
  Mode,
  RentUnit,
  Swatch,
} from "./listing";

export type SortOrder = "recent" | "price-asc" | "price-desc";

/** How many listings a page of results holds when the caller does not ask for a size. */
export const LISTING_PAGE_SIZE = 24;

/** Ceiling on a caller-supplied `limit` — one page is a page, not the whole table. */
export const LISTING_PAGE_SIZE_MAX = 60;

export interface ListingQuery {
  readonly search?: string;
  readonly category?: Category;
  readonly mode?: Mode;
  readonly condition?: Condition;
  readonly sellerId?: EntityId;
  readonly status?: ListingStatus;
  readonly sort?: SortOrder;
  /** Page size, clamped to `LISTING_PAGE_SIZE_MAX`; defaults to `LISTING_PAGE_SIZE`. */
  readonly limit?: number;
  /** Rows to skip. Negative or fractional values are treated as 0. */
  readonly skip?: number;
}

export interface CreateListingInput {
  readonly slug: Slug;
  readonly title: string;
  readonly description: string;
  readonly category: Category;
  readonly condition: Condition;
  readonly mode: Mode;
  readonly pricePaise: number;
  readonly rentUnit: RentUnit | null;
  readonly pickupArea: string;
  readonly images: readonly ListingImage[];
  readonly swatch: Swatch;
  readonly sellerId: EntityId;
}

export type UpdateListingInput = Omit<CreateListingInput, "slug" | "sellerId" | "swatch">;

export interface ListingPage {
  readonly items: readonly Listing[];
  readonly total: number;
}

export interface SellerStats {
  readonly listed: number;
  readonly forSale: number;
  readonly forRent: number;
}

export interface ListingRepository {
  findById(id: EntityId): Promise<Listing | null>;
  findBySlug(slug: Slug): Promise<Listing | null>;
  search(query: ListingQuery): Promise<ListingPage>;
  slugExists(slug: Slug): Promise<boolean>;
  create(input: CreateListingInput): Promise<Listing>;
  update(id: EntityId, input: UpdateListingInput): Promise<Listing | null>;
  setStatus(id: EntityId, status: ListingStatus): Promise<Listing | null>;
  remove(id: EntityId): Promise<void>;
  statsForSeller(sellerId: EntityId): Promise<SellerStats>;
  listActiveSlugs(): Promise<readonly Slug[]>;
}

export interface SavedItemRepository {
  isSaved(userId: EntityId, listingId: EntityId): Promise<boolean>;
  savedIdsFor(userId: EntityId, listingIds: readonly EntityId[]): Promise<readonly EntityId[]>;
  /** Returns the new saved state, so the caller can render a toggle without re-reading. */
  toggle(userId: EntityId, listingId: EntityId): Promise<boolean>;
  listFor(userId: EntityId): Promise<readonly Listing[]>;
  countFor(userId: EntityId): Promise<number>;
  removeAllFor(listingId: EntityId): Promise<void>;
}
