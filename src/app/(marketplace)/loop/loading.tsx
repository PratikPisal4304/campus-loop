import { ListingCardSkeleton, Skeleton } from "@/components/ui/skeleton";

/** Four stat tiles over the listings/pulse split, matching the real page's grid. */
export default function LoopLoading() {
  return (
    <div className="px-page py-[55px]">
      <Skeleton className="h-2.5 w-24" />
      <Skeleton className="mt-3 h-[54px] w-full max-w-md" />
      <Skeleton className="mt-4 h-3 w-72" />

      <div className="mt-9 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="border-border bg-surface rounded-md border p-5">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="mt-2 h-9 w-14" />
            <Skeleton className="mt-1 h-2.5 w-24" />
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-[2fr_1fr]">
        <section className="border-border bg-surface rounded-md border p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-5 w-36" />
            </div>
            <Skeleton className="h-8 w-28" />
          </div>
          <div className="mt-6 grid grid-cols-1 gap-[18px] md:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <ListingCardSkeleton key={index} />
            ))}
          </div>
        </section>

        <aside className="bg-pulse h-fit rounded-md p-7">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="mt-2 h-[70px] w-full" />
          <Skeleton className="mt-4 h-14 w-full" />
          <Skeleton className="mt-6 h-[52px] w-48" />
        </aside>
      </div>
    </div>
  );
}
