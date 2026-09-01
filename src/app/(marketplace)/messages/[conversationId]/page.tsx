import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { toEntityId } from "@/core/types/branded";
import { requireUser } from "@/features/accounts";
import {
  MAX_MESSAGE_LENGTH,
  countUnread,
  getConversationHeader,
  listInbox,
  openConversation,
} from "@/features/messaging";
import { DisplayHeading, Eyebrow } from "@/components/brand/typography";
import { cn } from "@/shared/ui/cn";
import { ConversationList } from "../_components/conversation-list";
import { MessageComposer } from "../_components/message-composer";
import { MessageScroller } from "../_components/message-scroller";
import { RelativeTime } from "../_components/relative-time";
import { ThreadRefresher } from "../_components/thread-refresher";
import { UnreadTitle } from "../_components/unread-title";

/**
 * Titled with the person you are talking to. It read "Conversation" on every thread,
 * which made a row of open tabs indistinguishable.
 *
 * Uses the header-only read: `openConversation` marks the thread read as a side effect,
 * and metadata generation must not be what clears somebody's unread badge.
 */
export async function generateMetadata(props: {
  params: Promise<{ conversationId: string }>;
}): Promise<Metadata> {
  const { conversationId } = await props.params;
  const user = await requireUser();
  const header = await getConversationHeader({
    conversationId: toEntityId(conversationId),
    userId: user.id,
  });

  if (!header.ok) return { title: "Conversation" };
  return {
    title: `${header.value.otherName} · ${header.value.listingTitle}`,
    description: `Your conversation about ${header.value.listingTitle}.`,
  };
}

export default async function ConversationPage(props: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await props.params;
  const user = await requireUser();

  const opened = await openConversation({
    conversationId: toEntityId(conversationId),
    userId: user.id,
  });
  // NOT_FOUND and FORBIDDEN both become a 404: telling a stranger that a thread exists
  // but is not theirs leaks more than it helps.
  if (!opened.ok) notFound();

  // Both run after the open, so the badge already reflects this thread being read.
  const [inbox, unread] = await Promise.all([listInbox(user.id), countUnread(user.id)]);
  const active = opened.value.conversation;
  const messages = opened.value.messages;

  return (
    <section className="px-page py-10 pb-[60px]">
      {/* The thread polls; the title badge follows whatever that poll brings back. */}
      <ThreadRefresher />
      <UnreadTitle count={unread} />

      <Eyebrow tone="teal">Direct line</Eyebrow>
      <DisplayHeading as="h1" size="page" className="mt-2">
        Messages
      </DisplayHeading>
      <Link
        href="/messages"
        className="text-fg-muted hover:text-accent mt-3 inline-block text-[12px] font-semibold min-[800px]:hidden"
      >
        ← All conversations
      </Link>

      <div className="border-border bg-surface mt-[30px] grid grid-cols-1 overflow-hidden rounded-md border min-[800px]:grid-cols-[330px_1fr]">
        {/* The list stays mounted on desktop; below 800px the thread takes the full width. */}
        <ConversationList
          rows={inbox.rows}
          activeId={active.id}
          unreadTotal={unread}
          olderHref={
            inbox.nextCursor ? `/messages?before=${inbox.nextCursor.toISOString()}` : null
          }
          className="hidden min-[800px]:flex"
        />

        {/*
          A bounded height, not just a minimum: the message list is the only part that
          scrolls, so the composer stays on screen no matter how long the thread gets.
          It used to grow with the history and push the composer below the fold.
        */}
        <div className="flex h-[min(640px,calc(100svh-180px))] min-h-[480px] flex-col">
          <header className="border-border flex shrink-0 items-center gap-3 border-b px-[22px] py-[18px]">
            <span
              aria-hidden="true"
              className="bg-avatar flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
            >
              {active.initials}
            </span>
            <div className="min-w-0">
              {active.otherParticipantId ? (
                <Link
                  href={`/profile/${active.otherParticipantId}`}
                  className="hover:text-accent block truncate text-[13px] font-bold"
                >
                  {active.otherName}
                </Link>
              ) : (
                <strong className="block truncate text-[13px]">{active.otherName}</strong>
              )}
              {active.listingSlug ? (
                <Link
                  href={`/listings/${active.listingSlug}`}
                  className="text-fg-muted hover:text-accent mt-[3px] block truncate text-[11px]"
                >
                  {active.listingTitle}
                </Link>
              ) : (
                <span className="text-fg-muted mt-[3px] block truncate text-[11px]">
                  {active.listingTitle}
                </span>
              )}
            </div>
          </header>

          <p className="bg-checklist/70 text-fg-muted m-5 shrink-0 rounded-sm p-2.5 text-[11px] leading-relaxed">
            <strong className="font-bold">Stay safe:</strong> meet in a public spot on campus,
            check the item before you pay, and keep the conversation here.
          </p>

          {messages.length === 0 ? (
            <p className="text-fg-muted flex-1 px-5 py-8 text-center text-[12px]">
              No messages yet — say hello and ask about the item.
            </p>
          ) : (
            <MessageScroller messageCount={messages.length}>
              <ol className="flex flex-col py-2">
                {messages.map((message) => (
                  <li
                    key={message.id}
                    className={cn(
                      "mx-5 my-2 flex max-w-[60%] flex-col gap-1 rounded-lg px-[15px] py-3",
                      // `mine` is decided server-side, so the bubble never compares ids here.
                      message.mine
                        ? "bg-dark self-end text-white"
                        : "bg-panel-sunk text-fg self-start",
                    )}
                  >
                    <span className="text-[11px] leading-[1.5] whitespace-pre-wrap">
                      {message.body}
                    </span>
                    <RelativeTime
                      value={message.createdAt}
                      className={cn(
                        "numeral text-[11px]",
                        message.mine ? "text-white/55" : "text-fg-muted",
                      )}
                    />
                  </li>
                ))}
              </ol>
            </MessageScroller>
          )}

          <MessageComposer
            conversationId={active.id}
            maxLength={MAX_MESSAGE_LENGTH}
            className="shrink-0"
          />
        </div>
      </div>
    </section>
  );
}
