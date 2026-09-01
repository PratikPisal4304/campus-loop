import "server-only";
import { Types } from "mongoose";
import type { UnitOfWork } from "@/core/domain/unit-of-work";
import { toEntityId, type EntityId } from "@/core/types/branded";
import { connectToDatabase } from "@/shared/db/connection";
import { sessionFrom } from "@/shared/db/transaction";
import type { Message } from "../domain/conversation";
import type {
  CreateMessageInput,
  ListMessagesOptions,
  MessageRepository,
} from "../domain/ports";
import { MessageModel, type MessageDocument } from "./message.schema";

/** Enough to fill a thread view without ever streaming a whole history to the client. */
const DEFAULT_MESSAGE_LIMIT = 100;

export class MongoMessageRepository implements MessageRepository {
  async listForConversation(
    conversationId: EntityId,
    options: ListMessagesOptions = {},
  ): Promise<readonly Message[]> {
    await connectToDatabase();
    if (!Types.ObjectId.isValid(conversationId)) return [];

    const scope = { conversationId: new Types.ObjectId(conversationId) };
    const filter = options.before ? { ...scope, createdAt: { $lt: options.before } } : scope;

    // Paging back through history has to take the *newest* of the older messages, so the
    // query sorts descending and the result is reversed to the ascending reading order.
    const docs = await MessageModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(options.limit ?? DEFAULT_MESSAGE_LIMIT)
      .lean<MessageDocument[]>()
      .exec();

    return docs.reverse().map(toDomain);
  }

  async create(input: CreateMessageInput, uow?: UnitOfWork): Promise<Message> {
    await connectToDatabase();
    const [created] = await MessageModel.create(
      [
        {
          conversationId: new Types.ObjectId(input.conversationId),
          senderId: new Types.ObjectId(input.senderId),
          body: input.body,
          readAt: null,
        },
      ],
      // `create` only accepts a session when given an array of documents, which is why
      // this passes a one-element array rather than the plain object form.
      { session: sessionFrom(uow) },
    );
    if (!created) {
      throw new Error("Message insert returned no document.");
    }
    return toDomain(created.toObject() as MessageDocument);
  }

  async markRead(conversationId: EntityId, readerId: EntityId): Promise<void> {
    await connectToDatabase();
    if (!Types.ObjectId.isValid(conversationId) || !Types.ObjectId.isValid(readerId)) return;
    await MessageModel.updateMany(
      {
        conversationId: new Types.ObjectId(conversationId),
        // Your own messages are never "unread by you".
        senderId: { $ne: new Types.ObjectId(readerId) },
        readAt: null,
      },
      { $set: { readAt: new Date() } },
    ).exec();
  }
}

/**
 * Mongoose document to domain entity. Repositories return entities, never documents —
 * a document carries a live connection, `save()`, and the whole ODM surface into layers
 * that are supposed to be persistence-agnostic.
 */
function toDomain(doc: MessageDocument): Message {
  return {
    id: toEntityId(doc._id.toString()),
    conversationId: toEntityId(doc.conversationId.toString()),
    senderId: toEntityId(doc.senderId.toString()),
    body: doc.body,
    readAt: doc.readAt ?? null,
    createdAt: doc.createdAt,
  };
}
