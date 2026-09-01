"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is the only handle that ties this screen to the server-side log entry.
    console.error("Unhandled error", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="px-page flex min-h-screen flex-col items-center justify-center text-center">
      <p className="eyebrow text-accent">Something broke</p>
      <h1 className="mt-4 text-[clamp(40px,6vw,68px)] leading-[0.95] font-bold tracking-[-0.05em]">
        That didn&apos;t work.
      </h1>
      <p className="text-fg-muted mt-6 max-w-md text-[14px] leading-relaxed">
        Something went wrong on our side. Trying again usually sorts it.
      </p>
      {error.digest && (
        <p className="numeral text-fg-muted mt-3 text-[11px]">Reference: {error.digest}</p>
      )}
      <Button onClick={reset} variant="accent" size="lg" className="mt-8">
        Try again
      </Button>
    </main>
  );
}
