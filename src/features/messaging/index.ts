import "server-only";
import type { EntityId } from "@/core/types/branded";
import { getListingSellerId } from "@/features/listings";
import { withUnitOfWork } from "@/shared/db/transaction";
import * as messaging from "./application/messaging";
import { PrismaConversationRepository } from "./infrastructure/conversation.repository";
import { PrismaInboxDirectory } from "./infrastructure/inbox-directory.repository";
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
  // Bound to the listings feature through its public barrel, so the seller stays
  // authoritative. (The inbox directory reaches for `@/features/accounts` the same way,
  // for `initialsFor` — both go through the barrel, never a deep path.)
  listings: { sellerIdFor: getListingSellerId },
  directory: new PrismaInboxDirectory(),
  runInTransaction: withUnitOfWork,
};

export const startConversation = (input: messaging.StartConversationInput) =>
  messaging.startConversation(deps, input);

export const sendMessage = (input: messaging.SendMessageInput) =>
  messaging.sendMessage(deps, input);

export const listInbox = (userId: EntityId, options?: messaging.ListInboxOptions) =>
  messaging.listInbox(deps, userId, options);

export const countUnread = (userId: EntityId) => messaging.countUnread(deps, userId);

export const openConversation = (input: messaging.OpenConversationInput) =>
  messaging.openConversation(deps, input);

export const getConversationHeader = (input: messaging.OpenConversationInput) =>
  messaging.getConversationHeader(deps, input);

export type {
  ConversationSummaryView,
  InboxPage,
  InboxRowView,
  ListInboxOptions,
  MessageView,
  OpenConversationView,
  OpenConversationInput,
  SendMessageInput,
  StartConversationInput,
} from "./application/messaging";

export { INBOX_PAGE_SIZE } from "./application/messaging";

export {
  canMessage,
  previewOf,
  validateMessageBody,
  MAX_MESSAGE_LENGTH,
} from "./domain/conversation";
