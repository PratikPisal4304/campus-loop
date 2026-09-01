import "server-only";
import type { Conversation as ConversationRow, ConversationParticipant } from "@prisma/client";
import type { UnitOfWork } from "@/core/domain/unit-of-work";
import { toEntityId, type EntityId } from "@/core/types/branded";
import { prisma } from "@/shared/db/connection";
import { clientFrom } from "@/shared/db/transaction";
import { conversationKey, participantKey, type Conversation } from "../domain/conversation";
import type {
  ConversationRepository,
  CreateConversationInput,
  TouchConversationInput,
} from "../domain/ports";

type RowWithParticipants = ConversationRow & { participants: ConversationParticipant[] };

const withParticipants = { participants: true } as const;

export class PrismaConversationRepository implements ConversationRepository {
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

  async listForUser(userId: EntityId): Promise<readonly Conversation[]> {
    const rows = await prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      orderBy: { lastMessageAt: "desc" },
      include: withParticipants,
    });
    return rows.map(toDomain);
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
    await client.conversationParticipant.update({
      where: {
        conversationId_userId: { conversationId, userId: input.incrementUnreadFor },
      },
      data: { unreadCount: { increment: 1 } },
    });
  }

  async clearUnread(conversationId: EntityId, userId: EntityId): Promise<void> {
    await prisma.conversationParticipant.updateMany({
      where: { conversationId, userId },
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
