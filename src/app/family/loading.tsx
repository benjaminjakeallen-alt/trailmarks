import { Skeleton, SkeletonPage } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-8 lg:pt-10">
      <Skeleton className="h-12 w-56 sm:h-16" />
      <div className="mt-8 rounded-[1.75rem] bg-surface p-5 shadow-[var(--shadow-card)] ring-1 ring-line sm:p-7">
        <Skeleton className="h-6 w-28 rounded-full" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4 py-4">
            <Skeleton className="h-[52px] w-[52px] shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32 rounded-full" />
              <Skeleton className="h-8 w-48 rounded-full" />
            </div>
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-5 h-40 rounded-[1.75rem]" />
    </SkeletonPage>
  );
}
