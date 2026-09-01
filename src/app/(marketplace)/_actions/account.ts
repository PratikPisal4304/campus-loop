"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser, signOut, updateProfile } from "@/features/accounts";
import type { AccountActionState } from "./form-state";

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80, "That name is too long."),
  bio: z.string().trim().max(280, "Keep your bio under 280 characters.").optional(),
  campusArea: z.string().trim().max(60, "That's too long for a campus area.").optional(),
});

export async function updateProfileAction(
  _previous: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  // The proxy gates navigation, but it does not run for a direct action call — so the
  // guard is repeated here, at the only place that actually protects the write.
  const user = await requireUser();

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const result = await updateProfile(user.id, {
    name: parsed.data.name,
    bio: parsed.data.bio ?? "",
    campusArea: parsed.data.campusArea ?? "",
  });
  if (!result.ok) return { status: "error", message: result.error.message };

  revalidatePath("/settings");
  revalidatePath(`/profile/${user.id}`);
  return { status: "success", message: "Profile updated." };
}
