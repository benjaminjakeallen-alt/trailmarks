import { getAllMemories } from "@/lib/memories";
import MemoriesGallery from "@/components/MemoriesGallery";
import { Eyebrow } from "@/components/ui/Panel";
import { WordReveal } from "@/components/motion/Reveal";
import type { GalleryItem } from "@/lib/galleryItem";

export const dynamic = "force-dynamic";
export const metadata = { title: "Memories — Trailmarks" };

export default async function MemoriesPage() {
  const memories = await getAllMemories();

  const items: GalleryItem[] = memories.flatMap((memory) =>
    memory.photos.map((photo) => ({
      photo,
      memoryId: memory.id,
      memoryTitle: memory.title,
      stateCode: memory.stateCode,
      memoryDate: memory.memoryDate,
    })),
  );

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-24 pt-8 sm:px-8 lg:pt-16">
      <header className="mb-10 sm:mb-14">
        <Eyebrow>Memories</Eyebrow>
        <WordReveal
          text={"Every photo,\nevery road."}
          className="mt-5 font-display text-[clamp(2.8rem,6.5vw,5.5rem)] font-light leading-[0.92] tracking-[-0.045em] [&>span:last-child]:italic [&>span:last-child]:text-ink-2"
        />
      </header>
      <MemoriesGallery items={items} />
    </div>
  );
}
