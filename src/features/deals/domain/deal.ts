import { fail, ok, type Result } from "@/core/domain/result";

export interface DealView {
  id: string;
  listingId: string | null;
  conversationId: string;
  title: string;
  mode: string;
  pricePaise: number;
  rentUnit: string | null;
  status: string;
  buyerId: string | null;
  sellerId: string | null;
  buyerName: string;
  sellerName: string;
  createdAt: Date;
}

export interface RequestDealInput {
  conversationId: string;
  pricePaise: number;
}

export function validateDealRequest(input: {
  actorId: string;
  sellerId: string;
  buyerId: string;
  mode: string;
  pricePaise: number;
  status: string;
  unavailable: boolean;
}): Result<true> {
  if (input.actorId !== input.sellerId || input.sellerId === input.buyerId)
    return fail("FORBIDDEN", "Only the seller can request a handoff with another student.");
  if (input.unavailable || !["active", "reserved"].includes(input.status))
    return fail("UNAVAILABLE", "This listing is not available for a handoff.");
  if (
    !Number.isSafeInteger(input.pricePaise) ||
    input.pricePaise < 0 ||
    input.pricePaise > 2_000_000_000
  )
    return fail("INVALID_PRICE", "Enter a valid agreed price.");
  if (
    ["free", "exchange"].includes(input.mode) ? input.pricePaise !== 0 : input.pricePaise <= 0
  )
    return fail("INVALID_PRICE", "The agreed price must match the listing's mode.");
  return ok(true);
}

export function validateDealResponse(
  deal: Pick<DealView, "status" | "buyerId" | "sellerId">,
  actorId: string,
  action: "confirm" | "cancel",
): Result<true> {
  if (actorId !== deal.buyerId && actorId !== deal.sellerId)
    return fail("FORBIDDEN", "This handoff belongs to other students.");
  if (action === "confirm" && actorId !== deal.buyerId)
    return fail("FORBIDDEN", "Only the selected buyer can confirm receipt.");
  if (deal.status !== "pending")
    return fail(
      "CONFLICT",
      "This request has already been resolved. Refresh to see its status.",
    );
  return ok(true);
}

export interface DealRepository {
  request(actorId: string, input: RequestDealInput): Promise<Result<string>>;
  respond(actorId: string, id: string, action: "confirm" | "cancel"): Promise<Result<string>>;
  list(
    userId: string,
    side: "buying" | "selling",
    page: number,
  ): Promise<{ items: DealView[]; total: number }>;
}
