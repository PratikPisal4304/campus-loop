"use client";

import Link from "next/link";
import { useState } from "react";
import { closeListingAction, deleteListingAction } from "../_actions/listings";

export function ListingOwnerControls({
  listingId,
  slug,
  status,
}: {
  listingId: string;
  slug: string;
  status: "active" | "reserved" | "closed";
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/listings/${slug}/edit`}
        className="border-border hover:border-accent hover:text-accent flex h-9 flex-1 items-center justify-center rounded-sm border text-[12px] font-semibold transition-colors"
      >
        Edit
      </Link>

      {status === "active" && (
        <form action={closeListingAction}>
          <input type="hidden" name="listingId" value={listingId} />
          <button
            type="submit"
            className="border-border hover:border-fg h-9 rounded-sm border px-3 text-[12px] font-semibold transition-colors"
          >
            Close
          </button>
        </form>
      )}

      {confirming ? (
        <form action={deleteListingAction} className="flex items-center gap-1.5">
          <input type="hidden" name="listingId" value={listingId} />
          <button
            type="submit"
            className="border-danger bg-danger h-9 rounded-sm border px-3 text-[12px] font-semibold text-white"
          >
            Really delete
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-fg-muted hover:text-fg h-9 rounded-sm px-2 text-[12px]"
          >
            Cancel
          </button>
        </form>
      ) : (
        // Deleting is irreversible and also drops it from everyone's saved list, so it
        // takes two clicks rather than one.
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="border-danger text-danger hover:bg-danger h-9 rounded-sm border px-3 text-[12px] font-semibold transition-colors hover:text-white"
        >
          Delete
        </button>
      )}
    </div>
  );
}
