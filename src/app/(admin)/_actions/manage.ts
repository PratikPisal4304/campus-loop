"use server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/features/accounts";
import { manageRecord } from "@/features/administration";
import { dispatchEmails } from "@/shared/email/outbox";
export async function manageRecordAction(data: FormData) {
  const actor = await requireRole("admin");
  const result = await manageRecord(actor.id, {
    action: String(data.get("action") ?? ""),
    targetId: String(data.get("targetId") ?? ""),
    reason: String(data.get("reason") ?? ""),
  });
  if (!result.ok) return { error: result.error.message };
  revalidatePath("/", "layout");
  after(dispatchEmails);
  return { success: "Record updated. The change has been logged." };
}
