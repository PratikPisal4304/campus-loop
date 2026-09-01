"use client";

import { useEffect } from "react";

const BADGE_PATTERN = /^\(\d+\)\s*/;

/**
 * Mirrors the unread count into the document title, the way every messaging product does.
 *
 * Written imperatively rather than through `generateMetadata` because the count changes
 * on a poll, not on a navigation — and the badge is stripped before it is re-applied so
 * repeated renders cannot stack up as "(1) (2) Messages".
 */
export function UnreadTitle({ count }: { count: number }) {
  useEffect(() => {
    const base = document.title.replace(BADGE_PATTERN, "");
    document.title = count > 0 ? `(${count}) ${base}` : base;
  }, [count]);

  return null;
}
