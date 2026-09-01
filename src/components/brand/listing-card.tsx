import Image from "next/image";
import Link from "next/link";
import type { ListingCardView } from "@/features/listings";
import { cn } from "@/shared/ui/cn";

/**
 * Swatch and badge colours are looked up from static maps rather than interpolated into
 * a class name — Tailwind scans source text, so `bg-swatch-${x}` would never be emitted.
 */
const SWATCH_CLASS: Record<ListingCardView["swatch"], string> = {
  blue: "bg-swatch-blue",
  green: "bg-swatch-green",
  orange: "bg-swatch-orange",
  purple: "bg-swatch-purple",
  dark: "bg-swatch-dark",
  cream: "bg-swatch-cream",
  red: "bg-swatch-red",
  teal: "bg-swatch-teal",
};

const MODE_CLASS: Record<ListingCardView["mode"], string> = {
  rent: "text-mode-rent",
  sell: "text-mode-sell",
  free: "text-mode-free",
  exchange: "text-mode-exchange",
};

const PRICE_CLASS: Record<ListingCardView["mode"], string> = {
  rent: "text-fg",
  sell: "text-fg",
  free: "text-green",
  exchange: "text-teal",
};

export function ListingCard({
  listing,
  action,
}: {
  listing: ListingCardView;
  /** Slot for the save toggle or the owner's edit/delete controls. */
  action?: React.ReactNode;
}) {
  return (
    <article className="group relative overflow-hidden rounded-md border border-border bg-surface transition-all duration-250 hover:-translate-y-1 hover:shadow-card-hover">
      <Link href={`/listings/${listing.slug}`} className="block">
        <div
          className={cn(
            "relative flex h-[190px] items-end overflow-hidden p-[18px]",
            SWATCH_CLASS[listing.swatch],
          )}
        >
          {/* The offset outlined circle from the prototype — it is what stops a flat
              colour block from reading as a missing image. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-[25px] -right-[25px] h-[140px] w-[140px] rounded-full border border-white/40"
          />

          {listing.imageUrl && (
            <Image
              src={listing.imageUrl}
              alt=""
              fill
              sizes="(max-width: 800px) 100vw, (max-width: 1100px) 50vw, 25vw"
              className="object-cover"
            />
          )}

          <span
            className={cn(
              "absolute top-3 left-3 z-2 rounded-xs bg-white px-2 py-1.5 font-mono text-[8px] font-bold tracking-[0.1em] uppercase",
              MODE_CLASS[listing.mode],
            )}
          >
            {listing.modeLabel}
          </span>

          <div className="relative z-2 text-white drop-shadow-sm">
            <span className="font-mono text-[8px] tracking-[0.12em] uppercase">
              {listing.categoryLabel}
            </span>
          </div>
        </div>

        <div className="p-[17px]">
          <h3 className="min-h-[38px] text-[14px] leading-[1.35] font-semibold tracking-normal">
            {listing.title}
          </h3>

          <p className="mt-2.5 text-[9px] text-fg-muted">📍 {listing.pickupArea}</p>

          <div className="mt-2 flex items-center justify-between text-[9px]">
            <span className="text-fg-muted">{listing.conditionLabel}</span>
          </div>

          <p className={cn("numeral mt-4 text-[20px] font-bold", PRICE_CLASS[listing.mode])}>
            {listing.price}
            {listing.priceSuffix && (
              <span className="ml-0.5 text-[9px] font-normal text-fg-muted">
                {listing.priceSuffix}
              </span>
            )}
          </p>
        </div>
      </Link>

      {action && <div className="px-[17px] pb-[17px]">{action}</div>}

      {listing.status !== "active" && (
        <span className="absolute top-3 right-3 z-2 rounded-xs bg-dark px-2 py-1 font-mono text-[8px] font-bold tracking-[0.1em] text-white uppercase">
          {listing.status}
        </span>
      )}
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
  if (listings.length === 0) return <>{empty}</>;

  return (
    <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2 xl:grid-cols-4">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} action={renderAction?.(listing)} />
      ))}
    </div>
  );
}
