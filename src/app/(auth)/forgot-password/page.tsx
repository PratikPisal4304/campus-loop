import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { DisplayHeading, Eyebrow } from "@/components/brand/typography";

export const metadata: Metadata = { title: "Forgot password" };

/**
 * Campus Loop has no email service, so there is no self-service reset to offer. Saying so
 * plainly beats the prototype's approach, which was a link that fired
 * `alert("Password reset can be connected later.")` at the student.
 */
export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto w-full max-w-[420px]">
      <Eyebrow tone="orange">Account access</Eyebrow>
      <DisplayHeading as="h1" className="mt-3 text-[34px]">
        Forgot your password?
      </DisplayHeading>

      <p className="text-fg-muted mt-5 text-[13px] leading-[1.8]">
        Campus Loop doesn&apos;t send email yet, so there&apos;s no automatic reset link.
        Contact whoever administers this instance and they can reset it for you.
      </p>

      <p className="bg-panel-sunk text-fg-muted mt-4 rounded-sm p-4 text-[12px] leading-relaxed">
        In the meantime you can still browse everything on Campus Loop — you only need an
        account to save items, list something, or message a seller.
      </p>

      <ButtonLink href="/login" variant="accent" size="lg" className="mt-8 w-full">
        Back to log in
      </ButtonLink>

      <p className="text-fg-muted mt-6 text-center text-[12px]">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="text-fg font-semibold underline-offset-4 hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
