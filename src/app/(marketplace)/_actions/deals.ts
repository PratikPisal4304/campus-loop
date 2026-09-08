"use server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/features/accounts";
import { requestDeal, respondToDeal } from "@/features/deals";
import { dispatchEmails } from "@/shared/email/outbox";

export async function requestDealAction(data: FormData) {
  const user = await requireUser();
  const parsed = z
    .object({
      conversationId: z.string().min(1).max(100),
      price: z.string().regex(/^\d+(\.\d{1,2})?$/),
    })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success) return { error: "Enter an agreed price with up to two decimal places." };
  const result = await requestDeal(user.id, {
    conversationId: parsed.data.conversationId,
    pricePaise: Math.round(Number(parsed.data.price) * 100),
  });
  if (!result.ok) return { error: result.error.message };
  revalidatePath("/", "layout");
  after(dispatchEmails);
  return { success: "Confirmation requested. The buyer can confirm after receiving the item." };
}

export async function respondDealAction(data: FormData) {
  const user = await requireUser();
  const result = await respondToDeal(
    user.id,
    String(data.get("dealId") ?? ""),
    String(data.get("decision") ?? ""),
  );
  if (!result.ok) return { error: result.error.message };
  revalidatePath("/", "layout");
  after(dispatchEmails);
  return {
    success:
      data.get("decision") === "confirm"
        ? "Handoff complete. Your history has been updated."
        : "Request cancelled.",
  };
}
