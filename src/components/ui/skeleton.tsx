import { cn } from "@/shared/ui/cn";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("animate-pulse rounded-sm bg-line/60", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

/** Matches the real listing card's proportions so the page doesn't jump when data lands. */
export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface">
      <Skeleton className="h-[190px] rounded-none" />
      <div className="space-y-3 p-[17px]">
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-2.5 w-1/2" />
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
