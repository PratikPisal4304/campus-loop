import type { Metadata } from "next";
import { DisplayHeading, Eyebrow } from "@/components/brand/typography";

export const metadata: Metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return (
    <>
      <Eyebrow>Legal</Eyebrow>
      <DisplayHeading as="h1" size="page">
        Terms of Use
      </DisplayHeading>
      <p className="text-fg-muted text-[12px]">Last updated 1 September 2026</p>

      <p>
        Campus Loop is a student marketplace built as a university project. By creating an
        account you agree to the terms below.
      </p>

      <h2>Who can use it</h2>
      <p>
        Accounts are for students of the campus this instance serves. You are responsible for
        everything done through your account, so keep your password to yourself.
      </p>

      <h2>What you may list</h2>
      <p>
        List things you actually own and are allowed to pass on: books, notes you wrote,
        calculators, electronics, lab and drafting equipment, project components, art supplies.
        Do not list anything illegal, hazardous, counterfeit, or anything your institution
        prohibits — including exam material you are not permitted to share.
      </p>

      <h2>Deals happen between students</h2>
      <p>
        <strong>
          Campus Loop does not process payments, hold funds, verify items, or mediate disputes.
        </strong>{" "}
        Every exchange is directly between the two students involved. Meet in a public place on
        campus, inspect the item before paying, and use your judgement.
      </p>

      <h2>Content you post</h2>
      <p>
        You keep ownership of your listings and messages. You give us permission to display them
        within the app so the marketplace can function. We may remove content that breaks these
        terms.
      </p>

      <h2>Ending your use</h2>
      <p>
        You can stop using Campus Loop at any time. We may suspend an account that is being used
        to scam, harass, or spam other students.
      </p>

      <h2>No warranty</h2>
      <p>
        This is a student project provided as-is, without guarantees of availability or
        accuracy.
      </p>
    </>
  );
}
