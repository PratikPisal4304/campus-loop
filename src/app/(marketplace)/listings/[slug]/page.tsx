import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Slug } from "@/core/types/branded";
import { getProfile, getSessionUser } from "@/features/accounts";
import { getListingBySlug, listActiveSlugs } from "@/features/listings";
import { Eyebrow } from "@/components/brand/typography";
import { toEntityId } from "@/core/types/branded";
import { SaveButton } from "../../_components/save-button";
import { MessageSellerButton } from "../../_components/message-seller-button";

const SWATCH_CLASS: Record<string, string> = {
  blue: "bg-swatch-blue",
  green: "bg-swatch-green",
  orange: "bg-swatch-orange",
  purple: "bg-swatch-purple",
  dark: "bg-swatch-dark",
  cream: "bg-swatch-cream",
  red: "bg-swatch-red",
  teal: "bg-swatch-teal",
};

export async function generateStaticParams() {
  const slugs = await listActiveSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const listing = await getListingBySlug(slug as Slug, null);
  if (!listing) return { title: "Listing not found" };
  return {
    title: listing.title,
    description: listing.description.slice(0, 155),
  };
}

export default async function ListingDetailPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const viewer = await getSessionUser();
  const listing = await getListingBySlug(slug as Slug, viewer?.id ?? null);
  if (!listing) notFound();

  const seller = await getProfile(toEntityId(listing.sellerId));
  const isOwner = viewer?.id === listing.sellerId;
  const cover = listing.images[0];

  return (
    <div className="mx-auto grid max-w-[1100px] gap-12 px-page py-[55px] lg:grid-cols-[1.2fr_0.8fr]">
      <div>
        <div
          className={`relative flex h-[380px] items-end overflow-hidden rounded-lg p-7 ${SWATCH_CLASS[listing.swatch] ?? "bg-swatch-blue"}`}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-12 -right-12 h-[260px] w-[260px] rounded-full border border-white/40"
          />
          {cover && (
            <Image
              src={cover.url}
              alt={listing.title}
              fill
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover"
              priority
            />
          )}
          <span className="relative z-2 rounded-xs bg-white px-2.5 py-1.5 font-mono text-[9px] font-bold tracking-[0.1em] uppercase">
            {listing.modeLabel}
          </span>
        </div>

        {listing.images.length > 1 && (
          <div className="mt-3 grid grid-cols-4 gap-3">
            {listing.images.slice(1).map((image) => (
              <div key={image.url} className="relative h-24 overflow-hidden rounded-sm">
                <Image src={image.url} alt="" fill sizes="20vw" className="object-cover" />
              </div>
            ))}
          </div>
        )}

        <section className="mt-9">
          <Eyebrow className="text-fg-muted">Description</Eyebrow>
          <p className="mt-3 text-[14px] leading-[1.8] whitespace-pre-line text-fg">
            {listing.description}
          </p>
        </section>
      </div>

      <aside className="h-fit lg:sticky lg:top-24">
        <Eyebrow tone="orange">{listing.categoryLabel}</Eyebrow>
        <h1 className="mt-3 text-[32px] leading-[1.1] font-bold tracking-[-0.035em]">
          {listing.title}
        </h1>

        <p className="numeral mt-5 text-[34px] font-bold">
          {listing.price}
          {listing.priceSuffix && (
            <span className="ml-1 text-[12px] font-normal text-fg-muted">
              {listing.priceSuffix}
            </span>
          )}
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-border py-5 text-[12px]">
          <div>
            <dt className="eyebrow text-fg-muted">Condition</dt>
            <dd className="mt-1 font-semibold">{listing.conditionLabel}</dd>
          </div>
          <div>
            <dt className="eyebrow text-fg-muted">Pickup</dt>
            <dd className="mt-1 font-semibold">{listing.pickupArea}</dd>
          </div>
        </dl>

        {seller && (
          <Link
            href={`/profile/${seller.id}`}
            className="mt-6 flex items-center gap-3 rounded-md border border-border bg-surface p-4 transition-colors hover:border-accent"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-avatar text-[13px] font-bold">
              {seller.initials}
            </span>
            <span>
              <span className="block text-[13px] font-semibold">{seller.name}</span>
              <span className="block text-[11px] text-fg-muted">
                {seller.trust.rating
                  ? `★ ${seller.trust.rating} · ${seller.trust.label}`
                  : "New to Campus Loop"}
              </span>
            </span>
          </Link>
        )}

        <div className="mt-5 flex flex-col gap-2.5">
          {isOwner ? (
            <Link
              href={`/listings/${listing.slug}/edit`}
              className="flex h-11 items-center justify-center rounded-sm border border-border text-[13px] font-semibold transition-colors hover:border-accent hover:text-accent"
            >
              Edit your listing
            </Link>
          ) : (
            <MessageSellerButton
              listingId={listing.id}
              sellerId={listing.sellerId}
              slug={listing.slug}
              isSignedIn={Boolean(viewer)}
            />
          )}

          {viewer && !isOwner && (
            <SaveButton listingId={listing.id} initialSaved={listing.isSaved} />
          )}
        </div>

        <p className="mt-6 rounded-sm bg-[#edf1e9] p-3.5 text-[11px] leading-relaxed text-fg-muted">
          ⓘ Meet in a public spot on campus and check the item before you pay.
        </p>
      </aside>
    </div>
  );
}
