import { z } from "zod";
import { fail } from "@/core/domain/result";
import type { DealRepository, RequestDealInput } from "../domain/deal";

export async function requestDeal(
  repo: DealRepository,
  actorId: string,
  input: RequestDealInput,
) {
  const parsed = z
    .object({
      conversationId: z.string().min(1).max(100),
      pricePaise: z.number().int().min(0).max(2_000_000_000),
    })
    .safeParse(input);
  if (!parsed.success)
    return fail("INVALID_INPUT", "Choose a conversation and a valid agreed price.");
  return repo.request(actorId, parsed.data);
}

export async function respondToDeal(
  repo: DealRepository,
  actorId: string,
  id: string,
  action: string,
) {
  if (!id || !["confirm", "cancel"].includes(action))
    return fail("INVALID_INPUT", "Choose a valid handoff action.");
  return repo.respond(actorId, id, action as "confirm" | "cancel");
}
