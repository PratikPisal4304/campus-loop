import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRoleOrNotFound } from "@/features/accounts";
import { adminRecords, isAdminSection } from "@/features/administration";
import { ActionForm } from "@/components/ui/action-form";
import { manageRecordAction } from "../../_actions/manage";
const statuses: Record<string, string[]> = {
  users: ["active", "suspended"],
  listings: ["active", "reserved", "sold", "closed", "hidden"],
  deals: ["pending", "completed", "cancelled"],
  reports: ["open", "reviewed", "dismissed"],
  email: ["queued", "sending", "accepted", "failed", "skipped"],
};
export default async function AdminSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requireRoleOrNotFound("admin");
  const { section } = await params;
  if (!isAdminSection(section)) notFound();
  const { q = "", status = "", page: rawPage } = await searchParams;
  const page = Math.max(1, Math.min(1000, Math.floor(Number(rawPage)) || 1));
  const data = await adminRecords(section, q, status, page);
  const query = new URLSearchParams({ section, q, status });
  const href = (next: number) =>
    `/admin/${section}?${new URLSearchParams({ q, status, page: String(next) })}`;
  return (
    <>
      <p className="eyebrow text-accent">Campus records</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl capitalize">
          {section === "email" ? "Email activity" : section}
        </h1>
        {["users", "listings", "deals"].includes(section) && (
          <a
            className="text-accent text-sm font-semibold underline"
            href={`/api/admin/export?${query}`}
          >
            Export filtered CSV ↓
          </a>
        )}
      </div>
      <form className="my-7 flex flex-wrap gap-3">
        <input
          className="form-input max-w-sm"
          name="q"
          defaultValue={q}
          placeholder={`Search ${section}`}
          aria-label={`Search ${section}`}
        />
        <select
          className="form-input max-w-48"
          name="status"
          defaultValue={status}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {statuses[section]?.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button className="bg-accent rounded-md px-5 py-3 font-semibold text-white">
          Filter
        </button>
      </form>
      <p className="text-fg-muted mb-4 text-sm">
        {data.total} matching records · Page {page}
      </p>
      <div className="border-border bg-surface overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel-sunk">
            <tr>
              {data.columns.map((c) => (
                <th key={c} className="px-4 py-3 font-semibold whitespace-nowrap">
                  {c}
                </th>
              ))}
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.records.map((record) => (
              <tr key={record.id} className="border-border border-t align-top">
                {record.cells.map((c, i) => (
                  <td key={i} className="max-w-xs min-w-28 px-4 py-4 break-words">
                    {c}
                  </td>
                ))}
                <td className="min-w-60 px-4 py-4">
                  {record.actions.length ? (
                    <details>
                      <summary className="text-accent cursor-pointer font-semibold">
                        Manage record
                      </summary>
                      <ActionForm
                        action={manageRecordAction}
                        label="Apply change"
                        className="mt-3"
                      >
                        <input type="hidden" name="targetId" value={record.id} />
                        <select className="form-input" name="action" aria-label="Action">
                          {record.actions.map((a) => (
                            <option key={a.value} value={a.value}>
                              {a.label}
                            </option>
                          ))}
                        </select>
                        <input
                          className="form-input"
                          name="reason"
                          placeholder="Reason for this change"
                          aria-label="Reason for this change"
                          minLength={3}
                          maxLength={500}
                          required
                        />
                      </ActionForm>
                    </details>
                  ) : (
                    <span className="text-fg-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.records.length === 0 && (
          <p className="text-fg-muted p-10 text-center">No records match these filters.</p>
        )}
      </div>
      <nav aria-label="Record pages" className="mt-6 flex gap-5 text-sm">
        {page > 1 && (
          <Link className="underline" href={href(page - 1)}>
            ← Previous
          </Link>
        )}
        {page * 25 < data.total && (
          <Link className="underline" href={href(page + 1)}>
            Next →
          </Link>
        )}
      </nav>
    </>
  );
}
