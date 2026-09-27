"use client";

import { useState } from "react";
import Image from "next/image";
import Slideshow from "@/components/Slideshow";
import { STATES_BY_CODE } from "@/lib/statesData";
import type { GalleryItem } from "@/lib/galleryItem";

interface MemoriesGalleryProps {
  items: GalleryItem[];
}

export default function MemoriesGallery({ items }: MemoriesGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-10 text-center text-foreground-muted">
        No photos yet. Mark a state visited and add a memory to start your gallery.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-foreground-muted">
          {items.length} photo{items.length === 1 ? "" : "s"}
        </p>
        <button
          onClick={() => setOpenIndex(0)}
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          ▶ Play slideshow
        </button>
      </div>

      <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
        {items.map((item, i) => (
          <button
            key={item.photo.id}
            onClick={() => setOpenIndex(i)}
            className="group relative block w-full overflow-hidden rounded-xl bg-surface-muted"
          >
            <Image
              src={item.photo.url}
              alt={item.photo.caption ?? item.memoryTitle}
              width={item.photo.width ?? 600}
              height={item.photo.height ?? 400}
              className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2.5 opacity-0 transition-opacity group-hover:opacity-100">
              <p className="truncate text-xs font-medium text-white">
                {STATES_BY_CODE[item.stateCode]?.name ?? item.stateCode}
              </p>
            </div>
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <Slideshow items={items} startIndex={openIndex} onClose={() => setOpenIndex(null)} />
      )}
    </div>
  );
}
