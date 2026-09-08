import "server-only";
import { z } from "zod";
import { fail } from "@/core/domain/result";
import { adminMutation } from "./infrastructure/admin.repository";
export { adminOverview, adminRecords } from "./infrastructure/admin.repository";
export { ADMIN_SECTIONS, isAdminSection, csvCell, type AdminSection } from "./domain/admin";
export async function manageRecord(
  actorId: string,
  input: { action: string; targetId: string; reason: string },
) {
  const parsed = z
    .object({
      action: z.string().min(1).max(40),
      targetId: z.string().min(1).max(100),
      reason: z.string().trim().min(3, "Add a short reason for this change.").max(500),
    })
    .safeParse(input);
  if (!parsed.success)
    return fail("INVALID_INPUT", parsed.error.issues[0]?.message ?? "Check the form.");
  return adminMutation(actorId, parsed.data.action, parsed.data.targetId, parsed.data.reason);
}
