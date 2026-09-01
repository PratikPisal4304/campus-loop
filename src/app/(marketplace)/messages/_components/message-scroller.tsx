"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * The scrolling half of the thread: a bounded box pinned to the newest message.
 *
 * The list is server-rendered — this only owns the scroll position, keyed off the message
 * count so a poll that brought nothing new does not yank a student out of the history
 * they were reading. Jumping is instant on first paint (arriving mid-scroll would look
 * broken) and smooth for messages that land while the thread is open.
 */
export function MessageScroller({
  messageCount,
  children,
}: {
  messageCount: number;
  children: ReactNode;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const settled = useRef(false);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    list.scrollTo({
      top: list.scrollHeight,
      behavior: settled.current ? "smooth" : "auto",
    });
    settled.current = true;
  }, [messageCount]);

  return (
    <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      {children}
    </div>
  );
}
