"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CONDITIONS,
  CONDITION_LABELS,
  MODE_LABELS,
  isCategory,
  isCondition,
  isMode,
} from "@/features/listings/client";
import { cn } from "@/shared/ui/cn";

const MODE_CHIPS = [
  { value: "", icon: "◉", label: "All Items", hint: "Everything" },
  { value: "rent", icon: "🔄", label: "Rent", hint: "Use temporarily" },
  { value: "sell", icon: "🛍", label: "Buy", hint: "Second-hand items" },
  { value: "exchange", icon: "♻", label: "Exchange", hint: "Swap with students" },
  { value: "free", icon: "🆓", label: "Free", hint: "Give it away" },
] as const;

const FILTER_PANEL_ID = "discover-filter-panel";

interface ActiveFilter {
  readonly key: "q" | "category" | "mode" | "condition";
  readonly label: string;
}

/**
 * All filter state lives in the URL.
 *
 * That makes a filtered view shareable, survivable across a reload, and correct with the
 * back button — none of which the prototype's four (unwritten) client-side filter
 * functions could have offered, since they mutated hidden DOM state.
 */
export function DiscoverControls({
  total,
  rangeStart,
  rangeEnd,
}: {
  total: number;
  rangeStart: number;
  rangeEnd: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const searchParam = params.get("q") ?? "";
  const [query, setQuery] = useState(searchParam);
  const [seededFrom, setSeededFrom] = useState(searchParam);

  // The box holds unsubmitted text, so the URL cannot own it outright — but when `q` itself
  // changes underneath (back-navigation to a different search, "Clear all") the old text is
  // stale and must be re-seeded. React's own "adjust state during render" pattern: no
  // effect, no extra commit.
  if (seededFrom !== searchParam) {
    setSeededFrom(searchParam);
    setQuery(searchParam);
  }

  const apply = useCallback(
    (changes: Record<string, string>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      // Page 3 of the old result set is meaningless against the new one, and usually past
      // its end. Any change to the query starts over at page 1.
      next.delete("page");
      const search = next.toString();
      router.push(search ? `/?${search}` : "/", { scroll: false });
    },
    [params, router],
  );

  const activeMode = params.get("mode") ?? "";
  const activeCategory = params.get("category") ?? "";

  // Only filters that survive validation are shown — an unremovable chip for a bogus
  // `?category=xyz` (which the server drops anyway) would misdescribe the results.
  const activeFilters = useMemo<readonly ActiveFilter[]>(() => {
    const chips: ActiveFilter[] = [];
    const q = params.get("q")?.trim();
    const category = params.get("category");
    const mode = params.get("mode");
    const condition = params.get("condition");

    if (q) chips.push({ key: "q", label: `“${q}”` });
    if (category && isCategory(category)) {
      chips.push({ key: "category", label: CATEGORY_LABELS[category] });
    }
    if (mode && isMode(mode)) chips.push({ key: "mode", label: MODE_LABELS[mode] });
    if (condition && isCondition(condition)) {
      chips.push({ key: "condition", label: CONDITION_LABELS[condition] });
    }
    return chips;
  }, [params]);

  return (
    <div>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          apply({ q: query.trim() });
        }}
        className="flex flex-wrap items-center gap-3"
      >
        <div className="border-border flex h-[50px] max-w-[720px] min-w-0 flex-1 items-center gap-2 rounded-[5px] border bg-white px-4">
          <span aria-hidden="true" className="text-fg-muted">
            ⌕
          </span>
          <label htmlFor="discover-search" className="sr-only">
            Search listings
          </label>
          <input
            id="discover-search"
            // type="search" rather than "text": it carries the searchbox role, and mobile
            // keyboards show a "Search" key instead of a newline.
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='Search "calculator", "textbook", "Arduino"...'
            autoComplete="off"
            className="placeholder:text-fg-muted/70 min-w-0 flex-1 bg-transparent text-[15px] outline-none [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                apply({ q: "" });
              }}
              className="text-fg-muted hover:text-fg transition-colors"
              aria-label="Clear search"
            >
              <span aria-hidden="true">✕</span>
            </button>
          )}
          <button type="submit" aria-label="Search" className="text-accent text-sm font-bold">
            <span>
              <span className="hidden sm:inline">Search </span>→
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowFilters((open) => !open)}
          aria-expanded={showFilters}
          aria-controls={FILTER_PANEL_ID}
          className="border-border hover:border-accent flex h-[50px] items-center gap-2 rounded-[5px] border px-4 text-[12px] font-semibold transition-colors"
        >
          {/* Decorative: screen readers otherwise announce the trigram as "hexagram". */}
          <span aria-hidden="true">☷</span>
          Filters
          {activeFilters.length > 0 && (
            <span className="bg-accent flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] text-white">
              {activeFilters.length}
              <span className="sr-only"> active filters</span>
            </span>
          )}
        </button>

        {activeFilters.length > 0 && (
          <button
            type="button"
            onClick={() => router.push("/", { scroll: false })}
            className="text-accent text-[12px] font-semibold underline-offset-4 hover:underline"
          >
            Clear all
          </button>
        )}
      </form>

      {activeFilters.length > 0 && (
        <ul className="mt-3 flex flex-wrap items-center gap-2">
          {activeFilters.map((filter) => (
            <li key={filter.key}>
              <button
                type="button"
                onClick={() => {
                  if (filter.key === "q") setQuery("");
                  apply({ [filter.key]: "" });
                }}
                aria-label={`Remove filter ${filter.label}`}
                className="border-border bg-surface hover:border-accent hover:text-accent flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] transition-colors"
              >
                {filter.label}
                <span aria-hidden="true" className="text-fg-muted">
                  ✕
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Category lives in the tile grid below and nowhere else: two controls writing the
          same param with different interaction models is how one of them ends up stale. */}
      <div
        id={FILTER_PANEL_ID}
        className={cn(
          "bg-panel-sunk mt-4 gap-4 rounded-md p-5 sm:grid-cols-2",
          showFilters ? "grid" : "hidden",
        )}
      >
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow text-fg-muted">Condition</span>
          <select
            value={params.get("condition") ?? ""}
            onChange={(event) => apply({ condition: event.target.value })}
            className="border-border h-10 rounded-sm border bg-white px-3 text-[13px]"
          >
            <option value="">Any condition</option>
            {CONDITIONS.map((condition) => (
              <option key={condition} value={condition}>
                {CONDITION_LABELS[condition]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="eyebrow text-fg-muted">Sort by</span>
          <select
            value={params.get("sort") ?? "recent"}
            onChange={(event) => apply({ sort: event.target.value })}
            className="border-border h-10 rounded-sm border bg-white px-3 text-[13px]"
          >
            <option value="recent">Newest first</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </label>
      </div>

      <div
        role="group"
        aria-label="Filter by listing type"
        className="border-border no-scrollbar mt-5 flex gap-2 overflow-x-auto border-b pb-3"
      >
        {MODE_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => apply({ mode: chip.value })}
            aria-pressed={activeMode === chip.value}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-left transition-colors",
              activeMode === chip.value
                ? "border-accent bg-checklist text-accent"
                : "border-border bg-surface hover:border-accent/40",
            )}
          >
            <strong className="text-[13px]">{chip.label}</strong>
          </button>
        ))}
      </div>

      <div className="mt-5">
        <h2 className="eyebrow text-fg-muted mb-2.5">Category</h2>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => apply({ category: activeCategory === category ? "" : category })}
              aria-pressed={activeCategory === category}
              className={cn(
                "shrink-0 rounded-md border px-3 py-2 text-center transition-colors",
                activeCategory === category
                  ? "border-accent bg-checklist text-accent"
                  : "border-border bg-surface hover:border-accent/40",
              )}
            >
              <span className="text-[12px] leading-tight font-medium">
                {CATEGORY_LABELS[category]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <p className="eyebrow text-fg-muted mt-6" aria-live="polite">
        {total === 0
          ? "No items"
          : `Showing ${rangeStart}–${rangeEnd} of ${total} ${total === 1 ? "item" : "items"}`}
      </p>
    </div>
  );
}
