import Link from "next/link";
import { requireRoleOrNotFound } from "@/features/accounts";
import { adminOverview } from "@/features/administration";
export const metadata = { title: "Campus administration", robots: { index: false } };
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  await requireRoleOrNotFound("admin");
  const { counts, audit } = await adminOverview();
  const cards = [
    ["Students", counts.users, "/admin/users"],
    ["Live listings", counts.listings, "/admin/listings"],
    ["Pending handoffs", counts.pending, "/admin/deals?status=pending"],
    ["Completed handoffs", counts.completed, "/admin/deals?status=completed"],
    ["Open reports", counts.reports, "/admin/reports?status=open"],
    ["Emails to check", counts.email, "/admin/email"],
  ] as const;
  return (
    <>
      <p className="eyebrow text-accent">Behind the noticeboard</p>
      <h1 className="mt-3 text-4xl">Campus overview</h1>
      <p className="text-fg-muted mt-3">
        Manage the people, items, and handoffs that keep your campus moving.
      </p>
      <div className="my-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value, href]) => (
          <Link
            href={href}
            key={label}
            className="border-border bg-surface hover:border-accent rounded-lg border p-6"
          >
            <p className="text-fg-muted text-sm">{label}</p>
            <p className="numeral mt-3 text-4xl">{value}</p>
          </Link>
        ))}
      </div>
      <h2 className="text-2xl">Recent admin changes</h2>
      <div className="border-border bg-surface mt-4 divide-y rounded-lg border">
        {audit.length ? (
          audit.map((r) => (
            <div key={r.id} className="p-4">
              <p className="text-sm font-semibold">
                {r.action.replaceAll("-", " ")} · {r.at}
              </p>
              <p className="text-fg-muted mt-1 text-sm">{r.reason}</p>
              <p className="text-fg-muted mt-2 font-mono text-xs break-all">
                Target: {r.targetId} · Admin: {r.actorId}
              </p>
            </div>
          ))
        ) : (
          <p className="text-fg-muted p-6 text-sm">
            Admin changes will appear here with a reason and timestamp.
          </p>
        )}
      </div>
    </>
  );
}
