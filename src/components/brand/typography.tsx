import { cn } from "@/shared/ui/cn";

/**
 * The uppercase mono kicker that sits above nearly every heading in the prototype.
 * Orange for calls to action, teal for section labels.
 */
export function Eyebrow({
  tone = "teal",
  className,
  ...props
}: React.ComponentProps<"p"> & { tone?: "teal" | "orange" | "muted" | "inverse" }) {
  return (
    <p
      className={cn(
        "eyebrow",
        tone === "teal" && "text-teal",
        tone === "orange" && "text-accent",
        tone === "muted" && "text-fg-muted",
        tone === "inverse" && "text-sidebar-muted",
        className,
      )}
      {...props}
    />
  );
}

const displaySizes = {
  hero: "text-[clamp(46px,7vw,92px)] leading-[0.92] tracking-[-0.055em]",
  page: "text-[clamp(34px,5vw,54px)] leading-[1] tracking-[-0.045em]",
  section: "text-[clamp(22px,3vw,27px)] leading-[1.1] tracking-[-0.03em]",
  panel: "text-[21px] leading-[1.15] tracking-[-0.02em]",
} as const;

/**
 * Display headings. The negative tracking is the signature — it is what makes the type
 * read as editorial rather than as a default sans-serif app.
 */
export function DisplayHeading({
  as: Tag = "h2",
  size = "section",
  className,
  ...props
}: React.ComponentProps<"h2"> & {
  as?: "h1" | "h2" | "h3";
  size?: keyof typeof displaySizes;
}) {
  return <Tag className={cn("font-bold", displaySizes[size], className)} {...props} />;
}

/** Section header: kicker, heading, and an optional action pinned to the right. */
export function SectionHeading({
  eyebrow,
  title,
  action,
  tone = "teal",
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
  tone?: "teal" | "orange";
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pb-5">
      <div>
        <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
        <DisplayHeading className="mt-2">{title}</DisplayHeading>
      </div>
      {action}
    </div>
  );
}
