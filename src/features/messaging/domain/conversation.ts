import type { EntityId } from "@/core/types/branded";

/**
 * A thread between exactly two students about one listing.
 *
 * `participantIds` is a fixed pair rather than an open array: campus messaging is buyer ↔
 * seller about a specific item, and modelling it as a group chat would buy flexibility
 * nobody asked for while making "the other person" an ambiguous question.
 */
export interface Conversation {
  readonly id: EntityId;
  readonly listingId: EntityId;
  readonly participantIds: readonly [EntityId, EntityId];
  readonly lastMessageAt: Date;
  readonly lastMessagePreview: string;
  /** Unread count per participant, keyed by user id. Zero for the person who just read. */
  readonly unread: Record<string, number>;
  readonly createdAt: Date;
}

export interface Message {
  readonly id: EntityId;
  readonly conversationId: EntityId;
  readonly senderId: EntityId;
  readonly body: string;
  readonly readAt: Date | null;
  readonly createdAt: Date;
}

export const MAX_MESSAGE_LENGTH = 2000;

/** How much of the last message the inbox row shows. */
const PREVIEW_LENGTH = 90;

export function isParticipant(
  conversation: Pick<Conversation, "participantIds">,
  userId: EntityId,
): boolean {
  return conversation.participantIds.includes(userId);
}

/** The person on the other end, or null if `userId` is not in this thread at all. */
export function otherParticipant(
  conversation: Pick<Conversation, "participantIds">,
  userId: EntityId,
): EntityId | null {
  const [first, second] = conversation.participantIds;
  if (first === userId) return second;
  if (second === userId) return first;
  return null;
}

/** You cannot open a thread with yourself about your own listing. */
export function canMessage(sellerId: EntityId, buyerId: EntityId): boolean {
  return sellerId !== buyerId;
}

/** Returns an error message to show, or null when the body is fine to send. */
export function validateMessageBody(body: string): string | null {
  const trimmed = body.trim();
  if (trimmed.length === 0) return "Write a message first.";
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return `Keep it under ${MAX_MESSAGE_LENGTH} characters — that's ${trimmed.length}.`;
  }
  return null;
}

/**
 * Flatten a message to a single line for the conversation list. Newlines and runs of
 * spaces collapse so a message typed as a paragraph does not blow up the inbox row.
 */
export function previewOf(body: string): string {
  return body.trim().replace(/\s+/g, " ").slice(0, PREVIEW_LENGTH);
}

/**
 * Order the pair deterministically.
 *
 * `{listingId, participantIds}` is the thread's natural identity, but an array compares by
 * order in Mongo: `[buyer, seller]` and `[seller, buyer]` are two different index keys, so
 * whoever messaged second would silently open a *second* thread about the same listing.
 * Sorting first makes the key stable no matter who started it, which is what lets the
 * unique index actually do its job.
 */
export function participantKey(a: EntityId, b: EntityId): [EntityId, EntityId] {
  return a <= b ? [a, b] : [b, a];
}

/**
 * A single scalar identifying "this listing, these two people".
 *
 * The unique index cannot be built on `participantIds` directly. MongoDB indexes an array
 * field as *multikey* — one index entry per element — so a unique index on
 * `{listingId, participantIds}` enforces one conversation per listing per **person**, and
 * the second buyer to message a seller collides with a duplicate-key error on the seller's
 * id. Flattening the sorted pair into one string makes the index mean what it says.
 */
export function conversationKey(
  listingId: EntityId,
  participants: readonly [EntityId, EntityId],
): string {
  const [first, second] = participantKey(participants[0], participants[1]);
  return `${listingId}:${first}:${second}`;
}
