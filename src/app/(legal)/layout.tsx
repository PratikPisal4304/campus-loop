import Link from "next/link";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-border px-page border-b py-6">
        <Link href="/" className="flex items-center gap-2.5 text-[16px] font-extrabold">
          <span className="bg-accent flex h-8 w-8 items-center justify-center rounded-full font-mono text-[12px] text-white">
            CL
          </span>
          Campus Loop
        </Link>
      </header>

      <main className="px-page mx-auto max-w-[720px] py-14">
        <article className="text-fg-muted [&_h2]:text-fg [&_strong]:text-fg flex flex-col gap-5 text-[14px] leading-[1.8] [&_h2]:mt-8 [&_h2]:text-[19px]">
          {children}
        </article>
      </main>

      <footer className="border-border px-page border-t py-8">
        <p className="eyebrow text-fg-muted">Campus Loop © 2026</p>
        <p className="mt-2 flex gap-4 text-[12px]">
          <Link href="/terms" className="hover:text-accent">
            Terms of Use
          </Link>
          <Link href="/privacy" className="hover:text-accent">
            Privacy Policy
          </Link>
        </p>
      </footer>
    </div>
  );
}
