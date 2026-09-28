"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { PauseIcon, PlayIcon, XIcon } from "@phosphor-icons/react";
import { STATES_BY_CODE } from "@/lib/statesData";
import { formatMemoryDate } from "@/components/memories/MemoryCard";
import { EASE_OUT_EXPO } from "@/lib/motion";
import type { GalleryItem } from "@/lib/galleryItem";

const SLIDE_MS = 5200;
const MAX_SEGMENTS = 24;

export default function Slideshow({
  items,
  startIndex,
  onClose,
}: {
  items: GalleryItem[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [playing, setPlaying] = useState(true);

  const next = useCallback(() => setIndex((i) => (i + 1) % items.length), [items.length]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + items.length) % items.length), [items.length]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(next, SLIDE_MS);
    return () => window.clearTimeout(id);
  }, [playing, index, next]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, next, prev]);

  if (typeof document === "undefined") return null;
  const item = items[index];
  if (!item) return null;
  const state = item.stateCode ? STATES_BY_CODE[item.stateCode] : null;
  const zoomIn = index % 2 === 0;
  const segmented = items.length <= MAX_SEGMENTS;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] overflow-hidden bg-[#07090c] text-white"
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={item.photo.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: EASE_OUT_EXPO }}
          className="absolute inset-0"
        >
          {/* Blurred fill so portrait photos never float in black bars. */}
          <Image src={item.photo.url} alt="" fill sizes="30vw" className="scale-125 object-cover opacity-40 blur-3xl" />
          <motion.div
            className="absolute inset-0"
            initial={{ scale: zoomIn ? 1 : 1.1, x: zoomIn ? 0 : 12 }}
            animate={{ scale: zoomIn ? 1.1 : 1, x: zoomIn ? -12 : 0 }}
            transition={{ duration: SLIDE_MS / 1000 + 1.2, ease: "linear" }}
          >
            <Image src={item.photo.url} alt={item.photo.caption ?? item.memoryTitle} fill priority sizes="100vw" className="object-contain" />
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Tap zones: left third goes back, the rest goes forward — like stories. */}
      <button aria-label="Previous" onClick={prev} className="absolute inset-y-0 left-0 w-1/3" />
      <button aria-label="Next" onClick={next} className="absolute inset-y-0 right-0 w-2/3" />

      <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent px-4 pb-10 pt-[calc(env(safe-area-inset-top)+0.9rem)] sm:px-8">
        {segmented ? (
          <div className="flex gap-1">
            {items.map((it, i) => (
              <span key={it.photo.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
                {i < index && <span className="block h-full w-full bg-white" />}
                {i === index && (
                  <span
                    key={`${index}-${playing}`}
                    className="segment-fill block h-full w-full bg-white"
                    style={{ animationDuration: `${SLIDE_MS}ms`, animationPlayState: playing ? "running" : "paused" }}
                  />
                )}
              </span>
            ))}
          </div>
        ) : (
          <div className="h-[3px] overflow-hidden rounded-full bg-white/25">
            <motion.span
              className="block h-full origin-left bg-white"
              animate={{ scaleX: (index + 1) / items.length }}
              transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
            />
          </div>
        )}
        <div className="pointer-events-auto mt-4 flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/70 tabular">
            {String(index + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause" : "Play"}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur-md hover:bg-white/20"
            >
              {playing ? <PauseIcon size={16} weight="fill" /> : <PlayIcon size={16} weight="fill" />}
            </button>
            <button
              onClick={onClose}
              aria-label="Close slideshow"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur-md hover:bg-white/20"
            >
              <XIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-5 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-24 sm:px-10 sm:pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={item.photo.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.7, ease: EASE_OUT_EXPO, delay: 0.2 }}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/65">
              {state?.name ?? "On the road"}
              {formatMemoryDate(item.memoryDate) && <> · {formatMemoryDate(item.memoryDate)}</>}
            </p>
            <h2 className="mt-2 max-w-[20ch] font-display text-[clamp(2rem,5vw,3.75rem)] font-light leading-[1] tracking-[-0.03em]">
              {item.memoryTitle}
            </h2>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>,
    document.body,
  );
}
