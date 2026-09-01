import "server-only";
import { Types } from "mongoose";
import type { UnitOfWork } from "@/core/domain/unit-of-work";
import { toEntityId, type EntityId } from "@/core/types/branded";
import { connectToDatabase } from "@/shared/db/connection";
import { sessionFrom } from "@/shared/db/transaction";
import type { Conversation } from "../domain/conversation";
import type {
  ConversationRepository,
  CreateConversationInput,
  TouchConversationInput,
} from "../domain/ports";
import { ConversationModel, type ConversationDocument } from "./conversation.schema";

export class MongoConversationRepository implements ConversationRepository {
  async findById(id: EntityId): Promise<Conversation | null> {
    await connectToDatabase();
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await ConversationModel.findById(new Types.ObjectId(id))
      .lean<ConversationDocument>()
      .exec();
    return doc ? toDomain(doc) : null;
  }

  async findByListingAndParticipants(
    listingId: EntityId,
    participants: readonly [EntityId, EntityId],
  ): Promise<Conversation | null> {
    await connectToDatabase();
    const ids = toObjectIds([listingId, ...participants]);
    if (!ids) return null;
    const [listing, first, second] = ids;
    if (listing === undefined || first === undefined || second === undefined) return null;

    // Matching the array positionally (not with `$all`) is what enforces "one thread per
    // pair" — it mirrors the sorted key the unique index is built on.
    const doc = await ConversationModel.findOne({
      listingId: listing,
      participantIds: [first, second],
    })
      .lean<ConversationDocument>()
      .exec();
    return doc ? toDomain(doc) : null;
  }

  async create(input: CreateConversationInput, uow?: UnitOfWork): Promise<Conversation> {
    await connectToDatabase();
    const now = new Date();
    const [created] = await ConversationModel.create(
      [
        {
          listingId: new Types.ObjectId(input.listingId),
          participantIds: input.participantIds.map((id) => new Types.ObjectId(id)),
          lastMessageAt: now,
          lastMessagePreview: "",
          unread: {},
        },
      ],
      // `create` only accepts a session when given an array of documents, which is why
      // this passes a one-element array rather than the plain object form.
      { session: sessionFrom(uow) },
    );
    if (!created) {
      throw new Error("Conversation insert returned no document.");
    }
    return toDomain(created.toObject() as ConversationDocument);
  }

  async listForUser(userId: EntityId): Promise<readonly Conversation[]> {
    await connectToDatabase();
    if (!Types.ObjectId.isValid(userId)) return [];
    const docs = await ConversationModel.find({ participantIds: new Types.ObjectId(userId) })
      .sort({ lastMessageAt: -1 })
      .lean<ConversationDocument[]>()
      .exec();
    return docs.map(toDomain);
  }

  async touch(
    conversationId: EntityId,
    input: TouchConversationInput,
    uow?: UnitOfWork,
  ): Promise<void> {
    await connectToDatabase();
    if (!Types.ObjectId.isValid(conversationId)) return;
    await ConversationModel.updateOne(
      { _id: new Types.ObjectId(conversationId) },
      {
        $set: { lastMessagePreview: input.preview, lastMessageAt: input.at },
        // `$inc` on the recipient's key only: the sender has, by definition, read it.
        $inc: { [`unread.${input.incrementUnreadFor}`]: 1 },
      },
    )
      .session(sessionFrom(uow) ?? null)
      .exec();
  }

  async clearUnread(conversationId: EntityId, userId: EntityId): Promise<void> {
    await connectToDatabase();
    if (!Types.ObjectId.isValid(conversationId)) return;
    await ConversationModel.updateOne(
      { _id: new Types.ObjectId(conversationId) },
      { $set: { [`unread.${userId}`]: 0 } },
    ).exec();
  }
}

/** All-or-nothing ObjectId conversion, so one bad id fails the whole query cleanly. */
function toObjectIds(ids: readonly string[]): Types.ObjectId[] | null {
  if (!ids.every((id) => Types.ObjectId.isValid(id))) return null;
  return ids.map((id) => new Types.ObjectId(id));
}

/**
 * Mongoose stores `unread` as a Map, but `.lean()` hands back a plain object while a
 * hydrated document hands back a real Map. Normalise both to the domain's Record.
 */
function toUnread(value: ConversationDocument["unread"]): Record<string, number> {
  if (value instanceof Map) return Object.fromEntries(value);
  return value && typeof value === "object" ? { ...(value as Record<string, number>) } : {};
}

/**
 * Mongoose document to domain entity. Repositories return entities, never documents —
 * a document carries a live connection, `save()`, and the whole ODM surface into layers
 * that are supposed to be persistence-agnostic.
 */
function toDomain(doc: ConversationDocument): Conversation {
  const [first, second] = doc.participantIds.map((id) => toEntityId(id.toString()));
  return {
    id: toEntityId(doc._id.toString()),
    listingId: toEntityId(doc.listingId.toString()),
    // The schema validates the pair length; this fallback keeps the mapper total without
    // a non-null assertion if a legacy row ever slipped through.
    participantIds: [first ?? toEntityId(""), second ?? toEntityId("")],
    lastMessageAt: doc.lastMessageAt,
    lastMessagePreview: doc.lastMessagePreview ?? "",
    unread: toUnread(doc.unread),
    createdAt: doc.createdAt,
  };
}
