import "server-only";
import type { EntityId } from "@/core/types/branded";
import { getListingSellerId } from "@/features/listings";
import { withUnitOfWork } from "@/shared/db/transaction";
import * as messaging from "./application/messaging";
import { PrismaConversationRepository } from "./infrastructure/conversation.repository";
import { PrismaMessageRepository } from "./infrastructure/message.repository";

/**
 * Public API of the messaging feature.
 *
 * This barrel is also the feature's composition root: it binds the Prisma adapters — and
 * the Prisma transaction runner — to the use cases, which is what keeps `withUnitOfWork`
 * out of the application layer. Nothing outside this folder may import a deeper path.
 */
const deps: messaging.MessagingDeps = {
  conversations: new PrismaConversationRepository(),
  messages: new PrismaMessageRepository(),
  // Bound to the listings feature through its public barrel — the only cross-feature
  // dependency in this app, and it exists to keep the seller authoritative.
  listings: { sellerIdFor: getListingSellerId },
  runInTransaction: withUnitOfWork,
};

export const startConversation = (input: messaging.StartConversationInput) =>
  messaging.startConversation(deps, input);

export const sendMessage = (input: messaging.SendMessageInput) =>
  messaging.sendMessage(deps, input);

export const listInbox = (userId: EntityId) => messaging.listInbox(deps, userId);

export const countUnread = (userId: EntityId) => messaging.countUnread(deps, userId);

export const openConversation = (input: messaging.OpenConversationInput) =>
  messaging.openConversation(deps, input);

export type {
  ConversationSummaryView,
  MessageView,
  OpenConversationView,
  OpenConversationInput,
  SendMessageInput,
  StartConversationInput,
} from "./application/messaging";

export {
  canMessage,
  previewOf,
  validateMessageBody,
  MAX_MESSAGE_LENGTH,
} from "./domain/conversation";
