"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function DesktopNav({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main navigation" className="hidden items-center gap-7 lg:flex">
      {[
        ["/", "Discover"],
        ["/loop", "My Loop"],
        ["/saved", "Saved"],
        ["/messages", "Messages"],
      ].map(([href, label]) => (
        <Link
          key={href}
          href={href ?? "/"}
          aria-current={
            (href === "/" ? pathname === href : pathname.startsWith(href ?? ""))
              ? "page"
              : undefined
          }
          className="text-fg-muted hover:text-accent aria-[current=page]:text-accent relative py-3 text-sm font-semibold aria-[current=page]:underline aria-[current=page]:underline-offset-8"
        >
          {label}
          {label === "Messages" && unreadCount > 0 && (
            <span className="bg-accent ml-2 rounded-full px-1.5 py-0.5 text-xs text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
