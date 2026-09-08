"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useTransition } from "react";
import { LISTING_STATUS_LABELS, type ListingStatus } from "@/features/listings/client";
import { toastError, toastSuccess } from "@/shared/ui/toast";
import { cn } from "@/shared/ui/cn";
import { deleteListingAction, setListingStatusAction } from "../_actions/listings";

/**
 * What the seller can do next, given where the deal is.
 *
 * The domain owns which transitions are legal; this is the same set expressed as the verbs
 * a student recognises, in the order they are most likely to want them.
 */
const NEXT_MOVES: Record<
  ListingStatus,
  readonly { readonly status: ListingStatus; readonly label: string; readonly done: string }[]
> = {
  active: [
    { status: "reserved", label: "Reserve", done: "Held for your buyer." },
    { status: "closed", label: "Close", done: "Listing closed." },
  ],
  reserved: [
    { status: "active", label: "Un-reserve", done: "Back on the market." },
    { status: "closed", label: "Close", done: "Listing closed." },
  ],
  sold: [{ status: "active", label: "Reopen", done: "Back on the market." }],
  closed: [{ status: "active", label: "Reopen", done: "Back on the market." }],
};

const SIZE_CLASS = {
  sm: "h-9 text-[12px]",
  md: "h-11 text-[13px]",
} as const;

export function ListingOwnerControls({
  listingId,
  slug,
  status,
  size = "sm",
}: {
  listingId: string;
  slug: string;
  status: ListingStatus;
  /** `md` on the listing's own page, where these are the primary actions. */
  size?: keyof typeof SIZE_CLASS;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const height = SIZE_CLASS[size];

  const move = (next: ListingStatus, done: string) => {
    startTransition(async () => {
      try {
        const error = await setListingStatusAction(listingId, next);
        if (error) toastError(error);
        else toastSuccess(done);
      } catch {
        // A dropped connection must not look like a move that silently did nothing.
        toastError("Couldn't update this listing. Try again.");
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/listings/${slug}/edit`}
        className={cn(
          "border-border hover:border-accent hover:text-accent flex flex-1 items-center justify-center rounded-sm border px-3 font-semibold transition-colors",
          height,
        )}
      >
        Edit
      </Link>

      {(status === "active" || status === "reserved") && (
        <Link
          href="/messages"
          className="text-accent text-sm font-semibold underline underline-offset-4"
        >
          Arrange handoff in Messages →
        </Link>
      )}
      {NEXT_MOVES[status].map((next) => (
        <button
          key={next.status}
          type="button"
          disabled={isPending}
          onClick={() => move(next.status, next.done)}
          className={cn(
            "border-border hover:border-fg rounded-sm border px-3 font-semibold transition-colors disabled:opacity-55",
            height,
          )}
        >
          {next.label}
        </button>
      ))}

      {confirming ? (
        <form action={deleteListingAction} className="flex items-center gap-1.5">
          <input type="hidden" name="listingId" value={listingId} />
          <button
            type="submit"
            className={cn(
              "border-danger bg-danger rounded-sm border px-3 font-semibold text-white",
              height,
            )}
          >
            Really delete
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className={cn("text-fg-muted hover:text-fg rounded-sm px-2", height)}
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
          className={cn(
            "border-danger text-danger hover:bg-danger rounded-sm border px-3 font-semibold transition-colors hover:text-white",
            height,
          )}
        >
          Delete
        </button>
      )}
    </div>
  );
}

/** Status pill for a listing that is no longer live, in the same words as everywhere else. */
export function ListingStatusBadge({
  status,
  className,
  mode = "sell",
}: {
  status: ListingStatus;
  mode?: string;
  className?: string;
}) {
  if (status === "active") return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xs px-2 py-1 font-mono text-[10px] font-bold tracking-[0.1em] uppercase",
        status === "reserved" ? "bg-highlight text-ink" : "bg-dark text-white",
        className,
      )}
    >
      {status === "sold"
        ? ({ sell: "Sold", rent: "Rented", free: "Given away", exchange: "Exchanged" }[mode] ??
          "Completed")
        : LISTING_STATUS_LABELS[status]}
    </span>
  );
}

const DONE_MESSAGES: Record<string, string> = {
  published: "Your listing is live.",
  updated: "Listing updated.",
  deleted: "Listing deleted.",
};

function DoneToast() {
  const params = useSearchParams();
  const router = useRouter();
  const done = params.get("done");

  useEffect(() => {
    if (!done) return;
    const message = DONE_MESSAGES[done];
    if (message) toastSuccess(message);
    // Strip the marker so a reload or a back-navigation does not toast a second time.
    const next = new URLSearchParams(params.toString());
    next.delete("done");
    const search = next.toString();
    router.replace(search ? `?${search}` : window.location.pathname, { scroll: false });
  }, [done, params, router]);

  return null;
}

/**
 * Confirms an action that ended in a redirect (publish, update, delete).
 *
 * It lives here rather than in a page because a server action cannot raise a toast; the
 * action hands the outcome over as `?done=`, and this reads it on the client. The Suspense
 * boundary is required: `useSearchParams` otherwise opts the whole page out of static
 * rendering.
 */
export function ListingActionToast() {
  return (
    <Suspense fallback={null}>
      <DoneToast />
    </Suspense>
  );
}
