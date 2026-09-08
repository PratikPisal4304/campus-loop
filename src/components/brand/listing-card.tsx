import Image from "next/image";
import Link from "next/link";
import type { ListingCardView } from "@/features/listings";
import { ItemIllustration } from "./item-illustration";
const SWATCH: Record<string, string> = {
  blue: "bg-swatch-blue",
  green: "bg-swatch-green",
  orange: "bg-swatch-orange",
  purple: "bg-swatch-purple",
  dark: "bg-panel-sunk",
  cream: "bg-swatch-cream",
  red: "bg-swatch-red",
  teal: "bg-swatch-teal",
};
const completedLabel: Record<string, string> = {
  sell: "Sold",
  rent: "Rented",
  exchange: "Exchanged",
  free: "Given away",
};
export function ListingCard({
  listing,
  action,
}: {
  listing: ListingCardView;
  action?: React.ReactNode;
}) {
  return (
    <article className="group border-border bg-surface hover:border-accent/50 overflow-hidden rounded-lg border transition-colors">
      <Link href={`/listings/${listing.slug}`} className="block">
        <div
          className={`relative flex aspect-[4/3] items-center justify-center overflow-hidden ${SWATCH[listing.swatch] ?? "bg-panel-sunk"}`}
        >
          {listing.imageUrl ? (
            <Image
              src={listing.imageUrl}
              alt=""
              fill
              sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <>
              <ItemIllustration
                category={listing.category}
                className="text-ink h-[78%] w-[85%] opacity-85"
              />
              <span className="bg-surface/95 text-fg-muted absolute right-3 bottom-3 rounded-sm px-2 py-1 font-mono text-[9px] tracking-wider uppercase">
                Photo not added
              </span>
            </>
          )}
          <span className="bg-surface text-accent absolute top-3 left-3 rounded-sm px-2.5 py-1.5 text-xs font-semibold">
            {listing.modeLabel}
          </span>
          {(listing.hidden || listing.status !== "active") && (
            <span className="bg-dark absolute top-3 right-3 rounded-sm px-2 py-1.5 text-xs text-white">
              {listing.hidden
                ? "Hidden by admin"
                : listing.status === "sold"
                  ? completedLabel[listing.mode]
                  : listing.status}
            </span>
          )}
        </div>
        <div className="p-4">
          <p className="text-fg-muted mb-2 font-mono text-[10px] tracking-wider uppercase">
            {listing.categoryLabel}
          </p>
          <h3 className="min-h-11 text-base leading-snug font-semibold tracking-tight break-words">
            {listing.title}
          </h3>
          <p className="text-fg-muted mt-2 text-xs">
            {listing.conditionLabel} · {listing.pickupArea}
          </p>
          <div className="border-border mt-4 flex items-end justify-between border-t border-dashed pt-3">
            <p className="text-accent text-xl font-bold tracking-tight">
              {listing.price}
              <span className="text-fg-muted ml-1 text-xs font-normal">
                {listing.priceSuffix}
              </span>
            </p>
            <span className="text-accent" aria-hidden="true">
              ↗
            </span>
          </div>
        </div>
      </Link>
      {action && <div className="px-4 pb-4">{action}</div>}
    </article>
  );
}
export function ListingGrid({
  listings,
  renderAction,
  empty,
}: {
  listings: readonly ListingCardView[];
  renderAction?: (listing: ListingCardView) => React.ReactNode;
  empty?: React.ReactNode;
}) {
  if (!listings.length) return <>{empty}</>;
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} action={renderAction?.(listing)} />
      ))}
    </div>
  );
}
