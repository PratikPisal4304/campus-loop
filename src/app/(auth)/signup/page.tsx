import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/features/accounts";
import { DisplayHeading, Eyebrow } from "@/components/brand/typography";
import { signUpAction } from "../_actions/auth";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your Campus Loop account and start trading with students on campus.",
};

export default async function SignupPage() {
  const user = await getSessionUser();
  if (user) redirect("/");

  return (
    <>
      <header className="mb-8">
        <Eyebrow tone="muted">Create your account</Eyebrow>
        <DisplayHeading as="h2" size="panel" className="mt-2 text-[28px]">
          Join Campus Loop
        </DisplayHeading>
        <p className="text-fg-muted mt-2 text-[13px]">
          Create your student marketplace account.
        </p>
      </header>

      <SignupForm action={signUpAction} />

      <p className="text-fg-muted mt-8 text-center text-[12px]">
        Already have an account?{" "}
        <Link href="/login" className="text-accent font-semibold hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
