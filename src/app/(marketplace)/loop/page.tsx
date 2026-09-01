import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/features/accounts";
import { getLoopStats, listMyListings } from "@/features/listings";
import { EmptyState } from "@/components/brand/empty-state";
import { ListingGrid } from "@/components/brand/listing-card";
import { DisplayHeading, Eyebrow } from "@/components/brand/typography";
import { ButtonLink } from "@/components/ui/button";
import { ListingOwnerControls } from "../_components/listing-owner-controls";

export const metadata: Metadata = { title: "My Loop" };
export const dynamic = "force-dynamic";

function StatTile({
  caption,
  value,
  hint,
  highlight,
}: {
  caption: string;
  value: number | string;
  hint: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-md border border-border p-5 ${highlight ? "bg-highlight" : "bg-surface"}`}
    >
      <p className="eyebrow text-fg-muted">{caption}</p>
      <p className="numeral mt-2 text-[34px] font-bold">{value}</p>
      <p className="mt-1 text-[11px] text-fg-muted">{hint}</p>
    </div>
  );
}

export default async function LoopPage() {
  const user = await requireUser();
  const [stats, listings] = await Promise.all([getLoopStats(user.id), listMyListings(user.id)]);

  return (
    <div className="px-page py-[55px]">
      <Eyebrow>Your activity</Eyebrow>
      <DisplayHeading as="h1" size="page" className="mt-3">
        Your loop, <span className="text-accent">{user.name.split(" ")[0]}.</span>
      </DisplayHeading>
      <p className="mt-4 text-[14px] text-fg-muted">
        Everything you&apos;re buying, renting, selling and exchanging.
      </p>

      {/* These were hard-coded zeros in the prototype — nothing ever computed them. */}
      <div className="mt-9 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile caption="Items listed" value={stats.listed} hint="live on campus" />
        <StatTile caption="Items for sale" value={stats.forSale} hint="currently listed" highlight />
        <StatTile caption="Items for rent" value={stats.forRent} hint="your rental listings" />
        <StatTile caption="Saved" value={stats.saved} hint="things you're watching" />
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-md border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <div>
              <Eyebrow className="text-fg-muted">Your items</Eyebrow>
              <h2 className="mt-1.5 text-[21px] font-bold tracking-tight">Your listings</h2>
            </div>
            <ButtonLink href="/listings/new" variant="outline" size="sm">
              New listing
            </ButtonLink>
          </div>

          <div className="mt-6">
            <ListingGrid
              listings={listings}
              renderAction={(listing) => (
                <ListingOwnerControls listingId={listing.id} slug={listing.slug} status={listing.status} />
              )}
              empty={
                <EmptyState
                  icon="📦"
                  title="You haven't listed anything yet"
                  description="That calculator you finished with last semester is someone else's next one."
                  action={{ label: "List an item", href: "/listings/new" }}
                />
              }
            />
          </div>
        </section>

        <aside className="h-fit rounded-md bg-pulse p-7">
          <Eyebrow className="text-fg-muted">Campus pulse</Eyebrow>
          <h2 className="mt-2 text-[29px] leading-[1.1] font-bold tracking-[-0.03em]">
            Your things can help another student.
          </h2>
          <p className="mt-4 text-[13px] leading-relaxed text-fg-muted">
            Every unused calculator, textbook, lab kit and project component can circulate
            instead of collecting dust.
          </p>
          <ButtonLink href="/listings/new" variant="primary" size="md" className="mt-6">
            List another item ↗
          </ButtonLink>
          <p className="mt-6 text-[11px] text-fg-muted">
            Watching something?{" "}
            <Link href="/saved" className="font-semibold text-fg underline-offset-4 hover:underline">
              See your saved items
            </Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
