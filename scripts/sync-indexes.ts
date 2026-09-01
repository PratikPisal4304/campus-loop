/**
 * Sync every model's indexes to what the schemas declare.
 *
 * `autoIndex` is off in production (see shared/db/connection.ts) because building indexes
 * on the request path is how a deploy stalls. That makes this a required deploy step:
 * run it after every release that touches a schema, or the new index simply will not exist.
 */
import mongoose from "mongoose";
import { connectToDatabase } from "../src/shared/db/connection";
import { UserModel } from "../src/features/accounts/infrastructure/user.schema";
import { ListingModel } from "../src/features/listings/infrastructure/listing.schema";
import { SavedItemModel } from "../src/features/listings/infrastructure/saved-item.schema";
import { ConversationModel } from "../src/features/messaging/infrastructure/conversation.schema";
import { MessageModel } from "../src/features/messaging/infrastructure/message.schema";

// Explicit rather than iterating `mongoose.models`: a model only registers once something
// imports it, so a lazy import would silently skip whichever collection was not loaded.
const MODELS = [
  { name: "User", model: UserModel },
  { name: "Listing", model: ListingModel },
  { name: "SavedItem", model: SavedItemModel },
  { name: "Conversation", model: ConversationModel },
  { name: "Message", model: MessageModel },
] as const;

async function syncIndexes(): Promise<void> {
  await connectToDatabase();

  for (const entry of MODELS) {
    const dropped = await entry.model.syncIndexes();
    process.stdout.write(
      `${entry.name}: synced${dropped.length > 0 ? ` (dropped ${dropped.join(", ")})` : ""}\n`,
    );
  }

  await mongoose.disconnect();
}

syncIndexes().catch((error: unknown) => {
  console.error("Index sync failed:", error);
  process.exit(1);
});
