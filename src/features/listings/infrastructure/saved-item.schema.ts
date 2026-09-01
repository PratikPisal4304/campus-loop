import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const savedItemSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    listingId: { type: Schema.Types.ObjectId, ref: "Listing", required: true },
  },
  { timestamps: true, collection: "saved_items" },
);

/**
 * One save per student per listing.
 *
 * `partialFilterExpression` rather than `sparse: true`: sparse does not skip an explicit
 * null, so any row that ever wrote a null id would collide with every other such row.
 * The $type check makes the index apply only to rows where both ids are real ObjectIds.
 */
savedItemSchema.index(
  { userId: 1, listingId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      userId: { $type: "objectId" },
      listingId: { $type: "objectId" },
    },
  },
);

// The saved-items page, newest first.
savedItemSchema.index({ userId: 1, createdAt: -1 });

export type SavedItemDocument = InferSchemaType<typeof savedItemSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export const SavedItemModel: Model<SavedItemDocument> =
  (mongoose.models.SavedItem as Model<SavedItemDocument>) ??
  mongoose.model<SavedItemDocument>("SavedItem", savedItemSchema);
