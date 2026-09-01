import { DisplayHeading, Eyebrow } from "@/components/brand/typography";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="px-page flex min-h-screen flex-col items-center justify-center text-center">
      <Eyebrow tone="orange">404 / Nothing here</Eyebrow>
      <DisplayHeading as="h1" size="hero" className="mt-4">
        This one already
        <br />
        <span className="text-accent">moved on.</span>
      </DisplayHeading>
      <p className="text-fg-muted mt-6 max-w-md text-[14px] leading-relaxed">
        The listing may have been sold, closed, or the link is wrong. Plenty else is still in
        circulation.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/" variant="accent" size="lg">
          Browse listings ↗
        </ButtonLink>
        <ButtonLink href="/loop" variant="outline" size="lg">
          My Loop
        </ButtonLink>
      </div>
    </main>
  );
}
