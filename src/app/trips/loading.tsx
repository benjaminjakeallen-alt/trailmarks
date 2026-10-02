import { Skeleton, SkeletonPage } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage className="mx-auto max-w-[1400px] px-4 pb-24 pt-8 sm:px-8 lg:pt-16">
      <Skeleton className="mb-8 h-12 w-48 sm:mb-10 sm:h-16" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
        <Skeleton className="aspect-[16/10] rounded-[1.75rem] md:col-span-4 md:row-span-2 md:aspect-auto" />
        <Skeleton className="aspect-[16/10] rounded-[1.75rem] md:col-span-2" />
        <Skeleton className="aspect-[16/10] rounded-[1.75rem] md:col-span-2" />
      </div>
    </SkeletonPage>
  );
}
