import { Skeleton } from "@/components/ui/skeleton";

/** Three labelled fields and a save button, inside the page's 720px measure. */
export default function SettingsLoading() {
  return (
    <div className="px-page mx-auto max-w-[720px] py-[55px]">
      <Skeleton className="h-2.5 w-24" />
      <Skeleton className="mt-3 h-[54px] w-56" />
      <Skeleton className="mt-4 h-3 w-72" />

      <div className="mt-10 flex max-w-lg flex-col gap-6">
        {[44, 96, 44].map((height, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-2.5 w-28" />
            <Skeleton style={{ height }} />
          </div>
        ))}
        <Skeleton className="h-[52px] w-40 self-start" />
      </div>

      <div className="border-border mt-14 border-t pt-8">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="mt-2 h-3 w-64" />
      </div>
    </div>
  );
}
