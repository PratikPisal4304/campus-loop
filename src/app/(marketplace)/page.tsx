import { ItemIllustration } from "@/components/brand/item-illustration";
import { Fragment, Suspense } from "react";
import Link from "next/link";
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
import { cn } from "@/shared/ui/cn";
import { SaveButton } from "./_components/save-button";

type SearchParams = Record<string, string | string[] | undefined>;

/** Discover shows a full page of 24; the grid is 1/2/4-up, so every row stays complete. */
const PAGE_SIZE = 24;

/**
 * An upper bound on `?page=`, so a hand-typed `?page=1e9` cannot turn into an absurd
 * `skip`. Anything past the real last page is snapped back by `searchListings` anyway.
 */
const MAX_PAGE = 1_000;

function single(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

/** 1-based, and never anything but a whole number in range — the URL is untrusted input. */
function pageFrom(params: SearchParams): number {
  const raw = Number(single(params, "page"));
  if (!Number.isFinite(raw)) return 1;
  return Math.min(Math.max(1, Math.trunc(raw)), MAX_PAGE);
}

/**
 * Filters are read from the URL and validated here, at the boundary. Anything the type
 * guards reject is dropped rather than passed through — a hand-edited `?category=<script>`
 * becomes "no category filter", not a query built from attacker-controlled text.
 */
function queryFrom(params: SearchParams): ListingQuery {
  const search = single(params, "q")?.trim();
  const category = single(params, "category");
  const mode = single(params, "mode");
  const condition = single(params, "condition");
  const sort = single(params, "sort");

  return {
    ...(search ? { search } : {}),
    ...(category && isCategory(category) ? { category } : {}),
    ...(mode && isMode(mode) ? { mode } : {}),
    ...(condition && isCondition(condition) ? { condition } : {}),
    sort: sort === "price-asc" || sort === "price-desc" ? (sort as SortOrder) : "recent",
    status: "active",
    limit: PAGE_SIZE,
    skip: (pageFrom(params) - 1) * PAGE_SIZE,
  };
}

/** Paging must not drop the filters — every other param is carried across verbatim. */
function hrefForPage(params: SearchParams, page: number): string {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "page" || value === undefined) continue;
    if (Array.isArray(value)) for (const item of value) next.append(key, item);
    else next.set(key, value);
  }
  if (page > 1) next.set("page", String(page));
  const search = next.toString();
  return search ? `/?${search}` : "/";
}

/** First, last, and the current page's neighbours — the rest collapse into an ellipsis. */
function pageWindow(page: number, pageCount: number): readonly number[] {
  const candidates = new Set([1, page - 1, page, page + 1, pageCount]);
  return [...candidates].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);
}

function Pagination({
  params,
  page,
  pageCount,
}: {
  params: SearchParams;
  page: number;
  pageCount: number;
}) {
  if (pageCount < 2) return null;

  const stepClass =
    "border-border text-fg hover:border-accent hover:text-accent flex h-9 items-center rounded-sm border px-3 text-[12px] font-semibold transition-colors";

  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center gap-1.5">
      {page > 1 ? (
        <Link href={hrefForPage(params, page - 1)} rel="prev" className={stepClass}>
          ← Previous
        </Link>
      ) : (
        <span aria-hidden="true" className={cn(stepClass, "opacity-40")}>
          ← Previous
        </span>
      )}

      {pageWindow(page, pageCount).map((n, index, shown) => (
        <Fragment key={n}>
          {index > 0 && n - (shown[index - 1] ?? 0) > 1 && (
            <span aria-hidden="true" className="text-fg-muted px-1 text-[12px]">
              …
            </span>
          )}
          {n === page ? (
            <span
              aria-current="page"
              className="border-accent bg-accent flex h-9 min-w-9 items-center justify-center rounded-sm border px-2 text-[12px] font-semibold text-white"
            >
              {n}
            </span>
          ) : (
            <Link
              href={hrefForPage(params, n)}
              aria-label={`Page ${n}`}
              className="border-border text-fg hover:border-accent hover:text-accent flex h-9 min-w-9 items-center justify-center rounded-sm border px-2 text-[12px] font-semibold transition-colors"
            >
              {n}
            </Link>
          )}
        </Fragment>
      ))}

      {page < pageCount ? (
        <Link href={hrefForPage(params, page + 1)} rel="next" className={stepClass}>
          Next →
        </Link>
      ) : (
        <span aria-hidden="true" className={cn(stepClass, "opacity-40")}>
          Next →
        </span>
      )}
    </nav>
  );
}

