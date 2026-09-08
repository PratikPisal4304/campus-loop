import Link from "next/link";
import { requireUserOrRedirect } from "@/features/accounts";
import { getLoopStats, listMyListings, isListingStatus } from "@/features/listings";
import { listDeals } from "@/features/deals";
import { ListingGrid } from "@/components/brand/listing-card";
import { EmptyState } from "@/components/brand/empty-state";
import { ActionForm } from "@/components/ui/action-form";
import {
  ListingActionToast,
  ListingOwnerControls,
} from "../_components/listing-owner-controls";
import { respondDealAction } from "../_actions/deals";
export const metadata = { title: "My Loop" };
export const dynamic = "force-dynamic";
export default async function LoopPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string; status?: string }>;
}) {
  const user = await requireUserOrRedirect();
  const params = await searchParams;
  const tab = params.tab === "buying" ? "buying" : "selling";
  const page = Math.max(1, Math.min(1000, Math.floor(Number(params.page)) || 1));
  const [stats, listings, deals] = await Promise.all([
    getLoopStats(user.id),
    listMyListings(user.id),
    listDeals(user.id, tab, page),
  ]);
  const filter = params.status && isListingStatus(params.status) ? params.status : null;
  const shown = filter ? listings.filter((l) => l.status === filter) : listings;
  return (
    <div className="px-page py-10">
      <ListingActionToast />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-accent">Your campus, in circulation</p>
          <h1 className="mt-3 text-4xl tracking-tight">
            Your loop, {user.name.split(" ")[0]}.
          </h1>
          <p className="text-fg-muted mt-3">
            Your listings, conversations, and confirmed handoffs in one place.
          </p>
        </div>
        <Link
          href="/listings/new"
          className="bg-accent rounded-md px-5 py-3 text-sm font-semibold text-white"
        >
          + List an item
        </Link>
      </div>
      <div className="border-border my-7 flex flex-wrap gap-6 border-y py-4 text-sm">
        <p>
          <strong className="text-accent text-xl">{stats.listed}</strong> live listings
        </p>
        <p>
          <strong className="text-accent text-xl">{stats.saved}</strong> saved items
        </p>
        <Link href="/messages" className="text-accent ml-auto underline underline-offset-4">
          Open messages →
        </Link>
      </div>
      <nav aria-label="Your activity" className="border-border mb-7 flex gap-7 border-b">
        {(["selling", "buying"] as const).map((side) => (
          <Link
            key={side}
            href={`/loop?tab=${side}`}
            aria-current={tab === side ? "page" : undefined}
            className={`pb-3 text-base font-semibold capitalize ${tab === side ? "border-accent text-accent border-b-2" : "text-fg-muted"}`}
          >
            {side}
          </Link>
        ))}
      </nav>
      <section>
        <h2 className="text-2xl">
          {tab === "buying" ? "Things coming your way" : "Your handoff history"}
        </h2>
        <p className="text-fg-muted mt-2 text-sm">
          Pending requests and completed exchanges. A completed handoff is confirmed by both
          students.
        </p>
        <div className="mt-5 space-y-3">
          {deals.items.length ? (
            deals.items.map((deal) => (
              <article
                key={deal.id}
                className="border-border bg-surface flex flex-wrap items-start justify-between gap-4 rounded-lg border p-5"
              >
                <div>
                  <p
                    className={`mb-2 text-xs font-bold tracking-wider uppercase ${deal.status === "pending" ? "text-accent" : "text-fg-muted"}`}
                  >
                    {deal.status === "pending" ? "Awaiting buyer confirmation" : deal.status}
                  </p>
                  <h3 className="text-lg">{deal.title}</h3>
                  <p className="text-fg-muted mt-2 text-sm">
                    {tab === "buying"
                      ? `Seller: ${deal.sellerName}`
                      : `Buyer: ${deal.buyerName}`}{" "}
                    · {deal.mode} · ₹{(deal.pricePaise / 100).toLocaleString("en-IN")}
                    {deal.rentUnit ? ` / ${deal.rentUnit}` : ""}
                  </p>
                  <p className="text-fg-muted mt-1 text-xs">
                    {deal.createdAt.toLocaleDateString("en-IN")}
                  </p>
                  {deal.buyerId && deal.sellerId && deal.listingId && (
                    <Link
                      href={`/messages/${deal.conversationId}`}
                      className="text-accent mt-3 inline-block text-sm underline"
                    >
                      View conversation
                    </Link>
                  )}
                </div>
                {deal.status === "pending" && (
                  <div className="flex flex-wrap gap-3">
                    {deal.buyerId === user.id && (
                      <ActionForm action={respondDealAction} label="I received the item">
                        <input name="dealId" type="hidden" value={deal.id} />
                        <input name="decision" type="hidden" value="confirm" />
                      </ActionForm>
                    )}
                    <ActionForm action={respondDealAction} label="Cancel request">
                      <input name="dealId" type="hidden" value={deal.id} />
                      <input name="decision" type="hidden" value="cancel" />
                    </ActionForm>
                  </div>
                )}
              </article>
            ))
          ) : (
            <div className="border-border rounded-lg border border-dashed p-8 text-center">
              <p className="font-semibold">No handoffs here yet.</p>
              <p className="text-fg-muted mt-2 text-sm">
                Arrange a handoff in Messages. The seller requests confirmation and the buyer
                confirms receipt.
              </p>
              <Link
                href={tab === "buying" ? "/" : "/messages"}
                className="text-accent mt-4 inline-block text-sm underline"
              >
                {tab === "buying" ? "Explore the noticeboard" : "Open your messages"} →
              </Link>
            </div>
          )}
        </div>
        <nav aria-label="Handoff pages" className="my-5 flex gap-4 text-sm">
          {page > 1 && (
            <Link href={`/loop?tab=${tab}&page=${page - 1}`} className="underline">
              ← Previous
            </Link>
          )}
          {page * 20 < deals.total && (
            <Link href={`/loop?tab=${tab}&page=${page + 1}`} className="underline">
              Next →
            </Link>
          )}
        </nav>
      </section>
      {tab === "selling" && (
        <section className="mt-10">
          <h2 className="text-2xl">Your listings</h2>
          <div className="my-4 flex flex-wrap gap-3 text-sm">
            {["all", "active", "reserved", "sold", "closed"].map((status) => (
              <Link
                href={status === "all" ? "/loop" : `/loop?status=${status}`}
                key={status}
                className={`rounded-full border px-3 py-1.5 capitalize ${(!filter && status === "all") || filter === status ? "border-accent bg-checklist text-accent" : "border-border"}`}
              >
                {status === "sold" ? "Completed" : status}
              </Link>
            ))}
          </div>
          <ListingGrid
            listings={shown}
            renderAction={(l) => (
              <ListingOwnerControls listingId={l.id} slug={l.slug} status={l.status} />
            )}
            empty={
              <EmptyState
                icon="↻"
                title="Room for something useful"
                description="List the things you no longer need and let another student put them to use."
                action={{ label: "List an item", href: "/listings/new" }}
              />
            }
          />
        </section>
      )}
    </div>
  );
}
