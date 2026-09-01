"use client";

import { useEffect } from "react";
import { DisplayHeading, Eyebrow } from "@/components/brand/typography";
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
      <Eyebrow tone="orange">Something broke</Eyebrow>
      <DisplayHeading as="h1" size="page" className="mt-4">
        That didn&apos;t work.
      </DisplayHeading>
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
