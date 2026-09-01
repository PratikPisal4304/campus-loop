import { fail, ok, type Result } from "@/core/domain/result";
import type { UnitOfWork } from "@/core/domain/unit-of-work";
import type { EntityId } from "@/core/types/branded";
import {
  canMessage,
  isParticipant,
  otherParticipant,
  participantKey,
  previewOf,
  validateMessageBody,
  type Conversation,
  type Message,
} from "../domain/conversation";
import type { ConversationRepository, MessageRepository } from "../domain/ports";

export interface MessagingDeps {
  readonly conversations: ConversationRepository;
  readonly messages: MessageRepository;
  /**
   * Runs `work` atomically. Typed as a plain function rather than imported from
   * `@/shared/db/transaction` so the use cases never see Mongo: the barrel injects the
   * real `withUnitOfWork`, and tests inject one that simply calls the callback.
   */
  readonly runInTransaction: <T>(work: (uow: UnitOfWork) => Promise<T>) => Promise<T>;
}

/** One row of the inbox, already resolved from the signed-in student's point of view. */
export interface ConversationSummaryView {
  readonly id: string;
  readonly listingId: string;
  /** The person you are talking to — null only for a corrupt single-participant thread. */
  readonly otherParticipantId: string | null;
  readonly lastMessagePreview: string;
  readonly lastMessageAt: Date;
  readonly unreadCount: number;
}

export interface MessageView {
  readonly id: string;
  readonly senderId: string;
  readonly body: string;
  /** True when the viewer sent it — the bubble side, decided here rather than in JSX. */
  readonly mine: boolean;
  readonly readAt: Date | null;
  readonly createdAt: Date;
}

export interface OpenConversationView {
  readonly conversation: ConversationSummaryView;
  readonly messages: readonly MessageView[];
}

function toSummaryView(
  conversation: Conversation,
  viewerId: EntityId,
): ConversationSummaryView {
  return {
    id: conversation.id,
    listingId: conversation.listingId,
    otherParticipantId: otherParticipant(conversation, viewerId),
    lastMessagePreview: conversation.lastMessagePreview,
    lastMessageAt: conversation.lastMessageAt,
    unreadCount: conversation.unread[viewerId] ?? 0,
  };
}

function toMessageView(message: Message, viewerId: EntityId): MessageView {
  return {
    id: message.id,
    senderId: message.senderId,
    body: message.body,
    mine: message.senderId === viewerId,
    readAt: message.readAt,
    createdAt: message.createdAt,
  };
}

export interface StartConversationInput {
  readonly listingId: EntityId;
  readonly sellerId: EntityId;
  readonly buyerId: EntityId;
}

/**
 * Open the thread for this listing, creating it on first contact.
 *
 * Idempotent by design: tapping "Message seller" twice must land in the same thread, so
 * the lookup uses the sorted participant key rather than the order of the arguments.
 */
export async function startConversation(
  deps: MessagingDeps,
  input: StartConversationInput,
): Promise<Result<ConversationSummaryView>> {
  if (!canMessage(input.sellerId, input.buyerId)) {
    // A Result, not a throw: this is a thing a user can do by accident (their own listing
    // still shows the button), not a bug the caller cannot recover from.
    return fail("CANNOT_MESSAGE_SELF", "This is your own listing — there's nobody to message.");
  }

  const participants = participantKey(input.sellerId, input.buyerId);
  const existing = await deps.conversations.findByListingAndParticipants(
    input.listingId,
    participants,
  );
  if (existing) return ok(toSummaryView(existing, input.buyerId));

  const created = await deps.conversations.create({
    listingId: input.listingId,
    participantIds: participants,
  });
  return ok(toSummaryView(created, input.buyerId));
}

export interface SendMessageInput {
  readonly conversationId: EntityId;
  readonly senderId: EntityId;
  readonly body: string;
}

export async function sendMessage(
  deps: MessagingDeps,
  input: SendMessageInput,
): Promise<Result<MessageView>> {
  const bodyError = validateMessageBody(input.body);
  if (bodyError) return fail("INVALID_MESSAGE", bodyError, { body: bodyError });

  const conversation = await deps.conversations.findById(input.conversationId);
  if (!conversation) return fail("NOT_FOUND", "That conversation no longer exists.");

  if (!isParticipant(conversation, input.senderId)) {
    return fail("FORBIDDEN", "You're not part of this conversation.");
  }

  const recipient = otherParticipant(conversation, input.senderId);
  if (!recipient) {
    return fail("FORBIDDEN", "You're not part of this conversation.");
  }

  const body = input.body.trim();
  const sentAt = new Date();

  /**
   * Two writes, one outcome: the message row and the conversation's preview/unread
   * counters. Without the transaction a crash between them leaves either a message the
   * inbox never surfaces, or a badge pointing at a message that was never stored.
   */
  const message = await deps.runInTransaction(async (uow) => {
    const created = await deps.messages.create(
      { conversationId: conversation.id, senderId: input.senderId, body },
      uow,
    );
    await deps.conversations.touch(
      conversation.id,
      { preview: previewOf(body), at: sentAt, incrementUnreadFor: recipient },
      uow,
    );
    return created;
  });

  return ok(toMessageView(message, input.senderId));
}

export async function listInbox(
  deps: MessagingDeps,
  userId: EntityId,
): Promise<readonly ConversationSummaryView[]> {
  const conversations = await deps.conversations.listForUser(userId);
  return conversations.map((conversation) => toSummaryView(conversation, userId));
}

/**
 * Total unread messages across every thread, for the sidebar badge.
 *
 * Derived from the same per-conversation counters the inbox renders, so the badge can
 * never disagree with the list it points at.
 */
export async function countUnread(deps: MessagingDeps, userId: EntityId): Promise<number> {
  const conversations = await deps.conversations.listForUser(userId);
  return conversations.reduce(
    (total, conversation) => total + (conversation.unread[userId] ?? 0),
    0,
  );
}

export interface OpenConversationInput {
  readonly conversationId: EntityId;
  readonly userId: EntityId;
}

/** Reading a thread is also what marks it read, so this both loads and clears unread. */
export async function openConversation(
  deps: MessagingDeps,
  input: OpenConversationInput,
): Promise<Result<OpenConversationView>> {
  const conversation = await deps.conversations.findById(input.conversationId);
  if (!conversation) return fail("NOT_FOUND", "That conversation no longer exists.");

  if (!isParticipant(conversation, input.userId)) {
    return fail("FORBIDDEN", "You're not part of this conversation.");
  }

  const messages = await deps.messages.listForConversation(conversation.id);

  // Clearing is only ever for the reader: the other side's badge is theirs to clear.
  await deps.conversations.clearUnread(conversation.id, input.userId);
  await deps.messages.markRead(conversation.id, input.userId);

  return ok({
    // The view reflects the state *after* reading, so the badge does not flash on load.
    conversation: { ...toSummaryView(conversation, input.userId), unreadCount: 0 },
    messages: messages.map((message) => toMessageView(message, input.userId)),
  });
}
