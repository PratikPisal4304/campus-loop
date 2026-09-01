"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** How often an open, visible thread asks the server whether anything new arrived. */
const POLL_INTERVAL_MS = 12_000;

/**
 * Keeps the open thread fresh.
 *
 * `router.refresh()` on a timer rather than a socket: the server component already knows
 * how to render a thread, so re-running it is the whole feature, and a marketplace with a
 * handful of concurrent conversations does not need a persistent connection per tab.
 *
 * Polling stops whenever the tab is hidden — a backgrounded tab that keeps refreshing is
 * a battery and database cost nobody is looking at — and resumes with an immediate
 * refresh so a student returning to the tab never reads a stale thread.
 */
export function ThreadRefresher() {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;

    const stop = () => {
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
    };

    const start = () => {
      stop();
      timer = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        stop();
        return;
      }
      router.refresh();
      start();
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router]);

  return null;
}
