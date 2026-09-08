import { getSessionUser } from "@/features/accounts";
import { countUnread } from "@/features/messaging";
import { MobileNav } from "@/components/brand/sidebar";
import { SiteFooter } from "@/components/brand/site-footer";
import { Topbar } from "@/components/brand/topbar";
import { signOutAction } from "./_actions/account";

/**
 * The shell every marketplace page shares — the prototype's fixed sidebar plus sticky
 * topbar, which it faked by toggling `display` on four sections of one HTML file.
 *
 * The sidebar appears from `lg` up: at 1024px a laptop was being handed a phone's bottom
 * bar. `pl-sidebar` and the sidebar's own width read the same token, so the gutter can
 * never drift from the panel it is making room for.
 */
export default async function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const unread = user ? await countUnread(user.id) : 0;
  const isSignedIn = Boolean(user);

  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="bg-surface text-accent sr-only z-[200] p-3 focus:not-sr-only focus:fixed"
      >
        Skip to content
      </a>
      {/* The bottom padding clears the mobile nav; it sits on the column so the footer
          is scrolled clear of the bar too, not just the page content. */}
      <div className="flex min-h-screen flex-col pb-20 lg:pb-0">
        <Topbar user={user} signOutAction={signOutAction} unreadCount={unread} />
        <main id="main-content" className="mx-auto w-full max-w-[1440px] flex-1">
          {children}
        </main>
        <SiteFooter />
      </div>
      <MobileNav unreadCount={unread} isSignedIn={isSignedIn} />
    </div>
  );
}
