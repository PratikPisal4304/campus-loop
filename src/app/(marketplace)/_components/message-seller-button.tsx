import { Button, ButtonLink } from "@/components/ui/button";
import { startConversationAction } from "../_actions/messaging";

/**
 * The prototype's `.message-seller-btn`. A plain form, not a client component: opening a
 * thread is a server round trip either way, and this keeps the listing page fully static.
 *
 * Signed out, it becomes a link back through login — the student lands on the listing
 * they were reading, not on the home page.
 */
export function MessageSellerButton({
  listingId,
  slug,
  isSignedIn,
  isOwnListing = false,
  className,
}: {
  listingId: string;
  slug: string;
  isSignedIn: boolean;
  /** Your own listing has nobody to message — the prototype showed the button anyway. */
  isOwnListing?: boolean;
  className?: string;
}) {
  if (isOwnListing) return null;

  if (!isSignedIn) {
    return (
      <ButtonLink
        href={`/login?next=${encodeURIComponent(`/listings/${slug}`)}`}
        variant="primary"
        size="lg"
        className={className}
      >
        Message seller
      </ButtonLink>
    );
  }

  return (
    <form action={startConversationAction} className={className}>
      <input type="hidden" name="listingId" value={listingId} />
      {/* Carried through so a failed start can send the student back where they were. */}
      <input type="hidden" name="slug" value={slug} />
      <Button type="submit" variant="primary" size="lg" className="w-full">
        Message seller
      </Button>
    </form>
  );
}
