import { Skeleton, SkeletonPage } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage className="mx-auto max-w-[1400px] px-3 pt-2 sm:px-8 sm:pt-3">
      <Skeleton className="mb-4 h-12 w-[min(32rem,80%)] sm:mb-5 sm:h-14" />
      <div className="rounded-[1.75rem] bg-surface p-3 shadow-[var(--shadow-card)] ring-1 ring-line sm:p-6">
        <div className="flex items-center gap-4 pb-4">
          <Skeleton className="h-11 w-44 rounded-full" />
          <Skeleton className="ml-auto h-11 w-32 rounded-full" />
        </div>
        <Skeleton className="aspect-[1.6] w-full rounded-[1.4rem]" />
      </div>
    </SkeletonPage>
  );
}
