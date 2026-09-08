"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isEntityId } from "@/core/types/branded";
import { requireRole } from "@/features/accounts";
import { manageRecord } from "@/features/administration";
import { REPORT_OUTCOMES } from "@/features/moderation";

const resolveSchema = z.object({
  reportId: z.string().trim().refine(isEntityId, "Unknown report."),
  outcome: z.enum(REPORT_OUTCOMES),
});

/**
 * Close a report as acted-on or as nothing-to-do.
 *
 * `requireRole` is repeated here rather than trusted from the page: the proxy gates
 * navigation and the layout gates rendering, but neither runs for a direct POST to this
 * action, which is the only thing standing between a student and the moderation queue.
 */
export async function resolveReportAction(formData: FormData): Promise<void> {
  const actor = await requireRole("admin");

  const parsed = resolveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  await manageRecord(actor.id, { action: parsed.data.outcome === "reviewed" ? "review-report" : "dismiss-report", targetId: parsed.data.reportId, reason: "Resolved from moderation queue" });
  revalidatePath("/admin");
}
