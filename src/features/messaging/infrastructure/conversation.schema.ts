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
    // Derived scalar: "<listingId>:<sortedIdA>:<sortedIdB>". See the index note below for
    // why the pair cannot be enforced on `participantIds` itself.
    pairKey: { type: String, required: true },
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
 * The index is on the derived `pairKey`, NOT on `{listingId, participantIds}`. An index
 * over an array field is *multikey*: MongoDB writes one entry per element, so a unique
 * index on the array enforces one conversation per listing per **person** — the first
 * buyer to message a seller claims the seller's id, and every later buyer fails with
 * E11000. Collapsing the sorted pair into a single string is what makes "one thread per
 * pair" actually expressible.
 *
 * The filter is a `$type` check rather than `sparse: true`, because a sparse index only
 * skips documents where the field is *missing* — an explicit `null` still gets indexed,
 * and every such row would then collide on the single null slot.
 */
conversationSchema.index(
  { pairKey: 1 },
  { unique: true, partialFilterExpression: { pairKey: { $type: "string" } } },
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
