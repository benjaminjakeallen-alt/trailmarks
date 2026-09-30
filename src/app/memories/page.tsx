import { requireViewer } from "@/lib/auth";
import { getAllMemories } from "@/lib/memories";
import MemoriesGallery from "@/components/MemoriesGallery";
import { Eyebrow } from "@/components/ui/Panel";
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
      <header className="mb-8 sm:mb-12">
        <Eyebrow>Memories</Eyebrow>
        <WordReveal
          text={"Every photo,\nevery road."}
          className="mt-3 font-display text-[clamp(2.6rem,6vw,4.75rem)] leading-[0.95] tracking-[-0.04em] [&>span:last-child]:text-petrol"
        />
      </header>
      <MemoriesGallery items={items} />
    </div>
  );
}
