"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FootprintsIcon } from "@phosphor-icons/react";
import MemoryCard from "@/components/memories/MemoryCard";
import { EASE_OUT_EXPO } from "@/lib/motion";
import type { Memory } from "@/lib/types";

/** Polarsteps-style journey rail: a thread down the left with a marker per memory. */
export default function MemoryTimeline({
  memories,
  onDelete,
  numbered = false,
  emptyTitle,
  emptyBody,
}: {
  memories: Memory[];
  onDelete: (id: number) => void;
  numbered?: boolean;
  emptyTitle: string;
  emptyBody: string;
}) {
  if (memories.length === 0) {
    return (
      <div className="bg-topo flex flex-col items-center rounded-[1.75rem] px-6 py-14 text-center ring-1 ring-line">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-elevated text-ink-2 ring-1 ring-line">
          <FootprintsIcon size={26} />
        </span>
        <p className="mt-4 font-display text-xl tracking-tight">{emptyTitle}</p>
        <p className="mt-1 max-w-[36ch] text-sm leading-relaxed text-ink-3">{emptyBody}</p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-5 pl-9 sm:pl-12">
      <span
        aria-hidden
        className="absolute bottom-4 left-[13px] top-4 w-px bg-gradient-to-b from-line-strong via-line-strong to-transparent sm:left-[17px]"
      />
      <AnimatePresence initial={false}>
        {memories.map((memory, i) => (
          <motion.li
            key={memory.id}
            id={`step-${memory.id}`}
            layout
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20, transition: { duration: 0.25 } }}
            transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
            className="relative scroll-mt-28"
          >
            <span
              aria-hidden
              className={`absolute top-6 flex items-center justify-center rounded-full bg-elevated font-mono text-[10.5px] text-ink-2 ring-1 ring-line-strong ${
                numbered ? "-left-9 h-7 w-7 sm:-left-12 sm:h-9 sm:w-9" : "-left-[29px] h-3 w-3 sm:-left-[37px]"
              }`}
            >
              {numbered ? String(i + 1).padStart(2, "0") : <span className="h-1.5 w-1.5 rounded-full bg-ember" />}
            </span>
            <MemoryCard memory={memory} onDelete={onDelete} />
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  );
}
