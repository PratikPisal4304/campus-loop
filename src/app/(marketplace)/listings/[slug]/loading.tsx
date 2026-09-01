import { Skeleton } from "@/components/ui/skeleton";

/** The two-column detail split: swatch and description left, buy panel right. */
export default function ListingDetailLoading() {
  return (
    <div className="px-page mx-auto grid max-w-[1100px] gap-12 py-[55px] lg:grid-cols-[1.2fr_0.8fr]">
      <div>
        <Skeleton className="h-[380px] rounded-lg" />
        <div className="mt-9 space-y-3">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </div>

      <aside className="h-fit">
        <Skeleton className="h-2.5 w-28" />
        <Skeleton className="mt-3 h-9 w-full max-w-sm" />
        <Skeleton className="mt-5 h-9 w-32" />

        <div className="border-border mt-6 grid grid-cols-2 gap-4 border-y py-5">
          <div className="space-y-2">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-3.5 w-24" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-3.5 w-28" />
          </div>
        </div>

        <div className="border-border mt-6 flex items-center gap-3 rounded-md border p-4">
          <Skeleton className="h-11 w-11 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-2.5 w-40" />
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
        </div>
      </aside>
    </div>
  );
}
