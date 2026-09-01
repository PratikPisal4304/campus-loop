import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { MAX_MESSAGE_LENGTH } from "../domain/conversation";

const messageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, trim: true, maxlength: MAX_MESSAGE_LENGTH },
    readAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "messages" },
);

// Reading a thread is always "this conversation, oldest first"; paging back uses the same
// index in reverse, so one compound index covers both directions.
messageSchema.index({ conversationId: 1, createdAt: 1 });

export type MessageDocument = InferSchemaType<typeof messageSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

/**
 * The `models.X ?? model(...)` guard is not optional in development: Next re-evaluates
 * this module on every hot reload, and Mongoose throws OverwriteModelError the second
 * time a model name is registered.
 */
export const MessageModel: Model<MessageDocument> =
  (mongoose.models.Message as Model<MessageDocument>) ??
  mongoose.model<MessageDocument>("Message", messageSchema);
