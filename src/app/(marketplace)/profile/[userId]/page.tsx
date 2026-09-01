import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { toEntityId } from "@/core/types/branded";
import { getProfile, getSessionUser } from "@/features/accounts";
import { listSellerListings } from "@/features/listings";
import { EmptyState } from "@/components/brand/empty-state";
import { ListingGrid } from "@/components/brand/listing-card";
import { DisplayHeading, Eyebrow } from "@/components/brand/typography";
import { SaveButton } from "../../_components/save-button";

export async function generateMetadata(props: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await props.params;
  const profile = await getProfile(toEntityId(userId));
  return { title: profile ? profile.name : "Student" };
}

export default async function ProfilePage(props: { params: Promise<{ userId: string }> }) {
  const { userId } = await props.params;
  const viewer = await getSessionUser();
  const profile = await getProfile(toEntityId(userId));
  if (!profile) notFound();

  const listings = await listSellerListings(toEntityId(userId), viewer?.id ?? null);
  const isSelf = viewer?.id === profile.id;

  return (
    <div className="px-page py-[55px]">
      <section className="flex flex-wrap items-center gap-6 rounded-lg border border-border bg-surface p-8">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-avatar text-[24px] font-bold">
          {profile.initials}
        </span>

        <div className="flex-1">
          <Eyebrow className="text-fg-muted">Student</Eyebrow>
          <DisplayHeading as="h1" className="mt-1.5 text-[32px]">
            {profile.name}
          </DisplayHeading>
          {profile.bio && (
            <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-fg-muted">{profile.bio}</p>
          )}
          {profile.campusArea && (
            <p className="mt-2 text-[11px] text-fg-muted">📍 Usually around {profile.campusArea}</p>
          )}
        </div>

        <div className="rounded-md bg-panel-sunk px-6 py-4 text-center">
          <p className="eyebrow text-fg-muted">Trust score</p>
          <p className="numeral mt-1.5 text-[28px] font-bold">
            {profile.trust.rating ?? "—"}
          </p>
          <p className="mt-0.5 text-[11px] text-fg-muted">
            {profile.trust.label}
            {profile.trust.ratingCount > 0 && ` · ${profile.trust.ratingCount} ratings`}
          </p>
        </div>
      </section>

      <section className="mt-10">
        <Eyebrow>{isSelf ? "Your listings" : "Listed by this student"}</Eyebrow>
        <DisplayHeading className="mt-2 mb-6">
          {listings.length} {listings.length === 1 ? "item" : "items"} in circulation
        </DisplayHeading>

        <ListingGrid
          listings={listings}
          renderAction={(listing) =>
            viewer && !isSelf ? (
              <SaveButton listingId={listing.id} initialSaved={listing.isSaved} />
            ) : null
          }
          empty={
            <EmptyState
              icon="📦"
              title={isSelf ? "You have nothing listed" : "Nothing listed right now"}
              description={
                isSelf
                  ? "List something and it will show up here for other students."
                  : "This student has no active listings at the moment."
              }
              {...(isSelf ? { action: { label: "List an item", href: "/listings/new" } } : {})}
            />
          }
        />
      </section>
    </div>
  );
}
