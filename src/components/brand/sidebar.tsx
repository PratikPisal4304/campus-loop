"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { safeInternalPath } from "@/shared/safe-path";
import { cn } from "@/shared/ui/cn";

const NAV = [
  { href: "/", label: "Discover", glyph: "⌂", auth: false },
  { href: "/loop", label: "My Loop", glyph: "⊞", auth: true },
  { href: "/saved", label: "Saved", glyph: "♡", auth: true },
  { href: "/messages", label: "Messages", glyph: "◯", auth: true },
] as const;

const NEW_LISTING = "/listings/new";

/**
 * Every destination but Discover is behind auth. Sending a signed-out student straight
 * there is a trapdoor: they land on a login screen with no idea what they lost. Routing
 * them through `?next=` means the click still ends where they aimed it.
 */
function hrefFor(target: string, needsAuth: boolean, isSignedIn: boolean): string {
  if (isSignedIn || !needsAuth) return target;
  return `/login?next=${encodeURIComponent(safeInternalPath(target))}`;
}

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

export function Sidebar({
  unreadCount = 0,
  isSignedIn = false,
}: {
  unreadCount?: number;
  isSignedIn?: boolean;
}) {
  const isActive = useIsActive();

  return (
    <aside className="bg-sidebar w-sidebar fixed top-0 left-0 z-100 hidden h-screen flex-col px-[25px] py-[30px] text-white lg:flex">
      <Link href="/" className="flex items-center gap-[11px] text-[18px] font-extrabold">
        <span className="bg-accent-on-dark text-ink flex h-9 w-9 items-center justify-center rounded-full font-mono text-[13px] font-bold">
          CL
        </span>
        Campus Loop
      </Link>

      <p className="eyebrow text-sidebar-muted mt-6 leading-[1.7]">
        Your campus.
        <br />
        In circulation.
      </p>

      <nav className="mt-8 flex flex-col gap-1">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={hrefFor(item.href, item.auth, isSignedIn)}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium transition-colors duration-200",
              isActive(item.href)
                ? "bg-sidebar-active text-white"
                : "text-sidebar-muted hover:bg-sidebar-hover hover:text-white",
            )}
          >
            <span aria-hidden="true" className="w-4 text-center">
              {item.glyph}
            </span>
            {item.label}
            {item.auth && !isSignedIn && (
              <span className="text-sidebar-muted ml-auto text-[10px]">Sign in</span>
            )}
            {item.href === "/messages" && isSignedIn && unreadCount > 0 && (
              <span className="bg-accent-on-dark text-ink ml-auto flex h-[21px] min-w-[21px] items-center justify-center rounded-full px-1.5 font-mono text-[10px] font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="bg-sidebar-line my-6 h-px" />

      <Link
        href={hrefFor(NEW_LISTING, true, isSignedIn)}
        className="border-sidebar-line hover:border-accent-on-dark hover:bg-accent-on-dark flex items-center gap-3 rounded-md border px-3 py-2.5 text-[13px] font-semibold transition-colors duration-200"
      >
        <span aria-hidden="true" className="w-4 text-center">
          ＋
        </span>
        List an item
      </Link>

      <div className="mt-auto">
        <p className="eyebrow text-sidebar-muted text-[11px]">Student marketplace</p>
        <p className="text-sidebar-muted/70 mt-1.5 text-[11px]">Buy • Rent • Sell • Exchange</p>
      </div>
    </aside>
  );
}

/** The same navigation as a bottom bar, for the widths where the sidebar is hidden. */
export function MobileNav({
  unreadCount = 0,
  isSignedIn = false,
}: {
  unreadCount?: number;
  isSignedIn?: boolean;
}) {
  const isActive = useIsActive();

  return (
    <nav className="border-sidebar-line bg-sidebar fixed inset-x-0 bottom-0 z-100 flex border-t text-white lg:hidden">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={hrefFor(item.href, item.auth, isSignedIn)}
          aria-current={isActive(item.href) ? "page" : undefined}
          className={cn(
            "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
            isActive(item.href) ? "text-accent-on-dark" : "text-sidebar-muted",
          )}
        >
          <span aria-hidden="true" className="text-[15px]">
            {item.glyph}
          </span>
          {item.label}
          {item.href === "/messages" && isSignedIn && unreadCount > 0 && (
            <span className="bg-accent-on-dark absolute top-1.5 right-[22%] h-2 w-2 rounded-full" />
          )}
        </Link>
      ))}
      <Link
        href={hrefFor(NEW_LISTING, true, isSignedIn)}
        className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-white"
      >
        <span aria-hidden="true" className="text-[15px]">
          ＋
        </span>
        List
      </Link>
    </nav>
  );
}
