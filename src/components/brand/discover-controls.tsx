"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import {
  CATEGORIES,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  CONDITIONS,
  CONDITION_LABELS,
} from "@/features/listings/client";
import { cn } from "@/shared/ui/cn";

const MODE_CHIPS = [
  { value: "", icon: "◉", label: "All Items", hint: "Everything" },
  { value: "rent", icon: "🔄", label: "Rent", hint: "Use temporarily" },
  { value: "sell", icon: "🛍", label: "Buy", hint: "Second-hand items" },
  { value: "exchange", icon: "♻", label: "Exchange", hint: "Swap with students" },
  { value: "free", icon: "🆓", label: "Free", hint: "Give it away" },
] as const;

/**
 * All filter state lives in the URL.
 *
 * That makes a filtered view shareable, survivable across a reload, and correct with the
 * back button — none of which the prototype's four (unwritten) client-side filter
 * functions could have offered, since they mutated hidden DOM state.
 */
export function DiscoverControls({ resultCount }: { resultCount: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState(params.get("q") ?? "");

  const apply = useCallback(
    (changes: Record<string, string>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      const search = next.toString();
      router.push(search ? `/?${search}` : "/", { scroll: false });
    },
    [params, router],
  );

  const activeMode = params.get("mode") ?? "";
  const activeCategory = params.get("category") ?? "";
  const hasFilters = Boolean(
    params.get("q") || params.get("category") || params.get("mode") || params.get("condition"),
  );

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
        <div className="border-border flex h-[50px] w-full max-w-[470px] items-center gap-2 rounded-[5px] border bg-white px-4">
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
            className="placeholder:text-fg-muted/70 flex-1 bg-transparent text-[13px] outline-none [&::-webkit-search-cancel-button]:appearance-none"
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
              ✕
            </button>
          )}
          <button type="submit" aria-label="Search" className="text-[18px]">
            🔍
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowFilters((open) => !open)}
          aria-expanded={showFilters}
          className="border-border hover:border-accent h-[50px] rounded-[5px] border px-4 text-[12px] font-semibold transition-colors"
        >
          ☷ Filters
        </button>

        {hasFilters && (
          <button
            type="button"
            onClick={() => router.push("/", { scroll: false })}
            className="text-accent text-[12px] font-semibold underline-offset-4 hover:underline"
          >
            Clear all
          </button>
        )}
      </form>

      {showFilters && (
        <div className="bg-panel-sunk mt-4 grid gap-4 rounded-md p-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow text-fg-muted">Category</span>
            <select
              value={activeCategory}
              onChange={(event) => apply({ category: event.target.value })}
              className="border-border h-10 rounded-sm border bg-white px-3 text-[13px]"
            >
              <option value="">All categories</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </label>

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
      )}

      <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
        {MODE_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => apply({ mode: chip.value })}
            aria-pressed={activeMode === chip.value}
            className={cn(
              "flex flex-col items-start gap-0.5 rounded-md border p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5",
              activeMode === chip.value
                ? "border-accent bg-[#fff8f3]"
                : "border-border bg-surface hover:border-accent/40",
            )}
          >
            <span aria-hidden="true" className="text-[16px]">
              {chip.icon}
            </span>
            <strong className="text-[13px]">{chip.label}</strong>
            <small className="text-fg-muted text-[10px]">{chip.hint}</small>
          </button>
        ))}
      </div>

      <div className="mt-8">
        <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-4 xl:grid-cols-8">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => apply({ category: activeCategory === category ? "" : category })}
              aria-pressed={activeCategory === category}
              className={cn(
                "flex min-h-[82px] flex-col items-center justify-center gap-1.5 rounded-md border p-2 text-center transition-all duration-200 hover:-translate-y-0.5",
                activeCategory === category
                  ? "border-accent bg-[#fff8f3]"
                  : "border-border bg-surface hover:border-accent/40",
              )}
            >
              <span aria-hidden="true" className="text-[20px]">
                {CATEGORY_ICONS[category]}
              </span>
              <span className="text-[10px] leading-tight font-semibold">
                {CATEGORY_LABELS[category]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <p className="eyebrow text-fg-muted mt-8" aria-live="polite">
        {resultCount} {resultCount === 1 ? "item" : "items"}
      </p>
    </div>
  );
}
