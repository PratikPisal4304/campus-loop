import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the two-column shell so the layout does not jump when the inbox lands. */
export default function MessagesLoading() {
  return (
    <section className="px-page py-10 pb-[60px]">
      <Skeleton className="h-2.5 w-24" />
      <Skeleton className="mt-3 h-12 w-64" />
      <Skeleton className="mt-3 h-3 w-72" />

      <div className="border-border bg-surface mt-[30px] grid min-h-[520px] grid-cols-1 overflow-hidden rounded-md border min-[800px]:grid-cols-[330px_1fr]">
        <div className="min-[800px]:border-border min-[800px]:border-r">
          <div className="border-border border-b px-5 py-5">
            <Skeleton className="h-2.5 w-28" />
          </div>
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="border-border/60 flex gap-3 border-b p-[17px]">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-2 w-1/2" />
                <Skeleton className="h-2 w-full" />
              </div>
            </div>
          ))}
        </div>

        <div className="hidden flex-col items-center justify-center gap-3 min-[800px]:flex">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>
    </section>
  );
}
