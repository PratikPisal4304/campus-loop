import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { Slug } from "@/core/types/branded";
import { requireUser } from "@/features/accounts";
import { getListingBySlug } from "@/features/listings";
import { DisplayHeading, Eyebrow } from "@/components/brand/typography";
import { ListingForm } from "../../../_components/listing-form";
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

      <div className="mt-10">
        <ListingForm action={updateListingAction} listing={listing} />
      </div>
    </div>
  );
}
