import { describe, expect, it, vi } from "vitest";
import { toEntityId, type EntityId, type Slug } from "@/core/types/branded";
import type { Listing } from "../domain/listing";
import type { CreateListingInput, ListingRepository, SavedItemRepository } from "../domain/ports";
import {
  createListing,
  deleteListing,
  updateListing,
  type ListingDeps,
  type ListingFormInput,
} from "./manage-listings";

const ALEX = toEntityId("507f1f77bcf86cd799439011");
const SAM = toEntityId("507f1f77bcf86cd799439022");
const LISTING_ID = toEntityId("507f1f77bcf86cd7994390aa");

const listing: Listing = {
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
  status: "active",
  createdAt: new Date("2026-02-01"),
};

const form: ListingFormInput = {
  title: "TI-84 Plus CE calculator",
  description: "Barely used, includes the charging cable.",
  category: "calculators",
  condition: "like-new",
  mode: "sell",
  pricePaise: 500_000,
  rentUnit: null,
  pickupArea: "North Quad",
  images: [],
};

function makeDeps(
  listings: Partial<ListingRepository> = {},
  saved: Partial<SavedItemRepository> = {},
): ListingDeps {
  return {
    listings: {
      findById: async () => listing,
      findBySlug: async () => null,
      search: async () => ({ items: [], total: 0 }),
      slugExists: async () => false,
      create: async () => listing,
      update: async () => listing,
      setStatus: async () => listing,
      remove: async () => undefined,
      statsForSeller: async () => ({ listed: 0, forSale: 0, forRent: 0 }),
      listActiveSlugs: async () => [],
      ...listings,
    },
    saved: {
      isSaved: async () => false,
      savedIdsFor: async () => [],
      toggle: async () => true,
      listFor: async () => [],
      countFor: async () => 0,
      removeAllFor: async () => undefined,
      ...saved,
    },
  };
}

describe("createListing", () => {
  it("enforces the price rule the prototype never had", async () => {
    const create = vi.fn(async () => listing);
    const result = await createListing(makeDeps({ create }), ALEX, {
      ...form,
      mode: "free",
      pricePaise: 50_000,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_PRICE");
    // The important half: it never reached the database.
    expect(create).not.toHaveBeenCalled();
  });

  it("reports the violation against the field so the form can highlight it", async () => {
    const result = await createListing(makeDeps(), ALEX, { ...form, mode: "sell", pricePaise: null });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.details?.price).toBeDefined();
  });

  it("zeroes the price on an exchange rather than trusting the caller", async () => {
    const create = vi.fn(async (_input: CreateListingInput) => listing);
    await createListing(makeDeps({ create }), ALEX, {
      ...form,
      mode: "exchange",
      pricePaise: null,
      rentUnit: null,
    });
    expect(create.mock.calls[0]?.[0]?.pricePaise).toBe(0);
  });

  it("appends a suffix when the slug is already taken", async () => {
    const create = vi.fn(async (_input: CreateListingInput) => listing);
    // First call: taken. Every later call: free.
    let asked = 0;
    const slugExists = async () => {
      asked += 1;
      return asked === 1;
    };

    await createListing(makeDeps({ create, slugExists }), ALEX, form);

    const slug = create.mock.calls[0]?.[0]?.slug ?? "";
    expect(slug.startsWith("ti-84-plus-ce")).toBe(true);
    expect(slug).not.toBe("ti-84-plus-ce");
  });
});

describe("ownership", () => {
  it("refuses to let someone else edit your listing", async () => {
    const update = vi.fn(async () => listing);
    const result = await updateListing(makeDeps({ update }), SAM, LISTING_ID, form);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("FORBIDDEN");
    expect(update).not.toHaveBeenCalled();
  });

  it("refuses to let someone else delete your listing", async () => {
    const remove = vi.fn(async () => undefined);
    const result = await deleteListing(makeDeps({ remove }), SAM, LISTING_ID);

    expect(result.ok).toBe(false);
    expect(remove).not.toHaveBeenCalled();
  });

  it("lets the owner through", async () => {
    const result = await updateListing(makeDeps(), ALEX, LISTING_ID, form);
    expect(result.ok).toBe(true);
  });

  it("clears saved references when the owner deletes a listing", async () => {
    const removeAllFor = vi.fn(async (_id: EntityId) => undefined);
    const result = await deleteListing(makeDeps({}, { removeAllFor }), ALEX, LISTING_ID);

    expect(result.ok).toBe(true);
    // Otherwise every student who saved it keeps a card pointing at a deleted listing.
    expect(removeAllFor).toHaveBeenCalledWith(LISTING_ID);
  });
});
