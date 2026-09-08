import Link from "next/link";
import { ResetForm } from "./reset-form";
import { resetPasswordAction } from "../_actions/recovery";
export const metadata = {
  title: "Reset password",
  robots: { index: false },
  referrer: "no-referrer" as const,
};
export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-md">
      <p className="eyebrow text-accent">A fresh start</p>
      <h1 className="my-4 text-4xl">Choose a new password</h1>
      <ResetForm action={resetPasswordAction} />
      <Link href="/login" className="text-accent mt-6 inline-block text-sm underline">
        Back to log in
      </Link>
    </div>
  );
}
