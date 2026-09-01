"use client";

import { useState, useTransition } from "react";
import { toggleSavedAction } from "../_actions/listings";
import { toastError } from "@/shared/ui/toast";
import { cn } from "@/shared/ui/cn";

export function SaveButton({
  listingId,
  initialSaved,
}: {
  listingId: string;
  initialSaved: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-pressed={saved}
      disabled={isPending}
      onClick={() => {
        // Optimistic: the heart fills immediately and rolls back if the write fails.
        const next = !saved;
        setSaved(next);
        startTransition(async () => {
          try {
            const confirmed = await toggleSavedAction(listingId);
            setSaved(confirmed);
          } catch {
            setSaved(!next);
            toastError("Couldn't update your saved items.");
          }
        });
      }}
      className={cn(
        "flex h-9 w-full items-center justify-center gap-1.5 rounded-sm border text-[12px] font-semibold transition-all duration-200 disabled:opacity-60",
        saved
          ? "border-accent bg-accent/10 text-accent"
          : "border-border text-fg-muted hover:border-accent hover:text-accent",
      )}
    >
      <span aria-hidden="true">{saved ? "♥" : "♡"}</span>
      {saved ? "Saved" : "Save"}
    </button>
  );
}
