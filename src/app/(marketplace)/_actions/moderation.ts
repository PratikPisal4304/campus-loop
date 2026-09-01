"use server";

import { z } from "zod";
import { isEntityId, toEntityId } from "@/core/types/branded";
import { requireUserOrRedirect } from "@/features/accounts";
import {
  MAX_REPORT_DETAILS_LENGTH,
  REPORT_REASONS,
  REPORT_TARGET_KINDS,
  fileReport,
  targetColumns,
  type ReportTarget,
} from "@/features/moderation";
import type { AccountActionState } from "./form-state";

const reportSchema = z.object({
  targetKind: z.enum(REPORT_TARGET_KINDS),
  targetId: z.string().trim().refine(isEntityId, "We couldn't tell what you're reporting."),
  reason: z.enum(REPORT_REASONS, { error: "Pick a reason." }),
  details: z
    .string()
    .trim()
    .max(MAX_REPORT_DETAILS_LENGTH, `Keep it under ${MAX_REPORT_DETAILS_LENGTH} characters.`)
    .optional(),
});

/**
 * File a report from anywhere in the marketplace — a listing, a profile, a thread.
 *
 * The reporter is taken from the session, never from the form: accepting it would let
 * anyone file reports in another student's name and get them ignored as a serial
 * complainer.
 */
export async function submitReportAction(
  _previous: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await requireUserOrRedirect();

  const parsed = reportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the form.",
    };
  }

  const target: ReportTarget = {
    kind: parsed.data.targetKind,
    id: toEntityId(parsed.data.targetId),
  };

  const result = await fileReport({
    reporterId: user.id,
    reason: parsed.data.reason,
    details: parsed.data.details ?? null,
    ...targetColumns(target),
  });

  if (!result.ok) return { status: "error", message: result.error.message };

  // Deliberately the same message whether this created a report or matched one already
  // filed. "You already reported this" is information about the queue, not about the
  // thing being reported, and it only ever makes a worried student worry more.
  return { status: "success", message: "Thanks — a moderator will take a look." };
}
