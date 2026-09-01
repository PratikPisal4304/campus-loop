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
    <aside className="bg-sidebar fixed top-0 left-0 z-100 hidden h-screen w-[245px] flex-col px-[25px] py-[30px] text-white xl:flex">
      <Link href="/" className="flex items-center gap-[11px] text-[18px] font-extrabold">
        <span className="bg-accent flex h-9 w-9 items-center justify-center rounded-full font-mono text-[13px] font-bold">
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
              <span className="bg-accent ml-auto flex h-[21px] min-w-[21px] items-center justify-center rounded-full px-1.5 font-mono text-[9px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="bg-sidebar-line my-6 h-px" />

      <Link
        href="/listings/new"
        className="border-sidebar-line hover:border-accent hover:bg-accent flex items-center gap-3 rounded-md border px-3 py-2.5 text-[13px] font-semibold transition-colors duration-200"
      >
        <span aria-hidden="true" className="w-4 text-center">
          ＋
        </span>
        List an item
      </Link>

      <div className="mt-auto">
        <p className="eyebrow text-sidebar-muted text-[9px]">Student marketplace</p>
        <p className="text-sidebar-muted/70 mt-1.5 text-[11px]">Buy • Rent • Sell • Exchange</p>
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
    <nav className="border-sidebar-line bg-sidebar fixed inset-x-0 bottom-0 z-100 flex border-t text-white xl:hidden">
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
            <span className="bg-accent absolute top-1.5 right-[22%] h-2 w-2 rounded-full" />
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
