import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/features/accounts";
import {
  LISTING_STATUSES,
  LISTING_STATUS_LABELS,
  getLoopStats,
  isListingStatus,
  listMyListings,
  type ListingCardView,
  type ListingStatus,
} from "@/features/listings";
import { EmptyState } from "@/components/brand/empty-state";
import { ListingGrid } from "@/components/brand/listing-card";
import { DisplayHeading, Eyebrow } from "@/components/brand/typography";
import { ButtonLink } from "@/components/ui/button";
import {
  ListingActionToast,
  ListingOwnerControls,
} from "../_components/listing-owner-controls";
import { cn } from "@/shared/ui/cn";

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
      className={`border-border rounded-md border p-5 ${highlight ? "bg-highlight" : "bg-surface"}`}
    >
      <p className="eyebrow text-fg-muted">{caption}</p>
      <p className="numeral mt-2 text-[34px] font-bold">{value}</p>
      <p className="text-fg-muted mt-1 text-[11px]">{hint}</p>
    </div>
  );
}

function countByStatus(listings: readonly ListingCardView[]): Record<ListingStatus, number> {
  const counts: Record<ListingStatus, number> = { active: 0, reserved: 0, sold: 0, closed: 0 };
  for (const listing of listings) counts[listing.status] += 1;
  return counts;
}

const FILTER_HINTS: Record<ListingStatus, string> = {
  active: "live on campus",
  reserved: "held for a buyer",
  sold: "deals you closed",
  closed: "withdrawn, reopenable",
};

export default async function LoopPage(props: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await props.searchParams;
  const user = await requireUser();
  const [stats, listings] = await Promise.all([getLoopStats(user.id), listMyListings(user.id)]);

  const filter = status && isListingStatus(status) ? status : null;
  const counts = countByStatus(listings);
  const shown = filter ? listings.filter((listing) => listing.status === filter) : listings;

  // Every number on this page now comes from the same array the grid below renders, so the
  // tiles and the list can no longer disagree — which they did while the tiles counted only
  // active listings and the grid showed all of them.
  const live = listings.filter((listing) => listing.status === "active");
  const forSale = live.filter((listing) => listing.mode === "sell").length;
  const forRent = live.filter((listing) => listing.mode === "rent").length;

  return (
    <div className="px-page py-[55px]">
      <ListingActionToast />

      <Eyebrow>Your activity</Eyebrow>
      <DisplayHeading as="h1" size="page" className="mt-3">
        Your loop, <span className="text-accent">{user.name.split(" ")[0]}.</span>
      </DisplayHeading>
      <p className="text-fg-muted mt-4 text-[14px]">
        Everything you&apos;re buying, renting, selling and exchanging.
      </p>

      {/* These were hard-coded zeros in the prototype — nothing ever computed them. */}
      <div className="mt-9 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile
          caption="Live"
          value={counts.active}
          hint={`${forSale} for sale · ${forRent} for rent`}
          highlight
        />
        <StatTile caption="Reserved" value={counts.reserved} hint="held for a buyer" />
        <StatTile caption="Sold" value={counts.sold} hint="deals you closed" />
        <StatTile caption="Saved" value={stats.saved} hint="things you're watching" />
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-[2fr_1fr]">
        <section className="border-border bg-surface rounded-md border p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Eyebrow className="text-fg-muted">Your items</Eyebrow>
              <h2 className="mt-1.5 text-[21px] font-bold tracking-tight">Your listings</h2>
            </div>
            <ButtonLink href="/listings/new" variant="outline" size="sm">
              New listing
            </ButtonLink>
          </div>

          {listings.length > 0 && (
            // Links rather than a client filter: the view survives a reload and the back
            // button, and a student can bookmark "my sold items".
            <div className="mt-5 flex flex-wrap gap-2">
              <StatusChip href="/loop" label="All" count={listings.length} active={!filter} />
              {LISTING_STATUSES.map((value) => (
                <StatusChip
                  key={value}
                  href={`/loop?status=${value}`}
                  label={LISTING_STATUS_LABELS[value]}
                  count={counts[value]}
                  active={filter === value}
                />
              ))}
            </div>
          )}

          <div className="mt-6">
            <ListingGrid
              listings={shown}
              renderAction={(listing) => (
                <ListingOwnerControls
                  listingId={listing.id}
                  slug={listing.slug}
                  status={listing.status}
                />
              )}
              empty={
                filter ? (
                  <EmptyState
                    icon="📭"
                    title={`Nothing ${LISTING_STATUS_LABELS[filter].toLowerCase()}`}
                    description={`You have no listings ${FILTER_HINTS[filter]}.`}
                    action={{ label: "Show all your listings", href: "/loop" }}
                  />
                ) : (
                  <EmptyState
                    icon="📦"
                    title="You haven't listed anything yet"
                    description="That calculator you finished with last semester is someone else's next one."
                    action={{ label: "List an item", href: "/listings/new" }}
                  />
                )
              }
            />
          </div>
        </section>

        <aside className="bg-pulse h-fit rounded-md p-7">
          <Eyebrow className="text-fg-muted">Campus pulse</Eyebrow>
          <h2 className="mt-2 text-[29px] leading-[1.1] font-bold tracking-[-0.03em]">
            Your things can help another student.
          </h2>
          <p className="text-fg-muted mt-4 text-[13px] leading-relaxed">
            Every unused calculator, textbook, lab kit and project component can circulate
            instead of collecting dust.
          </p>
          <ButtonLink href="/listings/new" variant="primary" size="md" className="mt-6">
            List another item ↗
          </ButtonLink>
          <p className="text-fg-muted mt-6 text-[11px]">
            Watching something?{" "}
            <Link
              href="/saved"
              className="text-fg font-semibold underline-offset-4 hover:underline"
            >
              See your saved items
            </Link>
          </p>
        </aside>
      </div>
    </div>
  );
}

function StatusChip({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-sm border px-3 py-1.5 text-[12px] font-semibold transition-colors",
        active
          ? "border-accent bg-accent/10 text-accent"
          : "border-border text-fg-muted hover:border-accent hover:text-accent",
      )}
    >
      {label} <span className="numeral opacity-70">{count}</span>
    </Link>
  );
}
