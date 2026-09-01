import Link from "next/link";
import { initialsFor, type SessionUser } from "@/features/accounts";
import { Button } from "@/components/ui/button";

/**
 * The prototype rendered the signed-in and signed-out states simultaneously — the markup
 * closed `.user-area` early and left the Login link outside it, so "Guest", a Logout
 * button and a Login link were all visible at once. Here it is one branch or the other.
 *
 * The sign-out action arrives as a prop rather than by import: actions live in `app/`,
 * and a component reaching into a route would invert the dependency direction.
 */
export function Topbar({
  user,
  signOutAction,
}: {
  user: SessionUser | null;
  signOutAction: () => Promise<void>;
}) {
  return (
    <header className="border-border bg-cream/95 px-page sticky top-0 z-50 flex h-[74px] items-center justify-between border-b backdrop-blur">
      {/*
        Below `lg` the sidebar is gone, so the topbar is the only place the app can say
        its own name. Above it the sidebar carries the wordmark and this side stays empty
        rather than repeating it — the wrapper is what keeps `justify-between` honest.

        What used to live here was a pulsing green dot labelled "Online campus", which
        nothing ever measured, next to a strapline that collapsed on phones and left the
        separator behind. Neither said anything true, so both are gone.
      */}
      <div className="flex items-center">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[16px] font-extrabold lg:hidden"
        >
          <span className="bg-accent flex h-8 w-8 items-center justify-center rounded-full font-mono text-[12px] font-bold text-white">
            CL
          </span>
          Campus Loop
        </Link>
      </div>

      {user ? (
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="hover:bg-panel-sunk flex items-center gap-2.5 rounded-md px-1.5 py-1 transition-colors"
          >
            <span className="bg-avatar flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold">
              {initialsFor(user.name)}
            </span>
            <span className="hidden text-[13px] font-semibold sm:inline">{user.name}</span>
          </Link>
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Log out
            </Button>
          </form>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="border-border hover:bg-dark rounded-sm border px-3.5 py-2 text-[12px] font-semibold transition-colors hover:text-white"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="bg-accent hover:bg-accent-hover rounded-sm px-3.5 py-2 text-[12px] font-semibold text-white transition-colors"
          >
            Join
          </Link>
        </div>
      )}
    </header>
  );
}
