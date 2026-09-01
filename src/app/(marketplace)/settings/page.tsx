import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProfile, requireUser } from "@/features/accounts";
import { DisplayHeading, Eyebrow } from "@/components/brand/typography";
import { SettingsForm } from "./settings-form";
import { updateProfileAction } from "../_actions/account";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile) notFound();

  return (
    <div className="mx-auto max-w-[720px] px-page py-[55px]">
      <Eyebrow>Your account</Eyebrow>
      <DisplayHeading as="h1" size="page" className="mt-3">
        Settings
      </DisplayHeading>
      <p className="mt-4 text-[14px] text-fg-muted">
        This is what other students see.{" "}
        <Link
          href={`/profile/${profile.id}`}
          className="font-semibold text-fg underline-offset-4 hover:underline"
        >
          View your profile
        </Link>
      </p>

      <div className="mt-10">
        <SettingsForm action={updateProfileAction} profile={profile} />
      </div>

      <section className="mt-14 border-t border-border pt-8">
        <Eyebrow className="text-fg-muted">Account</Eyebrow>
        <p className="mt-2 text-[13px] text-fg-muted">
          Signed in as <strong className="text-fg">{user.email}</strong>
        </p>
      </section>
    </div>
  );
}
