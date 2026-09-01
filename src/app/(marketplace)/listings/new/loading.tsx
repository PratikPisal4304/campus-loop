import { Skeleton } from "@/components/ui/skeleton";

/** The form column plus the checklist aside, on the page's own asymmetric grid. */
export default function NewListingLoading() {
  return (
    <div className="px-page mx-auto grid max-w-[1100px] gap-14 py-[55px] lg:grid-cols-[1.5fr_0.7fr]">
      <div>
        <Skeleton className="h-2.5 w-40" />
        <Skeleton className="mt-3 h-[54px] w-full max-w-sm" />
        <Skeleton className="mt-3 h-[54px] w-40" />
        <Skeleton className="mt-5 h-3 w-full max-w-lg" />

        <div className="mt-10 flex flex-col gap-6">
          {[44, 44, 120, 44, 44].map((height, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-2.5 w-28" />
              <Skeleton style={{ height }} />
            </div>
          ))}
          <Skeleton className="h-[52px] w-44" />
        </div>
      </div>

      <aside className="bg-checklist h-fit rounded-md p-7">
        <Skeleton className="h-2.5 w-32" />
        <div className="mt-4 space-y-2.5">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-3 w-full" />
          ))}
        </div>
        <Skeleton className="mt-6 h-14 w-full" />
      </aside>
    </div>
  );
}
