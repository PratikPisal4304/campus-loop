import { fail, ok, type Result } from "@/core/domain/result";
import type { UnitOfWork } from "@/core/domain/unit-of-work";
import { toEntityId, type EntityId } from "@/core/types/branded";
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
import type {
  ConversationRepository,
  InboxDirectory,
  ListingLookup,
  MessageRepository,
} from "../domain/ports";

export interface MessagingDeps {
  readonly conversations: ConversationRepository;
  readonly messages: MessageRepository;
  /** Used to establish who a listing's seller actually is — see `startConversation`. */
  readonly listings: ListingLookup;
  /** Resolves participant and listing ids to the labels the inbox renders. */
  readonly directory: InboxDirectory;
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

/**
 * An inbox row with its ids already resolved to the words a person recognises.
 *
 * Resolution happens here rather than in the route so it can be batched across the whole
 * page — the route used to fetch a profile and a listing per row.
 */
export interface InboxRowView extends ConversationSummaryView {
  readonly otherName: string;
  readonly initials: string;
  readonly listingTitle: string;
  /** Null when the listing is gone, which is also the signal not to link the title. */
  readonly listingSlug: string | null;
}

export interface InboxPage {
  readonly rows: readonly InboxRowView[];
  readonly hasMore: boolean;
  /** Feed back as `before` to load the next page; null when there is nothing after. */
  readonly nextCursor: Date | null;
}

export interface OpenConversationView {
  readonly conversation: InboxRowView;
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
  // The seller is derived from the listing, never accepted from the caller. It used to
  // arrive as a hidden form field, which meant anyone could POST an arbitrary user id and
  // open a thread with any student on the platform, labelled with a listing neither of
  // them owned — unsolicited DMs with forged context.
  const sellerId = await deps.listings.sellerIdFor(input.listingId);
  if (!sellerId) {
    return fail("LISTING_NOT_FOUND", "That listing no longer exists.");
  }

  if (!canMessage(sellerId, input.buyerId)) {
    // A Result, not a throw: this is a thing a user can do by accident (their own listing
    // still shows the button), not a bug the caller cannot recover from.
    return fail("CANNOT_MESSAGE_SELF", "This is your own listing — there's nobody to message.");
  }

  const participants = participantKey(sellerId, input.buyerId);
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

/** How many threads one inbox request loads. */
export const INBOX_PAGE_SIZE = 20;

const unique = (values: readonly (string | null)[]): EntityId[] =>
  [...new Set(values.filter((value): value is string => Boolean(value)))].map(toEntityId);

/** Resolve a batch of summaries into rows, in exactly two directory round trips. */
async function resolveRows(
  deps: MessagingDeps,
  summaries: readonly ConversationSummaryView[],
): Promise<InboxRowView[]> {
  if (summaries.length === 0) return [];

  const [participants, listings] = await Promise.all([
    deps.directory.participantsByIds(
      unique(summaries.map((summary) => summary.otherParticipantId)),
    ),
    deps.directory.listingsByIds(unique(summaries.map((summary) => summary.listingId))),
  ]);

  const participantById = new Map(participants.map((entry) => [entry.id, entry]));
  const listingById = new Map(listings.map((entry) => [entry.id, entry]));

  return summaries.map((summary) => {
    const participant = summary.otherParticipantId
      ? participantById.get(summary.otherParticipantId)
      : undefined;
    const listing = listingById.get(summary.listingId);

    return {
      ...summary,
      // A deleted account or listing still has to render something addressable.
      otherName: participant?.name ?? "Former student",
      initials: participant?.initials ?? "??",
      listingTitle: listing?.title ?? "Listing removed",
      listingSlug: listing?.slug ?? null,
    };
  });
}

export interface ListInboxOptions {
  readonly limit?: number;
  /** Keyset cursor from a previous page's `nextCursor`. */
  readonly before?: Date;
}

export async function listInbox(
  deps: MessagingDeps,
  userId: EntityId,
  options: ListInboxOptions = {},
): Promise<InboxPage> {
  const limit = options.limit ?? INBOX_PAGE_SIZE;
  // One extra row is the cheapest possible "is there more?" — no second count query, and
  // it is discarded before anything downstream sees it.
  const conversations = await deps.conversations.listForUser(userId, {
    limit: limit + 1,
    ...(options.before ? { before: options.before } : {}),
  });

  const hasMore = conversations.length > limit;
  const page = hasMore ? conversations.slice(0, limit) : conversations;
  const rows = await resolveRows(
    deps,
    page.map((conversation) => toSummaryView(conversation, userId)),
  );

  return {
    rows,
    hasMore,
    nextCursor: hasMore ? (page[page.length - 1]?.lastMessageAt ?? null) : null,
  };
}

/**
 * Total unread messages across every thread, for the sidebar badge.
 *
 * One aggregate over the viewer's participant rows. It used to sum the counters of every
 * conversation the repository could load, which meant the shared layout paid a full inbox
 * scan on every page in the app — a second one, on top of the inbox's own.
 */
export async function countUnread(deps: MessagingDeps, userId: EntityId): Promise<number> {
  return deps.conversations.sumUnread(userId);
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

  // The view reflects the state *after* reading, so the badge does not flash on load.
  const [row] = await resolveRows(deps, [
    { ...toSummaryView(conversation, input.userId), unreadCount: 0 },
  ]);
  if (!row) return fail("NOT_FOUND", "That conversation no longer exists.");

  return ok({
    conversation: row,
    messages: messages.map((message) => toMessageView(message, input.userId)),
  });
}

/**
 * The thread's header, without the side effect of marking it read.
 *
 * `generateMetadata` needs the other student's name to title the page, and running the
 * full `openConversation` for it would clear the unread badge twice per render.
 */
export async function getConversationHeader(
  deps: MessagingDeps,
  input: OpenConversationInput,
): Promise<Result<InboxRowView>> {
  const conversation = await deps.conversations.findById(input.conversationId);
  if (!conversation) return fail("NOT_FOUND", "That conversation no longer exists.");
  if (!isParticipant(conversation, input.userId)) {
    return fail("FORBIDDEN", "You're not part of this conversation.");
  }

  const [row] = await resolveRows(deps, [toSummaryView(conversation, input.userId)]);
  if (!row) return fail("NOT_FOUND", "That conversation no longer exists.");
  return ok(row);
}
