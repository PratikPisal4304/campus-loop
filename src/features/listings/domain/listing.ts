import type { EntityId, Slug } from "@/core/types/branded";

/**
 * The listing vocabulary, taken from the prototype's own selects and filter chips so the
 * rewrite speaks the same language the design was drawn for.
 *
 * These are `as const` arrays rather than TS enums (which ESLint bans): the array gives
 * us runtime iteration for rendering the filters, and the union gives us compile-time
 * exhaustiveness. An enum gives neither cleanly.
 */
export const CATEGORIES = [
  "books",
  "calculators",
  "electronics",
  "lab",
  "engineering",
  "notes",
  "projects",
  "art",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  books: "Books & Textbooks",
  calculators: "Calculators",
  electronics: "Electronics",
  lab: "Lab Equipment",
  engineering: "Engineering Tools",
  notes: "Notes & Study Material",
  projects: "Project Components",
  art: "Art & Design",
};

export const CATEGORY_ICONS: Record<Category, string> = {
  books: "📚",
  calculators: "🧮",
  electronics: "💻",
  lab: "🔬",
  engineering: "📐",
  notes: "📝",
  projects: "⚙",
  art: "🎨",
};

export const CONDITIONS = ["new", "like-new", "good", "used"] as const;
export type Condition = (typeof CONDITIONS)[number];

export const CONDITION_LABELS: Record<Condition, string> = {
  new: "New",
  "like-new": "Like New",
  good: "Good",
  used: "Used",
};

export const MODES = ["sell", "rent", "exchange", "free"] as const;
export type Mode = (typeof MODES)[number];

export const MODE_LABELS: Record<Mode, string> = {
  sell: "For sale",
  rent: "For rent",
  exchange: "Exchange",
  free: "Free",
};

export const RENT_UNITS = ["day", "week", "month"] as const;
export type RentUnit = (typeof RENT_UNITS)[number];

export const RENT_UNIT_SUFFIX: Record<RentUnit, string> = {
  day: "/day",
  week: "/week",
  month: "/month",
};

export const LISTING_STATUSES = ["active", "reserved", "closed"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

/**
 * The eight card colours from the prototype's CSS. A listing with no photo still gets a
 * distinct, stable block — which is how the original made an image-less marketplace look
 * deliberate rather than broken.
 */
export const SWATCHES = [
  "blue",
  "green",
  "orange",
  "purple",
  "dark",
  "cream",
  "red",
  "teal",
] as const;

export type Swatch = (typeof SWATCHES)[number];

/** Stable per-listing colour: the same title always lands on the same swatch. */
export function swatchForKey(key: string): Swatch {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }
  return SWATCHES[hash % SWATCHES.length] ?? "blue";
}

export interface ListingImage {
  readonly publicId: string;
  readonly url: string;
  readonly width: number;
  readonly height: number;
}

export interface Listing {
  readonly id: EntityId;
  readonly slug: Slug;
  readonly title: string;
  readonly description: string;
  readonly category: Category;
  readonly condition: Condition;
  readonly mode: Mode;
  /** Integer paise. Always 0 for `free` and `exchange` — see `priceRuleFor`. */
  readonly pricePaise: number;
  readonly rentUnit: RentUnit | null;
  readonly pickupArea: string;
  readonly images: readonly ListingImage[];
  readonly swatch: Swatch;
  readonly sellerId: EntityId;
  readonly status: ListingStatus;
  readonly createdAt: Date;
}

export type PriceRule = "required" | "forbidden";

/**
 * What the price field means for a given mode.
 *
 * The prototype let you publish a "Free" item with a price of ₹500 and a "Sell" item with
 * no price at all, because nothing ever read the mode toggle. This is the rule that was
 * missing, and it is enforced in the domain so every caller — form, server action, seed
 * script — gets the same answer.
 */
export function priceRuleFor(mode: Mode): PriceRule {
  return mode === "sell" || mode === "rent" ? "required" : "forbidden";
}

export interface PriceInput {
  readonly mode: Mode;
  readonly pricePaise: number | null;
  readonly rentUnit: RentUnit | null;
}

export type PriceViolation =
  | { readonly field: "price"; readonly message: string }
  | { readonly field: "rentUnit"; readonly message: string };

/** Returns the reasons this price/mode combination is invalid; empty means it is fine. */
export function validatePrice(input: PriceInput): readonly PriceViolation[] {
  const violations: PriceViolation[] = [];
  const rule = priceRuleFor(input.mode);

  if (rule === "required") {
    if (input.pricePaise === null || input.pricePaise <= 0) {
      violations.push({
        field: "price",
        message:
          input.mode === "rent"
            ? "Set the rental price you want per period."
            : "Set a price, or switch to Free if you're giving it away.",
      });
    }
  } else if (input.pricePaise !== null && input.pricePaise > 0) {
    violations.push({
      field: "price",
      message:
        input.mode === "free"
          ? "A free item can't have a price. Switch to Sell if you want to charge for it."
          : "An exchange has no price. Describe what you want in return instead.",
    });
  }

  if (input.mode === "rent" && input.rentUnit === null) {
    violations.push({
      field: "rentUnit",
      message: "Say whether that's per day, week or month.",
    });
  }
  if (input.mode !== "rent" && input.rentUnit !== null) {
    violations.push({ field: "rentUnit", message: "Only rentals have a rental period." });
  }

  return violations;
}

/** Normalises price/rentUnit to what the mode allows, after validation has passed. */
export function normalisePrice(input: PriceInput): {
  pricePaise: number;
  rentUnit: RentUnit | null;
} {
  if (priceRuleFor(input.mode) === "forbidden") {
    return { pricePaise: 0, rentUnit: null };
  }
  return {
    pricePaise: input.pricePaise ?? 0,
    rentUnit: input.mode === "rent" ? input.rentUnit : null,
  };
}

/** Only the seller may change their own listing. */
export function canManage(listing: Pick<Listing, "sellerId">, userId: EntityId): boolean {
  return listing.sellerId === userId;
}

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

export function isMode(value: string): value is Mode {
  return (MODES as readonly string[]).includes(value);
}

export function isCondition(value: string): value is Condition {
  return (CONDITIONS as readonly string[]).includes(value);
}
