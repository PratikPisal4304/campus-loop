"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { z } from "zod";
import { register, signIn } from "@/features/accounts";
import { publicEnv } from "@/shared/env.public";
import { safeInternalPath } from "@/shared/safe-path";

export interface AuthFormState {
  readonly status: "idle" | "error";
  readonly message: string;
  readonly fieldErrors?: Record<string, string>;
}

const signUpSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "That name looks too short.")
      .max(80, "That name is too long."),
    email: z.email("Enter a valid email address.").max(120, "That email is too long."),
    password: z
      .string()
      .min(8, "Passwords are at least 8 characters.")
      .max(128, "That password is too long.")
      .regex(/[a-zA-Z]/, "Include at least one letter and one number.")
      .regex(/\d/, "Include at least one letter and one number."),
    confirmPassword: z.string(),
    terms: z.literal("on", { error: "Accept the terms to create an account." }),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Those passwords don't match.",
  });

const signInSchema = z.object({
  email: z.email("Enter a valid email address.").max(120, "That email is too long."),
  // No shape rules on sign-in: an existing password only has to match, and echoing the
  // signup rules back here would tell an attacker what a valid password looks like.
  password: z.string().min(1, "Password is required.").max(128, "That password is too long."),
});

function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !fieldErrors[field]) fieldErrors[field] = issue.message;
  }
  return fieldErrors;
}

/** Only ever an internal path — anything else here would be an open redirect. */
function safeNext(value: FormDataEntryValue | null): string {
  return safeInternalPath(value, publicEnv.siteUrl);
}

export async function signUpAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    terms: formData.get("terms"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const { name, email, password } = parsed.data;
  const result = await register({ name, email, password });
  if (!result.ok) {
    return {
      status: "error",
      message: result.error.message,
      ...(result.error.details ? { fieldErrors: result.error.details } : {}),
    };
  }

  try {
    // The account exists now, so sign them straight in. The prototype bounced new users
    // back to the login form, which is a password prompt for credentials typed seconds ago.
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return { status: "error", message: "Account created — log in to continue." };
    }
    throw error;
  }

  // Outside the try: redirect() signals by throwing, and a catch would swallow it.
  redirect("/");
}

export async function signInAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
  } catch (error) {
    // One message for both halves: saying which one was wrong turns this form into a
    // "does this person have an account here" oracle.
    if (error instanceof AuthError) {
      return { status: "error", message: "That email and password don't match." };
    }
    throw error;
  }

  redirect(safeNext(formData.get("next")));
}
