"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  PASSWORD_MAX_LENGTH,
  changePassword,
  deleteAccount,
  requireUserOrRedirect,
  signOut,
  updateProfile,
} from "@/features/accounts";
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
  const user = await requireUserOrRedirect();

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

/**
 * No shape rules on `currentPassword` beyond a length bound: it only has to match what is
 * stored, and applying the signup regex to it would reject anyone who registered before a
 * rule tightened — locking them out of the one form that would fix it. The *new* password
 * is checked by the domain, which is where signup checks it too.
 */
const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Enter your current password.")
      .max(PASSWORD_MAX_LENGTH, "That password is too long."),
    newPassword: z.string().min(1, "Choose a new password."),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Those passwords don't match.",
  });

export async function changePasswordAction(
  _previous: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await requireUserOrRedirect();

  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const result = await changePassword(user.id, {
    currentPassword: parsed.data.currentPassword,
    newPassword: parsed.data.newPassword,
  });
  if (!result.ok) return { status: "error", message: result.error.message };

  // The session is a JWT that carries no password material, so it stays valid — there is
  // nothing here to invalidate, and signing them out of the tab they just proved
  // themselves in would read as a failure.
  return { status: "success", message: "Password changed." };
}

const deleteAccountSchema = z.object({
  password: z.string().min(1, "Enter your password to confirm."),
  confirmation: z.literal("DELETE", {
    error: "Type DELETE to confirm.",
  }),
});

/**
 * Delete the signed-in student's account.
 *
 * Two independent confirmations: the password, which proves it is really them, and the
 * typed word, which proves they meant this button rather than the one above it. Everything
 * they have — listings, saved items, threads, reviews, reports — cascades away with the
 * row, so there is no undo to offer afterwards.
 */
export async function deleteAccountAction(
  _previous: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await requireUserOrRedirect();

  const parsed = deleteAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const result = await deleteAccount(user.id, parsed.data.password);
  if (!result.ok) return { status: "error", message: result.error.message };

  // Outside any try/catch: signOut redirects by throwing, and a catch would swallow it.
  // The session cookie now points at a row that no longer exists, so clearing it is not
  // politeness — every guard downstream would otherwise resolve a null user.
  await signOut({ redirectTo: "/" });
  return { status: "success", message: "Account deleted." };
}
