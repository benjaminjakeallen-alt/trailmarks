import { Skeleton, SkeletonPage } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage>
      <div className="mx-auto max-w-[1400px] px-3 pb-10 pt-4 sm:px-8 lg:pb-14 lg:pt-6">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="mt-4 min-h-[480px] rounded-[2rem] lg:min-h-[540px]" />
      </div>
      <div className="mx-auto max-w-3xl space-y-4 px-4 pb-24 sm:px-8">
        <Skeleton className="h-36" />
        <Skeleton className="h-28" />
      </div>
    </SkeletonPage>
  );
}
