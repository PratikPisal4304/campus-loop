import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProfile, requireUserOrRedirect, getEmailPreferences } from "@/features/accounts";
import { DisplayHeading, Eyebrow } from "@/components/brand/typography";
import { ActionForm } from "@/components/ui/action-form";
import { SettingsForm } from "./settings-form";
import { ChangePasswordForm } from "./change-password-form";
import { DeleteAccountForm } from "./delete-account-form";
import {
  changePasswordAction,
  deleteAccountAction,
  updateProfileAction,
  emailPreferencesAction,
} from "../_actions/account";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUserOrRedirect();
  const profile = await getProfile(user.id);
  const preferences = await getEmailPreferences(user.id);
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

      <section className="border-border mt-10 border-t pt-8">
        <h2 className="mb-4 text-2xl">Email updates</h2>
        <ActionForm action={emailPreferencesAction} label="Save email preferences">
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="messageEmails"
              defaultChecked={preferences.messageEmails}
            />
            New-message alerts
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" name="dealEmails" defaultChecked={preferences.dealEmails} />
            Handoff requests and updates
          </label>
        </ActionForm>
      </section>
      <section className="border-border mt-10 border-t pt-8">
        <Eyebrow className="text-fg-muted">Security</Eyebrow>
        <DisplayHeading as="h2" size="panel" className="mt-2">
          Change your password
        </DisplayHeading>
        <div className="mt-6">
          <ChangePasswordForm action={changePasswordAction} />
        </div>
      </section>

      <section className="border-border mt-10 border-t pt-8">
        <Eyebrow className="text-fg-muted">Danger zone</Eyebrow>
        <DisplayHeading as="h2" size="panel" className="mt-2">
          Delete your account
        </DisplayHeading>
        <p className="text-fg-muted mt-3 max-w-lg text-[13px] leading-relaxed">
          Your listings, saved items, conversations and reviews will be removed. Completed
          handoffs remain in the other student’s history with your name shown as Deleted
          student.
        </p>
        <DeleteAccountForm action={deleteAccountAction} />
      </section>
    </div>
  );
}
