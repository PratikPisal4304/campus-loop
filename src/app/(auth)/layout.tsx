import Link from "next/link";
import { WelcomePanel } from "./_components/welcome-panel";

/** The mark doubles as the way back out of the auth flow, so it is always a link. */
function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`bg-accent flex items-center justify-center rounded-full font-mono font-bold text-white ${className ?? ""}`}
    >
      CL
    </span>
  );
}

/**
 * Two-column auth shell: an editorial welcome panel on the left, the form card on the
 * right. The prototype's dark glassmorphism is gone — the app is one light identity now,
 * so this reuses the Discover hero's paper ground and decorative circles instead.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <section className="bg-hero px-page relative hidden overflow-hidden py-[50px] lg:flex lg:flex-col">
        <span
          aria-hidden="true"
          className="bg-pulse pointer-events-none absolute -top-24 -left-16 h-[340px] w-[340px] rounded-full opacity-70"
        />
        <span
          aria-hidden="true"
          className="bg-highlight pointer-events-none absolute -right-20 bottom-[120px] h-[240px] w-[240px] rounded-full opacity-60"
        />
        <span
          aria-hidden="true"
          className="bg-avatar pointer-events-none absolute right-[90px] bottom-[40px] h-[110px] w-[110px] rounded-full opacity-80"
        />

        <Link
          href="/"
          className="text-fg relative flex items-center gap-[11px] text-[18px] font-extrabold"
        >
          <LogoMark className="h-9 w-9 text-[13px]" />
          Campus Loop
        </Link>

        <WelcomePanel />

        <p className="eyebrow text-fg-muted relative">Campus Loop © 2026</p>
      </section>

      <main className="px-page flex min-h-screen flex-col justify-center py-14">
        <div className="mx-auto w-full max-w-[430px]">
          <Link href="/" className="mb-8 inline-flex lg:hidden" aria-label="Campus Loop home">
            <LogoMark className="h-11 w-11 text-[14px]" />
          </Link>

          {children}
        </div>
      </main>
    </div>
  );
}
