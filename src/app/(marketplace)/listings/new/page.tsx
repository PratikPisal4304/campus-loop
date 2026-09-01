import type { Metadata } from "next";
import { requireUser } from "@/features/accounts";
import { DisplayHeading, Eyebrow } from "@/components/brand/typography";
import { ListingForm } from "../../_components/listing-form";
import { createListingAction } from "../../_actions/listings";

export const metadata: Metadata = { title: "List an item" };

export default async function NewListingPage() {
  // The proxy already gates this route, but a layout-level guard is what makes the page
  // itself safe to reason about — and it gives us the user for free.
  await requireUser();

  return (
    <div className="px-page mx-auto grid max-w-[1100px] gap-14 py-[55px] lg:grid-cols-[1.5fr_0.7fr]">
      <div>
        <Eyebrow>Add to the circulation</Eyebrow>
        <DisplayHeading as="h1" size="page" className="mt-3">
          List something
          <br />
          <span className="text-accent">useful.</span>
        </DisplayHeading>
        <p className="text-fg-muted mt-5 max-w-lg text-[14px] leading-[1.8]">
          Sell, rent, exchange or give away educational items to students on campus.
        </p>

        <div className="mt-10">
          <ListingForm action={createListingAction} />
        </div>
      </div>

      <aside className="bg-checklist h-fit rounded-md p-7 lg:sticky lg:top-24">
        <Eyebrow className="text-fg-muted">Listing checklist</Eyebrow>
        <ol className="mt-4 flex list-decimal flex-col gap-2.5 pl-4 text-[13px] leading-relaxed">
          <li>Name the exact edition or model</li>
          <li>Price below the cost of buying new</li>
          <li>Name a public campus pickup spot</li>
          <li>Mention every included piece</li>
          <li>Use clear photos</li>
        </ol>
        <p className="text-fg-muted mt-6 rounded-sm bg-white/60 p-3.5 text-[11px] leading-relaxed">
          ⓘ Good listings get messages faster. Be clear about condition and price.
        </p>
      </aside>
    </div>
  );
}
