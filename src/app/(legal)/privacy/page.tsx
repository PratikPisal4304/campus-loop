import type { Metadata } from "next";
import { DisplayHeading, Eyebrow } from "@/components/brand/typography";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <>
      <Eyebrow>Legal</Eyebrow>
      <DisplayHeading as="h1" size="page">
        Privacy Policy
      </DisplayHeading>
      <p className="text-fg-muted text-[12px]">Last updated 8 September 2026</p>

      <p>
        This explains what Campus Loop stores and why. It is a university project, so the honest
        summary is: as little as the marketplace needs to work.
      </p>

      <h2>What we store</h2>
      <p>
        Your name, email address and a <strong>hashed</strong> password — the plain password is
        never written down anywhere, and a hash cannot be reversed back into it. Beyond that:
        the listings you publish, the items you save, the messages you send, and an optional bio
        and campus area if you fill them in. We also store handoff records, notification
        preferences, email submission records, and administrator actions.
      </p>

      <h2>Who can see what</h2>
      <p>
        Your name, bio, campus area and active listings are visible to visitors.
        <strong> Your email address is not shown on your profile.</strong> Messages are visible
        only to the two students in that conversation. Administrators can view and export
        account, listing, and handoff records to manage the marketplace.
      </p>

      <h2>Photos</h2>
      <p>
        Listing photos are uploaded straight from your browser to our image host and are served
        from there. They are public to anyone who can see the listing.
      </p>

      <h2>Email</h2>
      <p>
        Resend processes your email address and transactional email content to send
        password-reset links, message alerts, and handoff updates. Message alerts do not include
        your conversation text. You can turn off message and handoff emails in Settings.
      </p>
      <h2>Cookies</h2>
      <p>
        One session cookie keeps you signed in. There is no advertising, no analytics, and no
        third-party tracking.
      </p>

      <h2>Deleting things</h2>
      <p>
        Deleting a listing removes it and drops it from everyone&apos;s saved items. Handoff
        records retain the item title, agreed price, and outcome. You can delete your account in
        Settings after confirming your password. Your account, listings, conversations, saved
        items, and reviews are removed. Handoff records remain for the other student with your
        identity shown as Deleted student.
      </p>
    </>
  );
}
