import { Skeleton, SkeletonPage } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage className="mx-auto max-w-[1400px] px-3 pb-24 pt-4 sm:px-8 lg:pt-6">
      <Skeleton className="h-5 w-24 rounded-full" />
      <Skeleton className="mt-4 h-[420px] rounded-[2rem] lg:h-[520px]" />
      <div className="mx-auto mt-16 max-w-3xl space-y-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    </SkeletonPage>
  );
}
