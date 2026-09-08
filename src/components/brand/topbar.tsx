import Link from "next/link";
import { initialsFor, type SessionUser } from "@/features/accounts";
import { DesktopNav } from "./desktop-nav";
export function Topbar({
  user,
  signOutAction,
  unreadCount = 0,
}: {
  user: SessionUser | null;
  signOutAction: () => Promise<void>;
  unreadCount?: number;
}) {
  return (
    <header className="border-border bg-surface sticky top-0 z-50 border-b">
      <div className="px-page mx-auto flex h-20 max-w-[1440px] items-center justify-between gap-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 text-lg font-extrabold tracking-tight"
        >
          <span
            className="bg-accent grid h-9 w-9 place-items-center rounded-md text-xl text-white"
            aria-hidden="true"
          >
            ↻
          </span>
          <span>
            campus<span className="text-accent">loop</span>
            <span className="text-fg-muted hidden font-mono text-[9px] tracking-[.18em] sm:block">
              THE STUDENT NOTICEBOARD
            </span>
          </span>
        </Link>
        <DesktopNav unreadCount={unreadCount} />
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/listings/new"
                className="bg-accent hover:bg-accent-hover hidden rounded-md px-4 py-2.5 text-sm font-semibold text-white sm:block"
              >
                + List an item
              </Link>
              {user.role === "admin" && (
                <Link href="/admin" className="text-accent text-xs font-semibold">
                  Admin
                </Link>
              )}
              <Link
                href="/settings"
                aria-label="Account settings"
                className="bg-avatar grid h-10 w-10 place-items-center rounded-full text-xs font-bold"
              >
                {initialsFor(user.name)}
              </Link>
              <form action={signOutAction}>
                <button className="text-fg-muted text-xs hover:underline">Log out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-semibold whitespace-nowrap">
                Log in
              </Link>
              <Link
                href="/signup"
                className="bg-accent hover:bg-accent-hover rounded-md px-4 py-2.5 text-sm font-semibold text-white"
              >
                Join<span className="hidden sm:inline"> the loop</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
