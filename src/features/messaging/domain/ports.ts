import type { UnitOfWork } from "@/core/domain/unit-of-work";
import type { EntityId } from "@/core/types/branded";
import type { Conversation, Message } from "./conversation";

export interface CreateConversationInput {
  readonly listingId: EntityId;
  /** Already run through `participantKey` — the repository stores the pair as given. */
  readonly participantIds: readonly [EntityId, EntityId];
}

export interface TouchConversationInput {
  readonly preview: string;
  readonly at: Date;
  /** The recipient, whose unread badge goes up by one. Never the sender. */
  readonly incrementUnreadFor: EntityId;
}

export interface CreateMessageInput {
  readonly conversationId: EntityId;
  readonly senderId: EntityId;
  readonly body: string;
}

export interface ListMessagesOptions {
  readonly limit?: number;
  /** Keyset cursor: only messages created strictly before this instant. */
  readonly before?: Date;
}

/**
 * The one fact messaging needs from the listings feature: who owns a listing.
 *
 * A port rather than a direct import, so the use case stays free of cross-feature
 * coupling and can be tested without the listings feature existing at all.
 */
export interface ListingLookup {
  sellerIdFor(listingId: EntityId): Promise<EntityId | null>;
}

export interface ConversationRepository {
  findById(id: EntityId): Promise<Conversation | null>;
  findByListingAndParticipants(
    listingId: EntityId,
    participants: readonly [EntityId, EntityId],
  ): Promise<Conversation | null>;
  create(input: CreateConversationInput, uow?: UnitOfWork): Promise<Conversation>;
  /** The inbox, newest activity first. */
  listForUser(userId: EntityId): Promise<readonly Conversation[]>;
  touch(
    conversationId: EntityId,
    input: TouchConversationInput,
    uow?: UnitOfWork,
  ): Promise<void>;
  clearUnread(conversationId: EntityId, userId: EntityId): Promise<void>;
}

export interface MessageRepository {
  /** Ascending by `createdAt` — the order a thread is read in. */
  listForConversation(
    conversationId: EntityId,
    options?: ListMessagesOptions,
  ): Promise<readonly Message[]>;
  create(input: CreateMessageInput, uow?: UnitOfWork): Promise<Message>;
  /** Stamps `readAt` on everything the reader has not sent themselves. */
  markRead(conversationId: EntityId, readerId: EntityId): Promise<void>;
}
