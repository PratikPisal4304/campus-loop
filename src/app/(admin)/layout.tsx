import Link from "next/link";
import { requireRoleOrNotFound } from "@/features/accounts";

/**
 * The admin shell — deliberately not the marketplace shell.
 *
 * No sidebar, no discover controls, nothing that makes this look like a place to browse.
 * Moderation is a different job from shopping, and sharing the chrome would blur which
 * one you are doing.
 *
 * The guard sits on the layout so every current and future page under `(admin)` inherits
 * it; the actions guard themselves separately, because a layout does not run for a POST.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireRoleOrNotFound("admin");

  return (
    <div className="min-h-screen">
      <header className="border-border px-page flex flex-wrap items-center justify-between gap-4 border-b py-6">
        <Link href="/admin" className="flex items-center gap-2.5 text-[16px] font-extrabold">
          <span className="bg-dark flex h-8 w-8 items-center justify-center rounded-full font-mono text-[11px] text-white">
            CL
          </span>
          Moderation
        </Link>
        <p className="text-fg-muted text-[12px]">
          Signed in as <strong className="text-fg">{admin.name}</strong> ·{" "}
          <Link href="/" className="hover:text-accent underline-offset-4 hover:underline">
            Back to Campus Loop
          </Link>
        </p>
      </header>

      <main className="px-page mx-auto max-w-[900px] py-12">{children}</main>
    </div>
  );
}
