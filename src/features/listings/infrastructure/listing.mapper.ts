import "server-only";
import type { Listing as ListingRow } from "@prisma/client";
import { toEntityId, type Slug } from "@/core/types/branded";
import type {
  Category,
  Condition,
  Listing,
  ListingImage,
  ListingStatus,
  Mode,
  RentUnit,
  Swatch,
} from "../domain/listing";

/**
 * Database row to domain entity.
 *
 * The category/condition/mode casts are safe because the domain validates that vocabulary
 * on every write path — `validatePrice` and the Zod schemas at the action boundary — and
 * nothing else writes to this table.
 */
export function toListing(row: ListingRow): Listing {
  return {
    id: toEntityId(row.id),
    slug: row.slug as Slug,
    title: row.title,
    description: row.description,
    category: row.category as Category,
    condition: row.condition as Condition,
    mode: row.mode as Mode,
    pricePaise: row.pricePaise,
    rentUnit: (row.rentUnit as RentUnit | null) ?? null,
    pickupArea: row.pickupArea,
    images: parseImages(row.images),
    swatch: row.swatch as Swatch,
    sellerId: toEntityId(row.sellerId),
    status: row.status as ListingStatus,
    createdAt: row.createdAt,
  };
}

/**
 * `images` is a Json column, so Prisma types it as `JsonValue` — genuinely unknown shape
 * at the type level. Anything that does not look like an image reference is dropped rather
 * than trusted, so a hand-edited row cannot crash a page render.
 */
function parseImages(value: unknown): readonly ListingImage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): ListingImage[] => {
    if (typeof entry !== "object" || entry === null) return [];
    const record = entry as Record<string, unknown>;
    if (typeof record.publicId !== "string" || typeof record.url !== "string") return [];
    return [
      {
        publicId: record.publicId,
        url: record.url,
        width: typeof record.width === "number" ? record.width : 0,
        height: typeof record.height === "number" ? record.height : 0,
      },
    ];
  });
}
