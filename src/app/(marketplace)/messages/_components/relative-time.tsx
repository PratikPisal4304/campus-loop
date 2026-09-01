const DIVISIONS = [
  { amount: 60, unit: "second" },
  { amount: 60, unit: "minute" },
  { amount: 24, unit: "hour" },
  { amount: 7, unit: "day" },
  { amount: 4.34524, unit: "week" },
  { amount: 12, unit: "month" },
  { amount: Number.POSITIVE_INFINITY, unit: "year" },
] as const;

const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "3 minutes ago", "yesterday" — the wording the prototype faked with static strings. */
export function relativeTime(value: Date, now: Date = new Date()): string {
  let duration = (value.getTime() - now.getTime()) / 1000;

  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return formatter.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return formatter.format(Math.round(duration), "year");
}

/**
 * A real `<time>` element: the machine-readable instant stays in `dateTime` so assistive
 * tech and copy-paste get the exact timestamp, not just "2 days ago".
 */
export function RelativeTime({ value, className }: { value: Date; className?: string }) {
  return (
    <time dateTime={value.toISOString()} title={value.toLocaleString()} className={className}>
      {relativeTime(value)}
    </time>
  );
}
