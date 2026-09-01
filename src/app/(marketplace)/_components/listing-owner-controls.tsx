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
        className="flex h-9 flex-1 items-center justify-center rounded-sm border border-border text-[12px] font-semibold transition-colors hover:border-accent hover:text-accent"
      >
        Edit
      </Link>

      {status === "active" && (
        <form action={closeListingAction}>
          <input type="hidden" name="listingId" value={listingId} />
          <button
            type="submit"
            className="h-9 rounded-sm border border-border px-3 text-[12px] font-semibold transition-colors hover:border-fg"
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
            className="h-9 rounded-sm border border-danger bg-danger px-3 text-[12px] font-semibold text-white"
          >
            Really delete
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="h-9 rounded-sm px-2 text-[12px] text-fg-muted hover:text-fg"
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
          className="h-9 rounded-sm border border-danger px-3 text-[12px] font-semibold text-danger transition-colors hover:bg-danger hover:text-white"
        >
          Delete
        </button>
      )}
    </div>
  );
}
