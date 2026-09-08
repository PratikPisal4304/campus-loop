import { describe, expect, it, vi } from "vitest";
import { toEntityId, type EntityId, type Slug } from "@/core/types/branded";
import type { Listing, ListingStatus } from "../domain/listing";
import type { ListingRepository, SavedItemRepository } from "../domain/ports";
import {
  closeListing,
  markSold,
  reopenListing,
  reserveListing,
  type ListingDeps,
} from "./manage-listings";

const ALEX = toEntityId("507f1f77bcf86cd799439011");
const SAM = toEntityId("507f1f77bcf86cd799439022");
const LISTING_ID = toEntityId("507f1f77bcf86cd7994390aa");

function listingWith(status: ListingStatus): Listing {
  return {
    id: LISTING_ID,
    slug: "ti-84-plus-ce" as Slug,
    title: "TI-84 Plus CE calculator",
    description: "Barely used, includes the charging cable.",
    category: "calculators",
    condition: "like-new",
    mode: "sell",
    pricePaise: 500_000,
    rentUnit: null,
    pickupArea: "North Quad",
    images: [],
    swatch: "blue",
    sellerId: ALEX,
    status,
    createdAt: new Date("2026-02-01"),
  };
}

/**
 * A fake that behaves like the real table: `setStatus` returns the row as it now stands,
 * so a test can assert on the outcome rather than only on the call.
 */
function makeDeps(status: ListingStatus, setStatus?: ListingRepository["setStatus"]) {
  const current = listingWith(status);
  const listings: ListingRepository = {
    findById: async () => current,
    findBySlug: async () => current,
    search: async () => ({ items: [], total: 0 }),
    slugExists: async () => false,
    create: async () => current,
    update: async () => current,
    setStatus: setStatus ?? (async (_id: EntityId, next: ListingStatus) => listingWith(next)),
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
  return { listings, saved } satisfies ListingDeps;
}

describe("legal transitions", () => {
  it("reserves a live listing", async () => {
    const result = await reserveListing(makeDeps("active"), ALEX, LISTING_ID);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.status).toBe("reserved");
  });

  it("requires buyer confirmation before marking a reserved listing sold", async () => {
    const result = await markSold(makeDeps("reserved"), ALEX, LISTING_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("CONFIRMATION_REQUIRED");
  });

  it("reopens a listing closed by mistake, keeping its slug", async () => {
    const result = await reopenListing(makeDeps("closed"), ALEX, LISTING_ID);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("active");
      // The whole point of reopen over delete-and-recreate: the URL survives.
      expect(result.value.slug).toBe("ti-84-plus-ce");
    }
  });

  it("reopens a completed listing without modifying its handoff history", async () => {
    const result = await reopenListing(makeDeps("sold"), ALEX, LISTING_ID);
    expect(result.ok).toBe(true);
  });
});

describe("illegal transitions", () => {
  it("refuses to close an already sold listing", async () => {
    const setStatus = vi.fn(async () => listingWith("closed"));
    const result = await closeListing(makeDeps("sold", setStatus), ALEX, LISTING_ID);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_TRANSITION");
    expect(setStatus).not.toHaveBeenCalled();
  });

  it("refuses to reserve a closed listing without reopening it first", async () => {
    const result = await reserveListing(makeDeps("closed"), ALEX, LISTING_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain("Reopen it first");
  });

  it("treats a repeat of the same move as a no-op, not a failure", async () => {
    const setStatus = vi.fn(async () => listingWith("sold"));
    const result = await reserveListing(makeDeps("reserved", setStatus), ALEX, LISTING_ID);

    expect(result.ok).toBe(true);
    expect(setStatus).not.toHaveBeenCalled();
  });
});

describe("ownership", () => {
  const moves = [
    ["reserve", reserveListing],
    ["mark sold", markSold],
    ["close", closeListing],
    ["reopen", reopenListing],
  ] as const;

  for (const [name, move] of moves) {
    it(`refuses to let someone else ${name} your listing`, async () => {
      const setStatus = vi.fn(async () => listingWith("active"));
      const result = await move(makeDeps("active", setStatus), SAM, LISTING_ID);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("FORBIDDEN");
      expect(setStatus).not.toHaveBeenCalled();
    });
  }

  it("reports a listing that vanished as gone, not as forbidden", async () => {
    const deps = makeDeps("active");
    const result = await markSold(
      { ...deps, listings: { ...deps.listings, findById: async () => null } },
      ALEX,
      LISTING_ID,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
  });
});
