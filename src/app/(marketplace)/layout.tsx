import { getSessionUser } from "@/features/accounts";
import { countUnread } from "@/features/messaging";
import { MobileNav, Sidebar } from "@/components/brand/sidebar";
import { Topbar } from "@/components/brand/topbar";
import { signOutAction } from "./_actions/account";

/**
 * The shell every marketplace page shares — the prototype's fixed sidebar plus sticky
 * topbar, which it faked by toggling `display` on four sections of one HTML file.
 */
export default async function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const unread = user ? await countUnread(user.id) : 0;

  return (
    <div className="min-h-screen xl:pl-[245px]">
      <Sidebar unreadCount={unread} />
      <div className="flex min-h-screen flex-col">
        <Topbar user={user} signOutAction={signOutAction} />
        <main className="flex-1 pb-20 xl:pb-0">{children}</main>
      </div>
      <MobileNav unreadCount={unread} />
    </div>
  );
}
