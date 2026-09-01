import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { toEntityId } from "@/core/types/branded";
import { getProfile, getSessionUser, initialsFor } from "@/features/accounts";
import { listSellerListings } from "@/features/listings";
import { STARS_MAX, listRateableDeals, listReviewsFor } from "@/features/reviews";
import { EmptyState } from "@/components/brand/empty-state";
import { ListingGrid } from "@/components/brand/listing-card";
import { DisplayHeading, Eyebrow } from "@/components/brand/typography";
import { Button } from "@/components/ui/button";
import { startConversationAction } from "../../_actions/messaging";
import { RateSeller } from "../../_components/rate-seller";
import { SaveButton } from "../../_components/save-button";
import { RelativeTime } from "../../messages/_components/relative-time";

/** How many reviews a profile shows before it becomes a wall of text. */
const REVIEWS_SHOWN = 10;

export async function generateMetadata(props: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await props.params;
  const profile = await getProfile(toEntityId(userId));
  return { title: profile ? profile.name : "Student" };
}

/** "★★★★☆" — the count is also written out for anyone not reading the glyphs. */
function Stars({ value }: { value: number }) {
  return (
    <span className="text-[13px] tracking-[0.08em]">
      <span aria-hidden="true" className="text-accent">
        {"★".repeat(value)}
        <span className="text-border">{"★".repeat(STARS_MAX - value)}</span>
      </span>
      <span className="sr-only">
        {value} out of {STARS_MAX} stars
      </span>
    </span>
  );
}

export default async function ProfilePage(props: { params: Promise<{ userId: string }> }) {
  const { userId } = await props.params;
  const viewer = await getSessionUser();
  const profile = await getProfile(toEntityId(userId));
  if (!profile) notFound();

  const subjectId = toEntityId(userId);
  const isSelf = viewer?.id === profile.id;

  const [listings, reviews, rateableDeals] = await Promise.all([
    listSellerListings(subjectId, viewer?.id ?? null),
    listReviewsFor(subjectId, REVIEWS_SHOWN),
    // Only a counterparty may rate, so the form is only fetched for someone who could be
    // one — and it is the same use case that will re-check on submit.
    viewer && !isSelf ? listRateableDeals(viewer.id, subjectId) : [],
  ]);

  const firstName = profile.name.split(" ")[0] ?? profile.name;
  // Messaging is anchored to a listing, so the newest active one is the way in. A student
  // with nothing listed still cannot be reached — see the note in the empty case below.
  const contactListing = listings.find((listing) => listing.status === "active");

  return (
    <div className="px-page py-[55px]">
      <section className="border-border bg-surface flex flex-wrap items-center gap-6 rounded-lg border p-8">
        <span className="bg-avatar flex h-20 w-20 items-center justify-center rounded-full text-[24px] font-bold">
          {profile.initials}
        </span>

        <div className="flex-1">
          <Eyebrow className="text-fg-muted">Student</Eyebrow>
          <DisplayHeading as="h1" className="mt-1.5 text-[32px]">
            {profile.name}
          </DisplayHeading>
          {profile.bio && (
            <p className="text-fg-muted mt-2 max-w-lg text-[13px] leading-relaxed">
              {profile.bio}
            </p>
          )}
          {profile.campusArea && (
            <p className="text-fg-muted mt-2 text-[11px]">
              📍 Usually around {profile.campusArea}
            </p>
          )}

          {viewer && !isSelf && contactListing && (
            <form action={startConversationAction} className="mt-4">
              <input type="hidden" name="listingId" value={contactListing.id} />
              <input type="hidden" name="slug" value={contactListing.slug} />
              <Button type="submit" variant="primary" size="md">
                Message {firstName}
              </Button>
              <span className="text-fg-muted mt-1.5 block text-[11px]">
                Opens a thread about “{contactListing.title}”.
              </span>
            </form>
          )}
          {viewer && !isSelf && !contactListing && (
            <p className="text-fg-muted mt-4 text-[11px]">
              {firstName} has nothing listed right now, so there is no item to start a
              conversation about.
            </p>
          )}
        </div>

        <div className="bg-panel-sunk rounded-md px-6 py-4 text-center">
          <p className="eyebrow text-fg-muted">Trust score</p>
          <p className="numeral mt-1.5 text-[28px] font-bold">{profile.trust.rating ?? "—"}</p>
          <p className="text-fg-muted mt-0.5 text-[11px]">
            {profile.trust.label}
            {profile.trust.ratingCount > 0 &&
              ` · ${profile.trust.ratingCount} ${profile.trust.ratingCount === 1 ? "rating" : "ratings"}`}
          </p>
        </div>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <Eyebrow>Ratings</Eyebrow>
          <DisplayHeading className="mt-2 mb-6">
            {reviews.length === 0 ? "No ratings yet" : `What students say about ${firstName}`}
          </DisplayHeading>

          {reviews.length === 0 ? (
            <EmptyState
              icon="⭐"
              title="Nothing rated yet"
              description={
                isSelf
                  ? "Once you've handed something over, the other student can rate the deal — and that is what fills in your trust score."
                  : `${firstName} hasn't been rated yet. Ratings only come from students who actually dealt with them.`
              }
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {reviews.map((review) => (
                <li key={review.id} className="border-border bg-surface rounded-lg border p-5">
                  <div className="flex items-center gap-3">
                    <span className="bg-avatar flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold">
                      {initialsFor(review.raterName)}
                    </span>
                    <div className="flex-1">
                      <Link
                        href={`/profile/${review.raterId}`}
                        className="text-fg text-[13px] font-semibold hover:underline"
                      >
                        {review.raterName}
                      </Link>
                      <RelativeTime
                        value={review.createdAt}
                        className="numeral text-fg-muted ml-2 text-[10px]"
                      />
                    </div>
                    <Stars value={review.stars} />
                  </div>
                  {review.comment && (
                    <p className="text-fg-muted mt-3 text-[12px] leading-relaxed">
                      {review.comment}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {rateableDeals.length > 0 && (
          <RateSeller subjectId={profile.id} subjectName={profile.name} deals={rateableDeals} />
        )}
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
