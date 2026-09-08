"use server";
import { headers } from "next/headers";
import { requestPasswordReset, resetPassword } from "@/features/accounts";
async function requestIp() {
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}
export async function requestResetAction(data: FormData) {
  const result = await requestPasswordReset(String(data.get("email") ?? ""), await requestIp());
  return result.ok
    ? {
        success:
          "If that account is available, we'll email a reset link. Check your inbox and spam folder.",
      }
    : { error: result.error.message };
}
export async function resetPasswordAction(data: FormData) {
  const password = String(data.get("password") ?? "");
  if (password !== data.get("confirmation")) return { error: "Those passwords don't match." };
  const result = await resetPassword(
    String(data.get("token") ?? ""),
    password,
    await requestIp(),
  );
  return result.ok
    ? { success: "Password changed. You can now log in with your new password." }
    : { error: result.error.message };
}
