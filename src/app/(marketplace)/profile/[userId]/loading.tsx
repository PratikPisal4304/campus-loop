import { ListingGridSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="px-page py-[55px]">
      <section className="border-border bg-surface flex flex-wrap items-center gap-6 rounded-lg border p-8">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-3 w-full max-w-md" />
        </div>
        <div className="bg-panel-sunk space-y-2 rounded-md px-6 py-4">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-7 w-14" />
          <Skeleton className="h-2.5 w-24" />
        </div>
      </section>

      <section className="mt-10">
        <Skeleton className="h-2.5 w-32" />
        <Skeleton className="mt-2 mb-6 h-7 w-64" />
        <ListingGridSkeleton count={4} />
      </section>
    </div>
  );
}
