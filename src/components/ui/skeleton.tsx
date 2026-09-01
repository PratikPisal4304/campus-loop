import { cn } from "@/shared/ui/cn";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("bg-line/60 animate-pulse rounded-sm", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

/** Matches the real listing card's proportions so the page doesn't jump when data lands. */
export function ListingCardSkeleton() {
  return (
    <div className="border-border bg-surface overflow-hidden rounded-md border">
      <Skeleton className="h-[190px] rounded-none" />
      {/* Bar heights track the card's real type sizes — the meta rows are 11px now, so a
          2.5 bar would let the grid shift under the reader when data lands. */}
      <div className="space-y-3 p-[17px]">
        <Skeleton className="h-[38px] w-4/5" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-5 w-1/3" />
      </div>
    </div>
  );
}

export function ListingGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <ListingCardSkeleton key={index} />
      ))}
    </div>
  );
}
