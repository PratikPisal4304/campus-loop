import Link from "next/link";

const LINKS = [
  { href: "/terms", label: "Terms of Use" },
  { href: "/privacy", label: "Privacy Policy" },
] as const;

/**
 * Terms and Privacy were reachable only from the signup checkbox, which means a student
 * who had already agreed to them could never read them again. Every marketplace page
 * ends here instead.
 */
export function SiteFooter() {
  return (
    <footer className="border-border px-page mt-auto border-t py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="eyebrow text-fg-muted">Campus Loop © 2026 / Student marketplace</p>
        <nav className="flex flex-wrap gap-5 text-[12px]">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-fg-muted hover:text-accent transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
