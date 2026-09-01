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

/**
 * Foreground for the label that sits *on* the swatch. Seven of the eight swatches are
 * pastels where white lands between 1.6:1 and 3.2:1, so ink is the only passing choice;
 * only `dark` is deep enough to carry white (6.63:1).
 */
const SWATCH_FG_CLASS: Record<ListingCardView["swatch"], string> = {
  blue: "text-ink",
  green: "text-ink",
  orange: "text-ink",
  purple: "text-ink",
  dark: "text-white",
  cream: "text-ink",
  red: "text-ink",
  teal: "text-ink",
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
    <article className="group border-border bg-surface hover:shadow-card-hover relative overflow-hidden rounded-md border transition-all duration-250 hover:-translate-y-1">
      <Link href={`/listings/${listing.slug}`} className="block">
        <div
          className={cn(
            "relative flex h-[190px] items-end overflow-hidden p-[18px]",
            SWATCH_CLASS[listing.swatch],
            SWATCH_FG_CLASS[listing.swatch],
          )}
        >
          {/* The offset outlined circle from the prototype — it is what stops a flat
              colour block from reading as a missing image. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-[25px] -right-[25px] h-[140px] w-[140px] rounded-full border border-current opacity-25"
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
              "absolute top-3 left-3 z-2 rounded-xs bg-white px-2 py-1.5 font-mono text-[10px] font-bold tracking-[0.1em] uppercase",
              MODE_CLASS[listing.mode],
            )}
          >
            {listing.modeLabel}
          </span>

          {/* Over a swatch the label inherits the swatch's own safe foreground; over a
              user photo nothing is knowable, so it gets an opaque-enough scrim instead —
              at 75% ink the worst case (a pure-white photo) still leaves white at 7.9:1. */}
          <div
            className={cn(
              "relative z-2",
              listing.imageUrl && "bg-ink/75 rounded-xs px-2 py-1 text-white",
            )}
          >
            <span className="font-mono text-[10px] tracking-[0.12em] uppercase">
              {listing.categoryLabel}
            </span>
          </div>
        </div>

        <div className="p-[17px]">
          <h3 className="min-h-[38px] text-[14px] leading-[1.35] font-semibold tracking-normal break-words hyphens-auto">
            {listing.title}
          </h3>

          <p className="text-fg-muted mt-2.5 text-[11px]">📍 {listing.pickupArea}</p>

          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-fg-muted">{listing.conditionLabel}</span>
          </div>

          <p className={cn("numeral mt-4 text-[20px] font-bold", PRICE_CLASS[listing.mode])}>
            {listing.price}
            {listing.priceSuffix && (
              <span className="text-fg-muted ml-0.5 text-[11px] font-normal">
                {listing.priceSuffix}
              </span>
            )}
          </p>
        </div>
      </Link>

      {action && <div className="px-[17px] pb-[17px]">{action}</div>}

      {listing.status !== "active" && (
        <span className="bg-dark absolute top-3 right-3 z-2 rounded-xs px-2 py-1 font-mono text-[10px] font-bold tracking-[0.1em] text-white uppercase">
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
