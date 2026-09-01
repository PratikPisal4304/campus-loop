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
    <div className="px-page mx-auto max-w-[720px] py-[55px]">
      <Eyebrow>Your account</Eyebrow>
      <DisplayHeading as="h1" size="page" className="mt-3">
        Settings
      </DisplayHeading>
      <p className="text-fg-muted mt-4 text-[14px]">
        This is what other students see.{" "}
        <Link
          href={`/profile/${profile.id}`}
          className="text-fg font-semibold underline-offset-4 hover:underline"
        >
          View your profile
        </Link>
      </p>

      <div className="mt-10">
        <SettingsForm action={updateProfileAction} profile={profile} />
      </div>

      <section className="border-border mt-14 border-t pt-8">
        <Eyebrow className="text-fg-muted">Account</Eyebrow>
        <p className="text-fg-muted mt-2 text-[13px]">
          Signed in as <strong className="text-fg">{user.email}</strong>
        </p>
      </section>
    </div>
  );
}
