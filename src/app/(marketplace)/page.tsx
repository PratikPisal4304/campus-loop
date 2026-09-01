import { Suspense } from "react";
import { getSessionUser } from "@/features/accounts";
import {
  isCategory,
  isCondition,
  isMode,
  searchListings,
  type ListingQuery,
  type SortOrder,
} from "@/features/listings";
import { DiscoverControls } from "@/components/brand/discover-controls";
import { EmptyState } from "@/components/brand/empty-state";
import { ListingGrid } from "@/components/brand/listing-card";
import { DisplayHeading, Eyebrow } from "@/components/brand/typography";
import { ButtonLink } from "@/components/ui/button";
import { ListingGridSkeleton } from "@/components/ui/skeleton";
import { SaveButton } from "./_components/save-button";

/**
 * Filters are read from the URL and validated here, at the boundary. Anything the type
 * guards reject is dropped rather than passed through — a hand-edited `?category=<script>`
 * becomes "no category filter", not a query built from attacker-controlled text.
 */
function queryFrom(params: Record<string, string | string[] | undefined>): ListingQuery {
  const single = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const category = single("category");
  const mode = single("mode");
  const condition = single("condition");
  const sort = single("sort");

  return {
    search: single("q"),
    ...(category && isCategory(category) ? { category } : {}),
    ...(mode && isMode(mode) ? { mode } : {}),
    ...(condition && isCondition(condition) ? { condition } : {}),
    sort: sort === "price-asc" || sort === "price-desc" ? (sort as SortOrder) : "recent",
    status: "active",
  };
}

export default async function DiscoverPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const user = await getSessionUser();
  const { items, total } = await searchListings(queryFrom(searchParams), user?.id ?? null);

  const isFiltered = Object.keys(searchParams).length > 0;

  return (
    <>
      <section className="bg-hero px-page relative overflow-hidden py-[65px]">
        {/* The prototype's three decorative circles. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -right-20 h-[370px] w-[370px] rounded-full bg-[#c8d3c4] opacity-75"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-[140px] -bottom-24 h-[220px] w-[220px] rounded-full bg-[#f0c777] opacity-75"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-[70px] right-[330px] h-[110px] w-[110px] rounded-full bg-[#dd8361] opacity-75"
        />

        <div className="relative max-w-3xl">
          <Eyebrow tone="orange">✧ Student marketplace / education</Eyebrow>
          <DisplayHeading as="h1" size="hero" className="mt-4">
            Good stuff
            <br />
            <span className="text-accent">should move.</span>
          </DisplayHeading>
          <p className="text-fg-muted mt-6 max-w-xl text-[14px] leading-[1.8]">
            Buy what you need. Rent what you need temporarily. Sell what you no longer use.
            Exchange useful things with students around campus.
          </p>
        </div>
      </section>

      <section className="px-page py-10">
        <Suspense fallback={<div className="h-[50px]" />}>
          <DiscoverControls resultCount={total} />
        </Suspense>
      </section>

      <section className="px-page pb-[50px]">
        <Suspense fallback={<ListingGridSkeleton />}>
          <ListingGrid
            listings={items}
            renderAction={(listing) =>
              user ? <SaveButton listingId={listing.id} initialSaved={listing.isSaved} /> : null
            }
            empty={
              isFiltered ? (
                <EmptyState
                  icon="🔍"
                  title="Nothing matched that"
                  description="Try a different search term, or clear the filters to see everything on campus right now."
                  action={{ label: "Clear filters", href: "/" }}
                />
              ) : (
                <EmptyState
                  icon="📦"
                  title="Nothing in circulation yet"
                  description="Be the first to list something. A calculator you've finished with is someone else's next semester."
                  action={{ label: "List an item", href: "/listings/new" }}
                />
              )
            }
          />
        </Suspense>
      </section>

      <section className="px-page pb-[60px]">
        <div className="bg-banner flex flex-wrap items-center justify-between gap-6 rounded-lg px-8 py-10 text-white">
          <div>
            <Eyebrow tone="orange">Have something useful?</Eyebrow>
            <DisplayHeading className="mt-2 text-[32px] tracking-[-0.03em]">
              Don&apos;t let good stuff sit idle.
            </DisplayHeading>
            <p className="mt-3 text-[13px] text-white/70">
              Sell it, rent it, exchange it, or give it to another student.
            </p>
          </div>
          <ButtonLink href="/listings/new" variant="accent" size="lg">
            List an item ↗
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
