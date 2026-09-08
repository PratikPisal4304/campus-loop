import { Money } from "@/core/domain/money";
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  MODE_LABELS,
  RENT_UNIT_SUFFIX,
  type Listing,
} from "../domain/listing";

/**
 * What the UI receives.
 *
 * Prices arrive already formatted, because `Money.format()` may only be called from the
 * presentation edge — and a view object crossing the server/client boundary has to be a
 * plain serialisable value anyway, which a `Money` instance is not.
 */
export interface ListingCardView {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly category: Listing["category"];
  readonly categoryLabel: string;
  readonly condition: Listing["condition"];
  readonly conditionLabel: string;
  readonly mode: Listing["mode"];
  readonly modeLabel: string;
  /** Already localised, e.g. "₹500" — or "Free"/"Swap" for the priceless modes. */
  readonly price: string;
  /** "/week" for rentals, empty otherwise. */
  readonly priceSuffix: string;
  readonly pickupArea: string;
  readonly imageUrl: string | null;
  readonly swatch: Listing["swatch"];
  readonly isSaved: boolean;
  readonly status: Listing["status"];
  readonly hidden?: boolean;
}

export interface ListingDetailView extends ListingCardView {
  readonly description: string;
  /** publicId is carried so the edit form can round-trip existing photos unchanged. */
  readonly images: readonly { publicId: string; url: string; width: number; height: number }[];
  readonly sellerId: string;
  readonly createdAt: string;
}

function priceLabel(listing: Listing): string {
  switch (listing.mode) {
    case "free":
      return "Free";
    case "exchange":
      return "Swap";
    default:
      return Money.fromPaise(listing.pricePaise).format();
  }
}

export function toCardView(listing: Listing, isSaved = false): ListingCardView {
  return {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    category: listing.category,
    categoryLabel: CATEGORY_LABELS[listing.category],
    condition: listing.condition,
    conditionLabel: CONDITION_LABELS[listing.condition],
    mode: listing.mode,
    modeLabel: MODE_LABELS[listing.mode],
    price: priceLabel(listing),
    priceSuffix: listing.rentUnit ? RENT_UNIT_SUFFIX[listing.rentUnit] : "",
    pickupArea: listing.pickupArea,
    imageUrl: listing.images[0]?.url ?? null,
    swatch: listing.swatch,
    isSaved,
    status: listing.status,
    hidden: Boolean(listing.hidden),
  };
}

export function toDetailView(listing: Listing, isSaved = false): ListingDetailView {
  return {
    ...toCardView(listing, isSaved),
    description: listing.description,
    images: listing.images.map((image) => ({
      publicId: image.publicId,
      url: image.url,
      width: image.width,
      height: image.height,
    })),
    sellerId: listing.sellerId,
    createdAt: listing.createdAt.toISOString(),
  };
}
