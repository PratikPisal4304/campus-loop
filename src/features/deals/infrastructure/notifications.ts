import "server-only";
import type { TransactionClient } from "@/shared/db/transaction";
import { queueEmail } from "@/shared/email/outbox";

export async function queueDealUpdate(
  tx: TransactionClient,
  deal: {
    id: string;
    buyerId: string | null;
    sellerId: string | null;
    title: string;
    status: string;
    conversationId: string;
  },
  status = deal.status,
): Promise<void> {
  const subject =
    status === "pending"
      ? "Please confirm your campus handoff"
      : status === "completed"
        ? "Your handoff is complete"
        : "Your handoff was cancelled";
  for (const userId of [deal.buyerId, deal.sellerId]) {
    if (userId)
      await queueEmail(tx, {
        userId,
        kind: "deal",
        eventKey: `deal/${deal.id}/${status}/${userId}`,
        subject,
        body: `${deal.title}: ${status === "pending" ? "The seller has requested confirmation. The buyer can confirm after receiving the item." : status === "completed" ? "Both students have confirmed. You can find this handoff in My Loop." : "This request is no longer pending."}`,
        path: "/loop",
      });
  }
}

export async function cancelListingDeals(
  tx: TransactionClient,
  listingId: string,
): Promise<void> {
  const pending = await tx.deal.findMany({ where: { listingId, status: "pending" } });
  for (const deal of pending) {
    await tx.deal.update({ where: { id: deal.id }, data: { status: "cancelled" } });
    await queueDealUpdate(tx, deal, "cancelled");
  }
}
