"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/ui/cn";

const NAV = [
  { href: "/", label: "Discover", glyph: "⌂" },
  { href: "/loop", label: "My Loop", glyph: "⊞" },
  { href: "/saved", label: "Saved", glyph: "♡" },
  { href: "/messages", label: "Messages", glyph: "◯" },
] as const;

export function Sidebar({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="fixed top-0 left-0 z-100 hidden h-screen w-[245px] flex-col bg-sidebar px-[25px] py-[30px] text-white xl:flex">
      <Link href="/" className="flex items-center gap-[11px] text-[18px] font-extrabold">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent font-mono text-[13px] font-bold">
          CL
        </span>
        Campus Loop
      </Link>

      <p className="eyebrow mt-6 leading-[1.7] text-sidebar-muted">
        Your campus.
        <br />
        In circulation.
      </p>

      <nav className="mt-8 flex flex-col gap-1">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
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
            {item.href === "/messages" && unreadCount > 0 && (
              <span className="ml-auto flex h-[21px] min-w-[21px] items-center justify-center rounded-full bg-accent px-1.5 font-mono text-[9px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="my-6 h-px bg-sidebar-line" />

      <Link
        href="/listings/new"
        className="flex items-center gap-3 rounded-md border border-sidebar-line px-3 py-2.5 text-[13px] font-semibold transition-colors duration-200 hover:border-accent hover:bg-accent"
      >
        <span aria-hidden="true" className="w-4 text-center">
          ＋
        </span>
        List an item
      </Link>

      <div className="mt-auto">
        <p className="eyebrow text-[9px] text-sidebar-muted">Student marketplace</p>
        <p className="mt-1.5 text-[11px] text-sidebar-muted/70">Buy • Rent • Sell • Exchange</p>
      </div>
    </aside>
  );
}

/** The same navigation as a bottom bar, for the widths where the sidebar is hidden. */
export function MobileNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-100 flex border-t border-sidebar-line bg-sidebar text-white xl:hidden">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(item.href) ? "page" : undefined}
          className={cn(
            "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[9px] font-medium transition-colors",
            isActive(item.href) ? "text-accent" : "text-sidebar-muted",
          )}
        >
          <span aria-hidden="true" className="text-[15px]">
            {item.glyph}
          </span>
          {item.label}
          {item.href === "/messages" && unreadCount > 0 && (
            <span className="absolute top-1.5 right-[22%] h-2 w-2 rounded-full bg-accent" />
          )}
        </Link>
      ))}
      <Link
        href="/listings/new"
        className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[9px] font-semibold text-white"
      >
        <span aria-hidden="true" className="text-[15px]">
          ＋
        </span>
        List
      </Link>
    </nav>
  );
}
