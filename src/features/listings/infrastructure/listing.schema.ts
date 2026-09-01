import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { CATEGORIES, CONDITIONS, LISTING_STATUSES, MODES, RENT_UNITS, SWATCHES } from "../domain/listing";

const imageSchema = new Schema(
  {
    publicId: { type: String, required: true },
    url: { type: String, required: true },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
  },
  { _id: false },
);

const listingSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    category: { type: String, enum: [...CATEGORIES], required: true },
    condition: { type: String, enum: [...CONDITIONS], required: true },
    mode: { type: String, enum: [...MODES], required: true },
    // Integer paise. Free and exchange listings are normalised to 0 in the domain before
    // they ever reach here, so a price on those modes cannot be persisted.
    pricePaise: { type: Number, default: 0, min: 0 },
    rentUnit: { type: String, enum: [...RENT_UNITS, null], default: null },
    pickupArea: { type: String, required: true, trim: true },
    images: { type: [imageSchema], default: [] },
    swatch: { type: String, enum: [...SWATCHES], required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: [...LISTING_STATUSES], default: "active", index: true },
  },
  { timestamps: true, collection: "listings" },
);

// Free-text search over the two fields a student actually types into the search box.
// Titles are weighted far above descriptions so "Arduino" surfaces Arduino kits before
// it surfaces a textbook that merely mentions one.
listingSchema.index({ title: "text", description: "text" }, { weights: { title: 10, description: 2 }, name: "listing_text" });

// The Discover page's filter combination, in the order the query narrows.
listingSchema.index({ status: 1, category: 1, mode: 1, createdAt: -1 });
// "My Loop" and the seller stats.
listingSchema.index({ sellerId: 1, status: 1, createdAt: -1 });

export type ListingDocument = InferSchemaType<typeof listingSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export const ListingModel: Model<ListingDocument> =
  (mongoose.models.Listing as Model<ListingDocument>) ??
  mongoose.model<ListingDocument>("Listing", listingSchema);
