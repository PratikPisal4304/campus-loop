import Link from "next/link";
import { cn } from "@/shared/ui/cn";
import { EmptyState } from "@/components/brand/empty-state";
import type { ConversationRow } from "./inbox-data";
import { RelativeTime } from "./relative-time";

/**
 * The prototype's `.conversation-list` column, shared by the inbox and the thread route
 * so the two pages cannot drift apart.
 */
export function ConversationList({
  rows,
  activeId,
  className,
}: {
  rows: readonly ConversationRow[];
  activeId?: string;
  className?: string;
}) {
  const unreadTotal = rows.reduce((total, row) => total + row.unreadCount, 0);

  return (
    <div
      className={cn("min-[800px]:border-border flex flex-col min-[800px]:border-r", className)}
    >
      <p className="eyebrow border-border flex items-center justify-between border-b px-5 py-5">
        <span>Conversations</span>
        {unreadTotal > 0 && (
          <span className="text-accent">
            {unreadTotal} unread<span className="sr-only"> messages</span>
          </span>
        )}
      </p>

      {rows.length === 0 ? (
        <div className="p-5">
          <EmptyState
            icon="💬"
            title="No conversations yet"
            description="Message a seller from Discover and the thread will show up here."
            action={{ label: "Browse Discover", href: "/" }}
          />
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/messages/${row.id}`}
                aria-current={row.id === activeId ? "page" : undefined}
                className={cn(
                  "border-border/60 hover:bg-panel-sunk/60 flex gap-3 border-b border-l-[3px] border-l-transparent p-[17px] transition-colors duration-200",
                  row.id === activeId && "border-l-accent bg-panel-sunk",
                )}
              >
                <span
                  aria-hidden="true"
                  className="bg-avatar flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                >
                  {row.initials}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <strong className="truncate text-[12px] font-bold">{row.otherName}</strong>
                    <RelativeTime
                      value={row.lastMessageAt}
                      className="numeral text-fg-muted ml-auto shrink-0 text-[9px]"
                    />
                  </span>
                  <span className="text-teal mt-[3px] block truncate text-[9px]">
                    {row.listingTitle}
                  </span>
                  <span className="mt-[7px] flex items-center gap-2">
                    <span className="text-fg-muted line-clamp-2 flex-1 text-[9px] leading-relaxed">
                      {row.preview || "No messages yet."}
                    </span>
                    {row.unreadCount > 0 && (
                      <span className="bg-accent flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1.5 font-mono text-[9px] font-bold text-white">
                        {row.unreadCount > 9 ? "9+" : row.unreadCount}
                        <span className="sr-only"> unread messages</span>
                      </span>
                    )}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
