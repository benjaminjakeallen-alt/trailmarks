"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ImagesIcon, PlayIcon } from "@phosphor-icons/react";
import Slideshow from "@/components/Slideshow";
import { Button } from "@/components/ui/Button";
import { STATES_BY_CODE } from "@/lib/statesData";
import { EASE_OUT_EXPO } from "@/lib/motion";
import type { GalleryItem } from "@/lib/galleryItem";

export default function MemoriesGallery({ items }: { items: GalleryItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-[1.75rem] bg-surface px-6 py-20 text-center shadow-[var(--shadow-card)] ring-1 ring-line">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent-fg">
          <ImagesIcon size={28} />
        </span>
        <p className="mt-5 font-display text-2xl">No photos yet</p>
        <p className="mt-2 max-w-[40ch] text-sm leading-relaxed text-fg-subtle">
          Add photos to a state&apos;s journal or a trip step, and they&apos;ll collect here — ready to play
          back as a story.
        </p>
        <Link href="/" className="mt-6 text-[15px] font-semibold text-accent-fg hover:text-accent-strong">
          Go to the map
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-[15px] font-medium text-fg-subtle tabular">
          {items.length} photo{items.length === 1 ? "" : "s"}
        </p>
        <Button onClick={() => setOpenIndex(0)} icon={<PlayIcon size={15} weight="fill" />}>
          Play story
        </Button>
      </div>

      <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
        {items.map((item, i) => (
          <motion.button
            key={item.photo.id}
            type="button"
            onClick={() => setOpenIndex(i)}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.8, ease: EASE_OUT_EXPO, delay: (i % 4) * 0.06 }}
            className="group relative block w-full break-inside-avoid overflow-hidden rounded-[1.4rem] bg-surface-sunken shadow-[var(--shadow-card)]"
          >
            <Image
              src={item.photo.url}
              alt={item.photo.caption ?? item.memoryTitle}
              width={item.photo.width ?? 800}
              height={item.photo.height ?? 600}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="w-full object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.05]"
            />
            <span className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-black/70 to-transparent p-3 pt-10 text-left text-white opacity-0 transition-all duration-500 ease-[var(--ease-out-expo)] group-hover:translate-y-0 group-hover:opacity-100">
              <span className="block text-[12px] text-white/75">
                {(item.stateCode && STATES_BY_CODE[item.stateCode]?.name) ?? "On the road"}
              </span>
              <span className="block truncate font-display text-[17px]">{item.memoryTitle}</span>
            </span>
          </motion.button>
        ))}
      </div>

      {openIndex !== null && <Slideshow items={items} startIndex={openIndex} onClose={() => setOpenIndex(null)} />}
    </div>
  );
}
