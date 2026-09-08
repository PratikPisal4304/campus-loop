import type { Metadata } from "next";
import { requireUserOrRedirect } from "@/features/accounts";
import { acceptsEnquiries, listSavedListings } from "@/features/listings";
import { EmptyState } from "@/components/brand/empty-state";
import { ListingGrid } from "@/components/brand/listing-card";
import { DisplayHeading, Eyebrow } from "@/components/brand/typography";
import { SaveButton } from "../_components/save-button";

export const metadata: Metadata = { title: "Saved" };
export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const user = await requireUserOrRedirect();
  const listings = await listSavedListings(user.id);

  // A sold or closed item under "message the seller before someone else does" is the app
  // telling a student to chase something that is already gone.
  const available = listings.filter((listing) => acceptsEnquiries(listing.status));
  const gone = listings.filter((listing) => !acceptsEnquiries(listing.status));

  return (
    <div className="px-page py-[55px]">
      <Eyebrow>Watching</Eyebrow>
      <DisplayHeading as="h1" size="page" className="mt-3">
        Saved items
      </DisplayHeading>
      <p className="text-fg-muted mt-4 text-[14px]">
        Things you&apos;re keeping an eye on.{" "}
        {available.length > 0
          ? "Message the seller while they're still going."
          : "Nothing here is still available right now."}
      </p>

      <div className="mt-10">
        <ListingGrid
          listings={available}
          renderAction={(listing) => (
            <SaveButton listingId={listing.id} initialSaved={listing.isSaved} />
          )}
          empty={
            gone.length > 0 ? null : (
              <EmptyState
                icon="♡"
                title="Nothing saved yet"
                description="Tap Save on any listing and it will wait for you here."
                action={{ label: "Browse listings", href: "/" }}
              />
            )
          }
        />
      </div>

      {gone.length > 0 && (
        <section className="mt-12">
          <Eyebrow className="text-fg-muted">No longer available</Eyebrow>
          <h2 className="mt-1.5 text-[21px] font-bold tracking-tight">
            {gone.length === 1 ? "One of these is gone" : `${gone.length} of these are gone`}
          </h2>
          <p className="text-fg-muted mt-2 text-[13px]">
            The seller marked these sold or closed. Unsave them to clear the list — or leave
            them, in case the seller puts one back up.
          </p>

          {/* Dimmed as a whole: the status badge on each card is easy to miss when the
              card next to it looks identical. */}
          <div className="mt-6 opacity-60 grayscale-[35%] transition-opacity hover:opacity-100">
            <ListingGrid
              listings={gone}
              renderAction={(listing) => (
                <SaveButton listingId={listing.id} initialSaved={listing.isSaved} />
              )}
            />
          </div>
        </section>
      )}
    </div>
  );
}
