import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="px-page flex min-h-screen flex-col items-center justify-center text-center">
      <p className="eyebrow text-accent">404 / Nothing here</p>
      <h1 className="mt-4 text-[clamp(46px,7vw,82px)] leading-[0.95] font-bold tracking-[-0.05em]">
        This one already
        <br />
        <span className="text-accent">moved on.</span>
      </h1>
      <p className="text-fg-muted mt-6 max-w-md text-[14px] leading-relaxed">
        The listing may have been sold, closed, or the link is wrong. Plenty else is still in
        circulation.
      </p>
      <div className="mt-8 flex gap-3">
        <ButtonLink href="/" variant="accent" size="lg">
          Browse listings ↗
        </ButtonLink>
        <Link
          href="/loop"
          className="border-border hover:border-accent flex h-[52px] items-center rounded-sm border px-6 text-[14px] font-semibold transition-colors"
        >
          My Loop
        </Link>
      </div>
    </main>
  );
}
