import { ListingGridSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function SavedLoading() {
  return (
    <div className="px-page py-[55px]">
      <Skeleton className="h-2.5 w-20" />
      <Skeleton className="mt-3 h-[54px] w-64" />
      <Skeleton className="mt-4 h-3 w-full max-w-lg" />

      <div className="mt-10">
        <ListingGridSkeleton />
      </div>
    </div>
  );
}
