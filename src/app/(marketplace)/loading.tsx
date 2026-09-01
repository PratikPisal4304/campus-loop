import { ListingGridSkeleton, Skeleton } from "@/components/ui/skeleton";

/** Mirrors the hero band, the filter row and the grid so nothing shifts on arrival. */
export default function DiscoverLoading() {
  return (
    <>
      <section className="bg-hero px-page py-[65px]">
        <Skeleton className="h-2.5 w-56" />
        <Skeleton className="mt-4 h-[72px] w-full max-w-2xl" />
        <Skeleton className="mt-3 h-[72px] w-full max-w-md" />
        <Skeleton className="mt-6 h-3 w-full max-w-xl" />
      </section>

      <section className="px-page py-10">
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-[50px] flex-1 basis-64" />
          <Skeleton className="h-[50px] w-32" />
          <Skeleton className="h-[50px] w-32" />
        </div>
      </section>

      <section className="px-page pb-[50px]">
        <ListingGridSkeleton />
      </section>
    </>
  );
}
