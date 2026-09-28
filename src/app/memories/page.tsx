import { getAllMemories } from "@/lib/memories";
import MemoriesGallery from "@/components/MemoriesGallery";
import type { GalleryItem } from "@/lib/galleryItem";

export const dynamic = "force-dynamic";

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
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-10 sm:px-8 sm:pt-14">
      <header className="mb-8">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Memories</h1>
        <p className="mt-2 text-foreground-muted">
          Every photo from every trip, in one slideshow.
        </p>
      </header>

      <MemoriesGallery items={items} />
    </div>
  );
}
