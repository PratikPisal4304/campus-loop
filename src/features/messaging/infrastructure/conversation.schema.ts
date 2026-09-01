import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const conversationSchema = new Schema(
  {
    listingId: { type: Schema.Types.ObjectId, ref: "Listing", required: true },
    // Stored pre-sorted by the domain's `participantKey`, which is what makes the unique
    // index below identify a thread rather than merely a direction of one.
    participantIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      required: true,
      validate: {
        validator: (value: unknown[]) => value.length === 2,
        message: "A conversation has exactly two participants.",
      },
    },
    lastMessageAt: { type: Date, required: true, default: Date.now },
    lastMessagePreview: { type: String, default: "" },
    // A Map, not a plain object: unread counts are keyed by user id, and Mongoose only
    // supports `$inc` on arbitrary dynamic keys when the path is declared as a Map.
    unread: { type: Map, of: Number, default: {} },
  },
  { timestamps: true, collection: "conversations" },
);

/**
 * One thread per (listing, participant pair).
 *
 * The filter is a `$type` check, not `sparse: true`. A sparse index only skips documents
 * where the field is *missing* — an explicit `null` (or a null-ish array element from a
 * half-written document) still gets indexed, and every such row would then collide with
 * every other on the same unique key. `$type` matches only documents whose fields are
 * really an ObjectId and an array, so malformed rows fall out of the index entirely
 * instead of fighting each other for the single null slot.
 */
conversationSchema.index(
  { listingId: 1, participantIds: 1 },
  {
    unique: true,
    partialFilterExpression: {
      listingId: { $type: "objectId" },
      participantIds: { $type: "array" },
    },
  },
);

// The inbox query: "my threads, most recent first" — served entirely from this index.
conversationSchema.index({ participantIds: 1, lastMessageAt: -1 });

export type ConversationDocument = InferSchemaType<typeof conversationSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

/**
 * The `models.X ?? model(...)` guard is not optional in development: Next re-evaluates
 * this module on every hot reload, and Mongoose throws OverwriteModelError the second
 * time a model name is registered.
 */
export const ConversationModel: Model<ConversationDocument> =
  (mongoose.models.Conversation as Model<ConversationDocument>) ??
  mongoose.model<ConversationDocument>("Conversation", conversationSchema);
