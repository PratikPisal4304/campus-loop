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

export interface ListConversationsOptions {
  readonly limit?: number;
  /** Keyset cursor: only conversations whose last activity is strictly older. */
  readonly before?: Date;
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

/** The other student in a thread, as the inbox needs to label them. */
export interface ParticipantSummary {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
}

/** The listing a thread is about, as the inbox needs to label it. */
export interface ListingSummary {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
}

/**
 * Bulk label lookup for the inbox.
 *
 * Deliberately batch-shaped: the single-id equivalents would be called once per row, and
 * an inbox of twenty threads would spend forty round trips resolving names it could have
 * fetched in two.
 */
export interface InboxDirectory {
  participantsByIds(ids: readonly EntityId[]): Promise<readonly ParticipantSummary[]>;
  listingsByIds(ids: readonly EntityId[]): Promise<readonly ListingSummary[]>;
}

export interface ConversationRepository {
  findById(id: EntityId): Promise<Conversation | null>;
  findByListingAndParticipants(
    listingId: EntityId,
    participants: readonly [EntityId, EntityId],
  ): Promise<Conversation | null>;
  create(input: CreateConversationInput, uow?: UnitOfWork): Promise<Conversation>;
  /** The inbox, newest activity first. Always bounded — see `ListConversationsOptions`. */
  listForUser(
    userId: EntityId,
    options?: ListConversationsOptions,
  ): Promise<readonly Conversation[]>;
  /**
   * Total unread across every thread, as one aggregate.
   *
   * Separate from `listForUser` because the badge is rendered on every page in the app:
   * summing it from a full conversation scan made the sidebar the most expensive query
   * in the request.
   */
  sumUnread(userId: EntityId): Promise<number>;
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
