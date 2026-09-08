import { fail, ok, type Result } from "@/core/domain/result";
import { toSlug, type EntityId, type Slug } from "@/core/types/branded";
import {
  canManage,
  canTransitionTo,
  LISTING_STATUS_LABELS,
  normalisePrice,
  swatchForKey,
  validatePrice,
  type Category,
  type Condition,
  type ListingImage,
  type ListingStatus,
  type Mode,
  type RentUnit,
} from "../domain/listing";
import type { ListingRepository, SavedItemRepository } from "../domain/ports";
import { toDetailView, type ListingDetailView } from "./listing-views";

export interface ListingDeps {
  readonly listings: ListingRepository;
  readonly saved: SavedItemRepository;
}

export interface ListingFormInput {
  readonly title: string;
  readonly description: string;
  readonly category: Category;
  readonly condition: Condition;
  readonly mode: Mode;
  readonly pricePaise: number | null;
  readonly rentUnit: RentUnit | null;
  readonly pickupArea: string;
  readonly images: readonly ListingImage[];
}

/**
 * The price/mode rule is checked here rather than only in the form schema, because the
 * form is not the only caller — the seed script and any future import go through this
 * same door, and the rule has to hold for all of them.
 */
function checkPrice(
  input: ListingFormInput,
): Result<{ pricePaise: number; rentUnit: RentUnit | null }> {
  const violations = validatePrice({
    mode: input.mode,
    pricePaise: input.pricePaise,
    rentUnit: input.rentUnit,
  });

  if (violations.length > 0) {
    const details: Record<string, string> = {};
    for (const violation of violations) details[violation.field] = violation.message;
    const first = violations[0];
    return fail(
      "INVALID_PRICE",
      first?.message ?? "Check the price for this listing.",
      details,
    );
  }

  return ok(
    normalisePrice({
      mode: input.mode,
      pricePaise: input.pricePaise,
      rentUnit: input.rentUnit,
    }),
  );
}

export async function createListing(
  deps: ListingDeps,
  sellerId: EntityId,
  input: ListingFormInput,
): Promise<Result<ListingDetailView>> {
  const priced = checkPrice(input);
  if (!priced.ok) return priced;

  const slug = await uniqueSlug(deps, input.title);
  const listing = await deps.listings.create({
    slug,
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    condition: input.condition,
    mode: input.mode,
    pricePaise: priced.value.pricePaise,
    rentUnit: priced.value.rentUnit,
    pickupArea: input.pickupArea.trim(),
    images: input.images,
    // Derived from the slug so the colour is stable for the life of the listing.
    swatch: swatchForKey(slug),
    sellerId,
  });

  return ok(toDetailView(listing));
}

export async function updateListing(
  deps: ListingDeps,
  actorId: EntityId,
  listingId: EntityId,
  input: ListingFormInput,
): Promise<Result<ListingDetailView>> {
  const existing = await deps.listings.findById(listingId);
  if (!existing) return fail("NOT_FOUND", "That listing no longer exists.");
  if (!canManage(existing, actorId)) {
    return fail("FORBIDDEN", "You can only edit your own listings.");
  }

  const priced = checkPrice(input);
  if (!priced.ok) return priced;

  const updated = await deps.listings.update(listingId, {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    condition: input.condition,
    mode: input.mode,
    pricePaise: priced.value.pricePaise,
    rentUnit: priced.value.rentUnit,
    pickupArea: input.pickupArea.trim(),
    images: input.images,
  });

  if (!updated) return fail("NOT_FOUND", "That listing no longer exists.");
  return ok(toDetailView(updated));
}

/**
 * The one door every status change goes through, so ownership and the transition rule are
 * checked in exactly one place rather than once per verb.
 */
async function changeStatus(
  deps: ListingDeps,
  actorId: EntityId,
  listingId: EntityId,
  next: ListingStatus,
  refusal: string,
): Promise<Result<ListingDetailView>> {
  const existing = await deps.listings.findById(listingId);
  if (!existing) return fail("NOT_FOUND", "That listing no longer exists.");
  if (!canManage(existing, actorId)) return fail("FORBIDDEN", refusal);
  if (next === "sold")
    return fail(
      "CONFIRMATION_REQUIRED",
      "Complete the handoff through buyer confirmation in Messages.",
    );

  // Already there: the caller got the state they asked for, so this is not a failure.
  if (existing.status === next) return ok(toDetailView(existing));

  if (!canTransitionTo(existing.status, next)) {
    const from = LISTING_STATUS_LABELS[existing.status].toLowerCase();
    const to = LISTING_STATUS_LABELS[next].toLowerCase();
    return fail(
      "INVALID_TRANSITION",
      `A ${from} listing can't be marked ${to}. Reopen it first.`,
    );
  }

  const updated = await deps.listings.setStatus(listingId, next);
  if (!updated) return fail("NOT_FOUND", "That listing no longer exists.");
  return ok(toDetailView(updated));
}

export function closeListing(
  deps: ListingDeps,
  actorId: EntityId,
  listingId: EntityId,
): Promise<Result<ListingDetailView>> {
  return changeStatus(
    deps,
    actorId,
    listingId,
    "closed",
    "You can only close your own listings.",
  );
}

/** Holds the item for the student the seller is talking to, without ending the deal. */
export function reserveListing(
  deps: ListingDeps,
  actorId: EntityId,
  listingId: EntityId,
): Promise<Result<ListingDetailView>> {
  return changeStatus(
    deps,
    actorId,
    listingId,
    "reserved",
    "You can only reserve your own listings.",
  );
}

export function markSold(
  deps: ListingDeps,
  actorId: EntityId,
  listingId: EntityId,
): Promise<Result<ListingDetailView>> {
  return changeStatus(
    deps,
    actorId,
    listingId,
    "sold",
    "You can only mark your own listings as sold.",
  );
}

/** Puts a sold or closed listing back on the market, keeping its URL and its saves. */
export function reopenListing(
  deps: ListingDeps,
  actorId: EntityId,
  listingId: EntityId,
): Promise<Result<ListingDetailView>> {
  return changeStatus(
    deps,
    actorId,
    listingId,
    "active",
    "You can only reopen your own listings.",
  );
}

export async function deleteListing(
  deps: ListingDeps,
  actorId: EntityId,
  listingId: EntityId,
): Promise<Result<true>> {
  const existing = await deps.listings.findById(listingId);
  if (!existing) return fail("NOT_FOUND", "That listing no longer exists.");
  if (!canManage(existing, actorId)) {
    return fail("FORBIDDEN", "You can only delete your own listings.");
  }

  await deps.listings.remove(listingId);
  // Otherwise every student who saved it keeps a card pointing at nothing.
  await deps.saved.removeAllFor(listingId);
  return ok(true);
}

/**
 * Two students listing "Engineering Mathematics 3" must not collide on the slug, so a
 * short suffix is appended until the slug is free.
 */
async function uniqueSlug(deps: ListingDeps, title: string): Promise<Slug> {
  const base = toSlug(title) || toSlug("listing");
  if (!(await deps.listings.slugExists(base))) return base;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `${base}-${randomSuffix()}` as Slug;
    if (!(await deps.listings.slugExists(candidate))) return candidate;
  }
  // Five collisions on a random 4-char suffix means something is very wrong; fall back to
  // something guaranteed unique rather than looping forever.
  return `${base}-${Date.now().toString(36)}` as Slug;
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}
