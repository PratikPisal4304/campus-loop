import Link from "next/link";
import { ActionForm } from "@/components/ui/action-form";
import { requestResetAction } from "../_actions/recovery";
export const metadata = { title: "Forgot password" };
export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md">
      <p className="eyebrow text-accent">Back in the loop</p>
      <h1 className="mt-3 text-4xl">Forgot your password?</h1>
      <p className="text-fg-muted my-5">
        Enter your account email. We’ll send a link to choose a new password.
      </p>
      <ActionForm action={requestResetAction} label="Send reset link">
        <label className="block text-sm font-semibold">
          Email address
          <input
            className="form-input mt-2"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={120}
            required
          />
        </label>
      </ActionForm>
      <Link href="/login" className="text-accent mt-6 inline-block text-sm underline">
        Back to log in
      </Link>
    </div>
  );
}
