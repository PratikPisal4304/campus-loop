import "server-only";
import type { Message as MessageRow } from "@prisma/client";
import type { UnitOfWork } from "@/core/domain/unit-of-work";
import { toEntityId, type EntityId } from "@/core/types/branded";
import { clientFrom } from "@/shared/db/transaction";
import type { Message } from "../domain/conversation";
import type {
  CreateMessageInput,
  ListMessagesOptions,
  MessageRepository,
} from "../domain/ports";

const DEFAULT_LIMIT = 100;

export class PrismaMessageRepository implements MessageRepository {
  async listForConversation(
    conversationId: EntityId,
    options: ListMessagesOptions = {},
    uow?: UnitOfWork,
  ): Promise<readonly Message[]> {
    // Queried newest-first so a limit takes the most recent page rather than the oldest,
    // then reversed into the order a thread is actually read in.
    const rows = await clientFrom(uow).message.findMany({
      where: {
        conversationId,
        ...(options.before ? { createdAt: { lt: options.before } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: options.limit ?? DEFAULT_LIMIT,
    });
    return rows.reverse().map(toDomain);
  }

  async create(input: CreateMessageInput, uow?: UnitOfWork): Promise<Message> {
    const row = await clientFrom(uow).message.create({
      data: {
        conversationId: input.conversationId,
        senderId: input.senderId,
        body: input.body,
      },
    });
    return toDomain(row);
  }

  async markRead(
    conversationId: EntityId,
    readerId: EntityId,
    uow?: UnitOfWork,
  ): Promise<void> {
    await clientFrom(uow).message.updateMany({
      // Only the other person's messages, and only the ones not already stamped.
      where: { conversationId, senderId: { not: readerId }, readAt: null },
      data: { readAt: new Date() },
    });
  }
}

function toDomain(row: MessageRow): Message {
  return {
    id: toEntityId(row.id),
    conversationId: toEntityId(row.conversationId),
    senderId: toEntityId(row.senderId),
    body: row.body,
    readAt: row.readAt,
    createdAt: row.createdAt,
  };
}
