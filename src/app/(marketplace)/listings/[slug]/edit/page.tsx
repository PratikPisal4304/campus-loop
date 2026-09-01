import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Slug } from "@/core/types/branded";
import { requireUser } from "@/features/accounts";
import { getListingBySlug } from "@/features/listings";
import { DisplayHeading, Eyebrow } from "@/components/brand/typography";
import { ListingForm } from "../../../_components/listing-form";
import { ListingStatusBadge } from "../../../_components/listing-owner-controls";
import { updateListingAction } from "../../../_actions/listings";

export const metadata: Metadata = { title: "Edit listing" };

export default async function EditListingPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const user = await requireUser();
  const listing = await getListingBySlug(slug as Slug, null);

  if (!listing) notFound();
  // The use case checks ownership again on submit; this is the read-side half, so a
  // non-owner never sees the form pre-filled with someone else's listing in the first place.
  if (listing.sellerId !== user.id) redirect(`/listings/${listing.slug}`);

  return (
    <div className="px-page mx-auto max-w-[720px] py-[55px]">
      <Eyebrow>Update your listing</Eyebrow>
      <DisplayHeading as="h1" size="page" className="mt-3">
        Edit item
      </DisplayHeading>

      {listing.status !== "active" && (
        // Editing does not put a listing back on the market, so say where it stands and
        // where to change that.
        <p className="border-border text-fg-muted mt-5 flex flex-wrap items-center gap-2 rounded-sm border border-dashed p-3.5 text-[12px]">
          <ListingStatusBadge status={listing.status} />
          Nobody can find this on Discover. Reopen it from{" "}
          <Link href={`/listings/${listing.slug}`} className="text-fg font-semibold underline">
            the listing page
          </Link>{" "}
          when you want it back.
        </p>
      )}

      <div className="mt-10">
        <ListingForm action={updateListingAction} listing={listing} />
      </div>
    </div>
  );
}
