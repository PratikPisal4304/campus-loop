import type { Metadata } from "next";
import { requireUser } from "@/features/accounts";
import { listSavedListings } from "@/features/listings";
import { EmptyState } from "@/components/brand/empty-state";
import { ListingGrid } from "@/components/brand/listing-card";
import { DisplayHeading, Eyebrow } from "@/components/brand/typography";
import { SaveButton } from "../_components/save-button";

export const metadata: Metadata = { title: "Saved" };
export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const user = await requireUser();
  const listings = await listSavedListings(user.id);

  return (
    <div className="px-page py-[55px]">
      <Eyebrow>Watching</Eyebrow>
      <DisplayHeading as="h1" size="page" className="mt-3">
        Saved items
      </DisplayHeading>
      <p className="mt-4 text-[14px] text-fg-muted">
        Things you&apos;re keeping an eye on. Message the seller before someone else does.
      </p>

      <div className="mt-10">
        <ListingGrid
          listings={listings}
          renderAction={(listing) => (
            <SaveButton listingId={listing.id} initialSaved={listing.isSaved} />
          )}
          empty={
            <EmptyState
              icon="♡"
              title="Nothing saved yet"
              description="Tap Save on any listing and it will wait for you here."
              action={{ label: "Browse listings", href: "/" }}
            />
          }
        />
      </div>
    </div>
  );
}
