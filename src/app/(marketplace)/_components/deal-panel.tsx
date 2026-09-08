import { conversationDealContext } from "@/features/deals";
import { ActionForm } from "@/components/ui/action-form";
import { requestDealAction, respondDealAction } from "../_actions/deals";

export async function DealPanel({
  userId,
  conversationId,
}: {
  userId: string;
  conversationId: string;
}) {
  const context = await conversationDealContext(userId, conversationId);
  if (!context) return null;
  const { listing, pending } = context;
  if (pending)
    return (
      <section className="border-border bg-checklist m-4 rounded-lg border p-4">
        <h2 className="text-base">Confirm the handoff</h2>
        <p className="my-2 text-sm">
          Agreed: ₹{(pending.pricePaise / 100).toLocaleString("en-IN")}
          {pending.rentUnit ? ` / ${pending.rentUnit}` : ""}.{" "}
          {userId === pending.buyerId
            ? "Confirm only after you receive the item."
            : "Waiting for the buyer to confirm receipt."}
        </p>
        <div className="flex flex-wrap gap-3">
          {userId === pending.buyerId && (
            <ActionForm action={respondDealAction} label="I received the item">
              <input type="hidden" name="dealId" value={pending.id} />
              <input type="hidden" name="decision" value="confirm" />
            </ActionForm>
          )}
          <ActionForm action={respondDealAction} label="Cancel request">
            <input type="hidden" name="dealId" value={pending.id} />
            <input type="hidden" name="decision" value="cancel" />
          </ActionForm>
        </div>
      </section>
    );
  if (
    listing.sellerId !== userId ||
    context.hasPending ||
    listing.hiddenAt ||
    !["active", "reserved"].includes(listing.status)
  )
    return null;
  const hasPrice = listing.mode === "sell" || listing.mode === "rent";
  return (
    <details className="border-border bg-panel-sunk mx-4 mt-4 rounded-lg border p-4">
      <summary className="cursor-pointer text-sm font-semibold">Ready for the handoff?</summary>
      <p className="my-3 text-sm">
        Request confirmation from this student. They confirm after receiving the item.
      </p>
      <ActionForm action={requestDealAction} label="Request buyer confirmation">
        <input type="hidden" name="conversationId" value={conversationId} />
        {hasPrice ? (
          <label className="block text-sm">
            Agreed price (₹{listing.rentUnit ? ` per ${listing.rentUnit}` : ""})
            <input
              className="form-input mt-1"
              type="number"
              min="0.01"
              step="0.01"
              required
              name="price"
              defaultValue={listing.pricePaise / 100}
            />
          </label>
        ) : (
          <input type="hidden" name="price" value="0" />
        )}
      </ActionForm>
    </details>
  );
}
