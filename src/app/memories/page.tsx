import { requireViewer } from "@/lib/auth";
import { getAllMemories } from "@/lib/memories";
import MemoriesGallery from "@/components/MemoriesGallery";
import { WordReveal } from "@/components/motion/Reveal";
import type { GalleryItem } from "@/lib/galleryItem";

export const dynamic = "force-dynamic";
export const metadata = { title: "Memories — Trailmarks" };

export default async function MemoriesPage() {
  const viewer = await requireViewer();
  const memories = await getAllMemories(viewer.familyId);

  const items: GalleryItem[] = memories.flatMap((memory) =>
    memory.photos.map((photo) => ({
      photo,
      memoryId: memory.id,
      memoryTitle: memory.title,
      userId: memory.userId,
      stateCode: memory.stateCode,
      memoryDate: memory.memoryDate,
    })),
  );

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-24 pt-8 sm:px-8 lg:pt-16">
      <header className="mb-8 sm:mb-10">
        <WordReveal text="Memories" className="font-display text-[clamp(2.4rem,6vw,4rem)] leading-[1] tracking-[-0.035em]" />
      </header>
      <MemoriesGallery items={items} />
    </div>
  );
}
