"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { MAX_COMMENT_LENGTH, STAR_CHOICES, type RateableDeal } from "@/features/reviews/client";
import { cn } from "@/shared/ui/cn";
import { toastError, toastSuccess } from "@/shared/ui/toast";
import { rateSellerAction } from "../_actions/reviews";

const STAR_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Not great",
  3: "Fine",
  4: "Good",
  5: "Excellent",
};

/**
 * Rate a student you've dealt with.
 *
 * Only rendered when the server has already established that the viewer has at least one
 * unrated deal with this person, so the form never asks for something the use case will
 * refuse. `deals` is the picker's options — a rating is always *about an item*, which is
 * what stops it from being an anonymous opinion about a person.
 */
export function RateSeller({
  subjectId,
  subjectName,
  deals,
}: {
  subjectId: string;
  subjectName: string;
  deals: readonly RateableDeal[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [stars, setStars] = useState<number | null>(null);
  const [listingId, setListingId] = useState(deals[0]?.listingId ?? "");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  // `router.refresh()` after a rating re-renders this with the rated deal removed, but the
  // selection is state and would stay pointing at it — the `<select>` would show the first
  // remaining option while submitting the one just rated. Derive it instead of trusting it.
  const selectedListingId = deals.some((deal) => deal.listingId === listingId)
    ? listingId
    : (deals[0]?.listingId ?? "");

  const firstName = subjectName.split(" ")[0] ?? subjectName;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (stars === null) {
      setError("Pick a star rating first.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await rateSellerAction({
        subjectId,
        listingId: selectedListingId,
        stars,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });

      if (!result.ok) {
        setError(result.message);
        toastError(result.message);
        return;
      }

      setStars(null);
      setComment("");
      toastSuccess(`Thanks — your rating for ${firstName} is in.`);
      // The profile above this form is a server component; refreshing is what makes the
      // new average and the new review appear without a full navigation.
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="border-border bg-surface flex flex-col gap-5 rounded-lg border p-6"
    >
      <div>
        <p className="text-fg text-[14px] font-bold">Rate {firstName}</p>
        <p className="text-fg-muted mt-1 text-[12px]">
          You dealt with {firstName} — how did it go? One rating per item, and it shows up on
          their profile with your name.
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-fg text-[12px] font-semibold">Your rating</legend>
        {/* No `role="radiogroup"`: the fieldset/legend plus same-named radios already are
            one, and adding the role would announce the group twice. */}
        <div className="mt-1 flex items-center gap-1.5">
          {STAR_CHOICES.map((value) => (
            <label key={value} className="cursor-pointer">
              {/* A real radio, kept for the keyboard and for screen readers; the star is
                  only the paint on top of it. */}
              <input
                type="radio"
                name="stars"
                value={value}
                checked={stars === value}
                onChange={() => setStars(value)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  "peer-focus-visible:ring-accent/40 block text-[26px] leading-none transition-colors duration-200 peer-focus-visible:rounded-xs peer-focus-visible:ring-4",
                  stars !== null && value <= stars ? "text-accent" : "text-border",
                )}
              >
                ★
              </span>
              <span className="sr-only">
                {value} {value === 1 ? "star" : "stars"} — {STAR_LABELS[value]}
              </span>
            </label>
          ))}
          {stars !== null && (
            <span className="text-fg-muted ml-2 text-[12px]">{STAR_LABELS[stars]}</span>
          )}
        </div>
      </fieldset>

      {deals.length > 1 ? (
        <Field label="Which item?" name="listingId">
          <Select
            value={selectedListingId}
            onChange={(event) => setListingId(event.target.value)}
          >
            {deals.map((deal) => (
              <option key={deal.listingId} value={deal.listingId}>
                {deal.listingTitle}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <p className="text-fg-muted text-[12px]">
          About <span className="text-fg font-semibold">{deals[0]?.listingTitle}</span>
        </p>
      )}

      <Field
        label="Anything worth saying?"
        name="comment"
        required={false}
        hint={`${MAX_COMMENT_LENGTH - comment.trim().length} characters left`}
      >
        <Textarea
          value={comment}
          maxLength={MAX_COMMENT_LENGTH}
          placeholder="Turned up on time, item was as described."
          onChange={(event) => setComment(event.target.value)}
        />
      </Field>

      {error && (
        <p role="alert" className="text-danger text-[12px] font-medium">
          {error}
        </p>
      )}

      <Button
        type="submit"
        variant="accent"
        size="md"
        disabled={isPending || !selectedListingId}
      >
        {isPending ? "Saving…" : "Leave rating"}
      </Button>
    </form>
  );
}
