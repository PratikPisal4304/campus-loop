import "server-only";
import { toEntityId, type Slug } from "@/core/types/branded";
import type {
  Category,
  Condition,
  Listing,
  ListingStatus,
  Mode,
  RentUnit,
  Swatch,
} from "../domain/listing";
import type { ListingDocument } from "./listing.schema";

/**
 * Mongoose document to domain entity.
 *
 * Repositories return entities, never documents: a lean document is a plain object but a
 * hydrated one carries `save()`, the connection, and the whole ODM surface into layers
 * that are meant to be persistence-agnostic. The casts are safe because the schema's
 * `enum` constraints already reject anything outside these unions at write time.
 */
export function toListing(doc: ListingDocument): Listing {
  return {
    id: toEntityId(doc._id.toString()),
    slug: doc.slug as Slug,
    title: doc.title,
    description: doc.description,
    category: doc.category as Category,
    condition: doc.condition as Condition,
    mode: doc.mode as Mode,
    pricePaise: doc.pricePaise ?? 0,
    rentUnit: (doc.rentUnit as RentUnit | null) ?? null,
    pickupArea: doc.pickupArea,
    images: (doc.images ?? []).map((image) => ({
      publicId: image.publicId,
      url: image.url,
      width: image.width ?? 0,
      height: image.height ?? 0,
    })),
    swatch: doc.swatch as Swatch,
    sellerId: toEntityId(doc.sellerId.toString()),
    status: doc.status as ListingStatus,
    createdAt: doc.createdAt,
  };
}
