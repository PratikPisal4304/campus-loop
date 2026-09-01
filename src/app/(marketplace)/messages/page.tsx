import type { Metadata } from "next";
import { requireUser } from "@/features/accounts";
import { listInbox } from "@/features/messaging";
import { DisplayHeading, Eyebrow } from "@/components/brand/typography";
import { ConversationList } from "./_components/conversation-list";
import { toConversationRows } from "./_components/inbox-data";

export const metadata: Metadata = {
  title: "Messages",
  description: "Coordinate purchases, rentals and handoffs with students on your campus.",
};

export default async function MessagesPage() {
  const user = await requireUser();
  const rows = await toConversationRows(await listInbox(user.id));

  return (
    <section className="px-page py-10 pb-[60px]">
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
        <ConversationList rows={rows} />

        <div className="hidden flex-col items-center justify-center px-8 text-center min-[800px]:flex">
          <span aria-hidden="true" className="text-[34px]">
            💬
          </span>
          <h2 className="mt-4 text-[17px] font-bold tracking-tight">Select a conversation</h2>
          <p className="text-fg-muted mt-2 max-w-xs text-[13px] leading-relaxed">
            Message a seller from Discover to start chatting.
          </p>
        </div>
      </div>
    </section>
  );
}
