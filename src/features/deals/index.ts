import "server-only";
import * as useCases from "./application/deals";
import { dealRepository } from "./infrastructure/deal.repository";
import type { RequestDealInput } from "./domain/deal";
export const requestDeal = (actorId: string, input: RequestDealInput) =>
  useCases.requestDeal(dealRepository, actorId, input);
export const respondToDeal = (actorId: string, id: string, action: string) =>
  useCases.respondToDeal(dealRepository, actorId, id, action);
export const listDeals = (userId: string, side: "buying" | "selling", page = 1) =>
  dealRepository.list(userId, side, Math.max(1, Math.min(1000, Math.floor(page) || 1)));
export { conversationDealContext } from "./infrastructure/deal.repository";
export type { DealView } from "./domain/deal";

export { cancelListingDeals } from "./infrastructure/notifications";
