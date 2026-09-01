"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isEntityId, toEntityId } from "@/core/types/branded";
import { requireRole } from "@/features/accounts";
import { REPORT_OUTCOMES, resolveReport } from "@/features/moderation";

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
  await requireRole("admin");

  const parsed = resolveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  await resolveReport(toEntityId(parsed.data.reportId), parsed.data.outcome);
  revalidatePath("/admin");
}
