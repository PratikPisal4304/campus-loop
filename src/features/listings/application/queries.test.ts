import { describe, expect, it, vi } from "vitest";
import { toEntityId, type EntityId, type Slug } from "@/core/types/branded";
import type { Listing } from "../domain/listing";
import type {
  ListingPage,
  ListingQuery,
  ListingRepository,
  SavedItemRepository,
} from "../domain/ports";
import { searchListings } from "./queries";
import type { ListingDeps } from "./manage-listings";

const ALEX = toEntityId("507f1f77bcf86cd799439011");

function listingAt(index: number): Listing {
  return {
    id: toEntityId(`507f1f77bcf86cd79943${String(index).padStart(4, "0")}`),
    slug: `listing-${index}` as Slug,
    title: `Listing ${index}`,
    description: "A thing another student no longer needs.",
    category: "calculators",
    condition: "like-new",
    mode: "sell",
    pricePaise: 500_000,
    rentUnit: null,
    pickupArea: "North Quad",
    images: [],
    swatch: "blue",
    sellerId: ALEX,
    status: "active",
    createdAt: new Date("2026-02-01"),
  };
}

/** A repository over a fixed corpus, so skip/limit arithmetic is exercised for real. */
function makeDeps(corpusSize: number) {
  const corpus = Array.from({ length: corpusSize }, (_, index) => listingAt(index));
  const search = vi.fn(async (query: ListingQuery): Promise<ListingPage> => {
    const skip = query.skip ?? 0;
    return {
      items: corpus.slice(skip, skip + (query.limit ?? corpus.length)),
      total: corpus.length,
    };
  });

  const listings: ListingRepository = {
    findById: async () => null,
    findBySlug: async () => null,
    search,
    slugExists: async () => false,
    create: async () => listingAt(0),
    update: async () => null,
    setStatus: async () => null,
    remove: async () => undefined,
    statsForSeller: async () => ({ listed: 0, forSale: 0, forRent: 0 }),
    listActiveSlugs: async () => [],
  };

  const saved: SavedItemRepository = {
    isSaved: async () => false,
    savedIdsFor: async () => [],
    toggle: async () => true,
    listFor: async () => [],
    countFor: async () => 0,
    removeAllFor: async () => undefined,
  };

  const deps: ListingDeps = { listings, saved };
  return { deps, search };
}

const viewer: EntityId | null = null;

describe("searchListings", () => {
  it("serves the first page and reports how many pages exist", async () => {
    const { deps, search } = makeDeps(32);

    const results = await searchListings(deps, { status: "active" }, viewer);

    expect(results.items).toHaveLength(24);
    expect(results.total).toBe(32);
    expect(results.page).toBe(1);
    expect(results.pageCount).toBe(2);
    expect(results.pageSize).toBe(24);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it("serves the remainder of the corpus on the last page", async () => {
    const { deps } = makeDeps(32);

    const results = await searchListings(deps, { skip: 24 }, viewer);

    expect(results.items).toHaveLength(8);
    expect(results.page).toBe(2);
    expect(results.pageCount).toBe(2);
  });

  it("falls back to the last page when the requested one is past the end", async () => {
    const { deps, search } = makeDeps(32);

    const results = await searchListings(deps, { skip: 24 * 40 }, viewer);

    expect(results.page).toBe(2);
    expect(results.items).toHaveLength(8);
    expect(search).toHaveBeenCalledTimes(2);
  });

  it("does not re-query when the corpus is genuinely empty", async () => {
    const { deps, search } = makeDeps(0);

    const results = await searchListings(deps, { skip: 240 }, viewer);

    expect(results.items).toEqual([]);
    expect(results.pageCount).toBe(1);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it("floors a nonsense skip onto the first page", async () => {
    const { deps, search } = makeDeps(32);

    const results = await searchListings(deps, { skip: Number.NaN }, viewer);

    expect(results.page).toBe(1);
    expect(search).toHaveBeenCalledWith(expect.objectContaining({ skip: 0 }));
  });

  it("clamps an oversized limit so the page count matches what is served", async () => {
    const { deps } = makeDeps(200);

    const results = await searchListings(deps, { limit: 5_000 }, viewer);

    expect(results.items).toHaveLength(60);
    expect(results.pageCount).toBe(4);
  });
});
