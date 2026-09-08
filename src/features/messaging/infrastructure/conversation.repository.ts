import "server-only";
import type { Conversation as ConversationRow, ConversationParticipant } from "@prisma/client";
import type { UnitOfWork } from "@/core/domain/unit-of-work";
import { toEntityId, type EntityId } from "@/core/types/branded";
import { queueEmail } from "@/shared/email/outbox";
import { prisma } from "@/shared/db/connection";
import { clientFrom } from "@/shared/db/transaction";
import { conversationKey, participantKey, type Conversation } from "../domain/conversation";
import type {
  ConversationRepository,
  CreateConversationInput,
  ListConversationsOptions,
  TouchConversationInput,
} from "../domain/ports";

type RowWithParticipants = ConversationRow & { participants: ConversationParticipant[] };

const withParticipants = { participants: true } as const;

/** A hard ceiling even when no caller asks for one — the inbox is never "all of them". */
const DEFAULT_INBOX_LIMIT = 20;

export class PrismaConversationRepository implements ConversationRepository {
  async lock(id: EntityId, uow: UnitOfWork): Promise<void> {
    await clientFrom(uow).$queryRaw`SELECT id FROM conversations WHERE id = ${id} FOR UPDATE`;
  }
  async findById(id: EntityId): Promise<Conversation | null> {
    const row = await prisma.conversation.findUnique({
      where: { id },
      include: withParticipants,
    });
    return row ? toDomain(row) : null;
  }

  async findByListingAndParticipants(
    listingId: EntityId,
    participants: readonly [EntityId, EntityId],
  ): Promise<Conversation | null> {
    // Looked up by the same derived scalar the unique constraint is built on, so the
    // lookup and the constraint can never disagree about what identifies a thread.
    const row = await prisma.conversation.findUnique({
      where: { pairKey: conversationKey(listingId, participants) },
      include: withParticipants,
    });
    return row ? toDomain(row) : null;
  }

  async create(input: CreateConversationInput, uow?: UnitOfWork): Promise<Conversation> {
    const [first, second] = participantKey(input.participantIds[0], input.participantIds[1]);
    const row = await clientFrom(uow).conversation.create({
      data: {
        listingId: input.listingId,
        pairKey: conversationKey(input.listingId, input.participantIds),
        participants: {
          create: [
            { userId: first, unreadCount: 0 },
            { userId: second, unreadCount: 0 },
          ],
        },
      },
      include: withParticipants,
    });
    return toDomain(row);
  }

  async listForUser(
    userId: EntityId,
    options: ListConversationsOptions = {},
  ): Promise<readonly Conversation[]> {
    const rows = await prisma.conversation.findMany({
      where: {
        participants: { some: { userId } },
        ...(options.before ? { lastMessageAt: { lt: options.before } } : {}),
      },
      orderBy: { lastMessageAt: "desc" },
      take: options.limit ?? DEFAULT_INBOX_LIMIT,
      include: withParticipants,
    });
    return rows.map(toDomain);
  }

  async sumUnread(userId: EntityId): Promise<number> {
    // One aggregate over this user's participant rows — the `@@index([userId])` covers it.
    // Summing the inbox instead made every page in the app pay a full conversation scan.
    const total = await prisma.conversationParticipant.aggregate({
      where: { userId },
      _sum: { unreadCount: true },
    });
    return total._sum.unreadCount ?? 0;
  }

  async touch(
    conversationId: EntityId,
    input: TouchConversationInput,
    uow?: UnitOfWork,
  ): Promise<void> {
    const client = clientFrom(uow);
    await client.conversation.update({
      where: { id: conversationId },
      data: { lastMessagePreview: input.preview, lastMessageAt: input.at },
    });
    // Scoped to the recipient's own participant row, so incrementing one side cannot
    // touch the other's badge.
    const recipient = await client.conversationParticipant.update({
      where: {
        conversationId_userId: { conversationId, userId: input.incrementUnreadFor },
      },
      data: { unreadCount: { increment: 1 } },
    });
    if (recipient.unreadCount === 1)
      await queueEmail(client, {
        userId: input.incrementUnreadFor,
        eventKey: `message/${conversationId}/${input.incrementUnreadFor}/${input.at.getTime()}`,
        kind: "message",
        subject: "You have a new campus message",
        body: "A student has sent you a message. Open your conversation to read it and reply.",
        path: `/messages/${conversationId}`,
      });
  }

  async clearUnread(
    conversationId: EntityId,
    userId: EntityId,
    uow?: UnitOfWork,
  ): Promise<void> {
    await clientFrom(uow).conversationParticipant.updateMany({
      // `unreadCount: { not: 0 }` makes an already-read thread a no-op rather than a
      // rewritten row: the thread route re-runs on every 12s poll, and Postgres writes a
      // new tuple even when the value is unchanged. Mirrors `markRead`'s `readAt: null`.
      where: { conversationId, userId, unreadCount: { not: 0 } },
      data: { unreadCount: 0 },
    });
  }
}

/**
 * Row to domain entity. The join rows are folded back into the pair-and-unread-map shape
 * the domain works in, so the storage layout stays an infrastructure detail.
 */
function toDomain(row: RowWithParticipants): Conversation {
  const ids = row.participants.map((participant) => toEntityId(participant.userId));
  const [first, second] = ids;
  const unread: Record<string, number> = {};
  for (const participant of row.participants) {
    unread[participant.userId] = participant.unreadCount;
  }

  return {
    id: toEntityId(row.id),
    listingId: toEntityId(row.listingId),
    // A conversation always has exactly two participants (created together, cascade
    // deleted together). The fallback keeps the tuple type honest without an assertion.
    participantIds: [first ?? toEntityId(""), second ?? toEntityId("")],
    lastMessageAt: row.lastMessageAt,
    lastMessagePreview: row.lastMessagePreview,
    unread,
    createdAt: row.createdAt,
  };
}
