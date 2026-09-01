import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DisplayHeading, Eyebrow } from "@/components/brand/typography";
import { EmptyState } from "@/components/brand/empty-state";
import { countOpenReports, listOpenReports } from "@/features/moderation";
import { resolveReportAction } from "../_actions/moderation";

export const metadata: Metadata = { title: "Moderation queue", robots: { index: false } };
export const dynamic = "force-dynamic";

const TARGET_LABELS: Record<string, string> = {
  listing: "Listing",
  user: "Student",
  conversation: "Conversation",
};

const dateFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

/**
 * The moderation queue.
 *
 * Deliberately one screen with two buttons per row. `/terms` promises we may suspend an
 * account used to scam, harass or spam; nobody could act on that promise before this page
 * existed, because reports had nowhere to land. Suspension itself is not here yet — this
 * is the surface that makes the reports visible and readable, which is the part that has
 * to exist first.
 */
export default async function AdminReportsPage() {
  // The list is capped at a page's worth; the count is not. Deriving the headline from
  // `reports.length` would quietly report "100 waiting" to a moderator facing 400.
  const [reports, openCount] = await Promise.all([listOpenReports(), countOpenReports()]);

  return (
    <>
      <Eyebrow>Open reports</Eyebrow>
      <DisplayHeading as="h1" size="page" className="mt-3">
        Moderation queue
      </DisplayHeading>
      <p className="text-fg-muted mt-4 text-[14px]">
        {reports.length === 0
          ? "Nothing waiting."
          : `${openCount} report${openCount === 1 ? "" : "s"} waiting, oldest first.` +
            (openCount > reports.length ? ` Showing the oldest ${reports.length}.` : "")}
      </p>

      {reports.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon="✓"
            title="The queue is empty"
            description="Every report students have filed has been reviewed or dismissed."
          />
        </div>
      ) : (
        <ul className="mt-10 flex flex-col gap-4">
          {reports.map((report) => (
            <li
              key={report.id}
              className="border-border bg-surface flex flex-col gap-4 rounded-md border p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{TARGET_LABELS[report.targetKind] ?? report.targetKind}</Badge>
                    <Badge tone="accent">{report.reasonLabel}</Badge>
                  </div>
                  <p className="text-fg mt-2 text-[15px] font-bold tracking-tight">
                    {report.targetHref ? (
                      <Link
                        href={report.targetHref}
                        className="underline-offset-4 hover:underline"
                      >
                        {report.targetLabel}
                      </Link>
                    ) : (
                      report.targetLabel
                    )}
                  </p>
                  <p className="text-fg-muted mt-1 text-[12px]">
                    Reported by {report.reporterName} ·{" "}
                    <span className="numeral">{dateFormat.format(report.createdAt)}</span>
                  </p>
                </div>
              </div>

              {report.details && (
                <p className="bg-panel-sunk text-fg rounded-sm p-3 text-[13px] leading-relaxed">
                  {report.details}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {/* Plain forms, not a client component: two buttons that post and
                    revalidate need no state on the client. */}
                <form action={resolveReportAction}>
                  <input type="hidden" name="reportId" value={report.id} />
                  <input type="hidden" name="outcome" value="reviewed" />
                  <button
                    type="submit"
                    className="border-border hover:border-fg h-9 rounded-sm border px-3 text-[12px] font-semibold transition-colors"
                  >
                    Mark reviewed
                  </button>
                </form>
                <form action={resolveReportAction}>
                  <input type="hidden" name="reportId" value={report.id} />
                  <input type="hidden" name="outcome" value="dismissed" />
                  <button
                    type="submit"
                    className="text-fg-muted hover:text-fg h-9 rounded-sm px-3 text-[12px] font-semibold transition-colors"
                  >
                    Dismiss
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
