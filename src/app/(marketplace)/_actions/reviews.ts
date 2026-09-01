"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isEntityId, toEntityId } from "@/core/types/branded";
import { requireUserOrRedirect } from "@/features/accounts";
import { MAX_COMMENT_LENGTH, STARS_MAX, STARS_MIN, rateSeller } from "@/features/reviews";

const rateSchema = z.object({
  subjectId: z.string().trim().refine(isEntityId, "We couldn't find that student."),
  listingId: z.string().trim().refine(isEntityId, "We couldn't find that item."),
  stars: z.number().int().min(STARS_MIN).max(STARS_MAX),
  comment: z.string().trim().max(MAX_COMMENT_LENGTH).optional(),
});

/**
 * Leave a rating. Resolves to an outcome rather than throwing: "you already rated this
 * deal" and "you never dealt with them" are things a student can do by accident, and the
 * form has to be able to say which one happened.
 *
 * The shape is returned structurally instead of through an exported type alias, because a
 * `"use server"` module may only export async functions.
 */
export async function rateSellerAction(input: {
  subjectId: string;
  listingId: string;
  stars: number;
  comment?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  // The proxy gates navigation, not direct action invocations — so the guard lives here,
  // at the only place that actually protects the write.
  const user = await requireUserOrRedirect();

  const parsed = rateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "That rating couldn't be saved.",
    };
  }

  // No raterId from the client: it is the session, or it is nothing.
  const result = await rateSeller({
    raterId: user.id,
    subjectId: toEntityId(parsed.data.subjectId),
    listingId: toEntityId(parsed.data.listingId),
    stars: parsed.data.stars,
    ...(parsed.data.comment ? { comment: parsed.data.comment } : {}),
  });

  if (!result.ok) return { ok: false, message: result.error.message };

  // The subject's trust score is rendered on their profile, on every card of theirs, and
  // on the listing page — all of which are now stale.
  revalidatePath(`/profile/${parsed.data.subjectId}`);
  revalidatePath("/");
  revalidatePath("/listings/[slug]", "page");

  return { ok: true };
}
