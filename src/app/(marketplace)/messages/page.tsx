import type { Metadata } from "next";
import { requireUserOrRedirect } from "@/features/accounts";
import { countUnread, listInbox } from "@/features/messaging";
import { DisplayHeading, Eyebrow } from "@/components/brand/typography";
import { ButtonLink } from "@/components/ui/button";
import { ConversationList } from "./_components/conversation-list";
import { UnreadTitle } from "./_components/unread-title";

export const metadata: Metadata = {
  title: "Messages",
  description: "Coordinate purchases, rentals and handoffs with students on your campus.",
};

export default async function MessagesPage(props: {
  searchParams: Promise<{ before?: string }>;
}) {
  const { before } = await props.searchParams;
  const user = await requireUserOrRedirect();

  // A malformed cursor means "start from the top" rather than a 500 — it only ever
  // arrives from a link this page wrote, so a bad one is a bookmark, not an attack.
  const cursor = before ? new Date(before) : undefined;
  const [inbox, unread] = await Promise.all([
    listInbox(user.id, cursor && !Number.isNaN(cursor.getTime()) ? { before: cursor } : {}),
    countUnread(user.id),
  ]);

  return (
    <section className="px-page py-10 pb-[60px]">
      <UnreadTitle count={unread} />
      <Eyebrow tone="teal">Direct line</Eyebrow>
      <DisplayHeading as="h1" size="page" className="mt-2">
        Messages
      </DisplayHeading>
      <p className="text-fg-muted mt-3 text-[13px]">
        Coordinate purchases, rentals and handoffs.
      </p>

      {/*
        Below 800px the inbox *is* the list — the second column is dropped rather than
        squeezed, and tapping a row navigates to the thread route, which is the mobile
        equivalent of the prototype hiding `.conversation-list` at that width.
      */}
      <div className="border-border bg-surface mt-[30px] grid min-h-[520px] grid-cols-1 overflow-hidden rounded-md border min-[800px]:grid-cols-[330px_1fr]">
        <ConversationList
          rows={inbox.rows}
          unreadTotal={unread}
          olderHref={
            inbox.nextCursor ? `/messages?before=${inbox.nextCursor.toISOString()}` : null
          }
        />

        <div className="hidden flex-col items-center justify-center px-8 text-center min-[800px]:flex">
          <span aria-hidden="true" className="text-[34px]">
            💬
          </span>
          <h2 className="mt-4 text-[17px] font-bold tracking-tight">Select a conversation</h2>
          <p className="text-fg-muted mt-2 max-w-xs text-[13px] leading-relaxed">
            Or find something you need on Discover — every listing has a message button.
          </p>
          <ButtonLink href="/" variant="accent" size="md" className="mt-6">
            Browse Discover ↗
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