export default async function DiscoverPage(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const user = await getSessionUser();
  const query = queryFrom(searchParams);
  const { items, total, page, pageCount, pageSize } = await searchListings(
    query,
    user?.id ?? null,
  );

  // Sorting is not filtering: changing only `?sort=` must still show the onboarding empty
  // state, not "nothing matched — clear the filters" over a marketplace that is simply new.
  const isFiltered = Boolean(query.search || query.category || query.mode || query.condition);

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = rangeStart === 0 ? 0 : rangeStart + items.length - 1;

  return (
    <>
      <section className="px-page grid gap-8 pt-7 pb-5 md:grid-cols-[1.4fr_1fr] md:items-center md:pt-9">
        <div>
          <Eyebrow>The campus noticeboard / Buy · Rent · Exchange</Eyebrow>
          <h1 className="mt-5 max-w-2xl text-[clamp(34px,4.2vw,58px)] leading-[1.02] tracking-[-.045em]">
            Good things deserve
            <br />
            <span className="text-accent">another semester.</span>
          </h1>
          <p className="text-fg-muted mt-5 max-w-lg text-base leading-relaxed">
            The textbook you need. The calculator they’ve finished with. Find it right here, on
            your campus.
          </p>
          <div className="mt-5 flex gap-5 text-sm font-semibold">
            <Link href="#browse" className="text-accent underline underline-offset-4">
              Find your next useful thing ↓
            </Link>
            <Link
              href="/listings/new"
              className="hidden underline underline-offset-4 sm:inline"
            >
              Post a listing ↗
            </Link>
          </div>
        </div>
        <div className="relative mx-auto hidden w-full max-w-sm px-5 py-3 md:block">
          <div className="bg-highlight absolute top-0 left-12 z-10 h-7 w-24 -rotate-6 opacity-80" />
          <div className="border-border bg-surface shadow-card rotate-2 rounded-sm border px-6 pt-7 pb-4">
            <p className="eyebrow text-fg-muted">Pass it on.</p>
            <ItemIllustration category="books" className="text-accent mx-auto h-32 w-full" />
            <p className="text-accent text-center text-xl font-bold">
              One student’s last chapter.
              <br />
              Another’s fresh start.
            </p>
            <div className="border-border mt-5 flex justify-between border-t border-dashed pt-3 font-mono text-[10px] tracking-wider uppercase">
              <span>Less waste</span>
              <span>More possibility ↻</span>
            </div>
          </div>
        </div>
      </section>

      <section id="browse" className="px-page scroll-mt-24 pt-5 pb-7">
        <Suspense fallback={<div className="h-[50px]" />}>
          <DiscoverControls total={total} rangeStart={rangeStart} rangeEnd={rangeEnd} />
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
        <Pagination params={searchParams} page={page} pageCount={pageCount} />
      </section>

      <section className="px-page pb-[60px]">
        <div className="bg-banner flex flex-wrap items-center justify-between gap-6 rounded-lg px-8 py-10 text-white">
          <div>
            <Eyebrow tone="on-dark">Have something useful?</Eyebrow>
            <DisplayHeading className="mt-2 text-[32px] tracking-[-0.03em]">
              Someone on campus needs what you no longer use.
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
