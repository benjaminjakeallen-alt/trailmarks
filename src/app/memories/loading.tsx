import { Skeleton, SkeletonPage } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage className="mx-auto max-w-[1400px] px-4 pb-24 pt-8 sm:px-8 lg:pt-16">
      <Skeleton className="mb-8 h-12 w-64 sm:mb-10 sm:h-16" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className={`rounded-[1.4rem] ${i % 3 === 0 ? "aspect-[3/4]" : "aspect-square"}`} />
        ))}
      </div>
    </SkeletonPage>
  );
}
