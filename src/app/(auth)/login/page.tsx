import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/features/accounts";
import { DisplayHeading, Eyebrow } from "@/components/brand/typography";
import { signInAction } from "../_actions/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to Campus Loop to buy, rent, sell and exchange with students near you.",
};

export default async function LoginPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await props.searchParams;
  const raw = params.next;
  // Validated here as well as in the action: this value is echoed into the form.
  const next = typeof raw === "string" && /^\/(?!\/)/.test(raw) ? raw : "/";

  const user = await getSessionUser();
  if (user) redirect(next);

  return (
    <>
      <header className="mb-8">
        <Eyebrow tone="muted">Account access</Eyebrow>
        <DisplayHeading as="h2" size="panel" className="mt-2 text-[28px]">
          Log in
        </DisplayHeading>
        <p className="text-fg-muted mt-2 text-[13px]">
          Enter your details to continue to Campus Loop.
        </p>
      </header>

      <LoginForm action={signInAction} next={next} />

      <p className="text-fg-muted mt-8 text-center text-[12px]">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-accent font-semibold hover:underline">
          Create one
        </Link>
      </p>
    </>
  );
}
