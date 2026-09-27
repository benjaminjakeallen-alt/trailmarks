"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { STATES_BY_CODE } from "@/lib/statesData";
import type { GalleryItem } from "@/lib/galleryItem";

interface SlideshowProps {
  items: GalleryItem[];
  startIndex: number;
  onClose: () => void;
}

const SLIDE_DURATION_MS = 5000;

export default function Slideshow({ items, startIndex, onClose }: SlideshowProps) {
  const [index, setIndex] = useState(startIndex);
  const [playing, setPlaying] = useState(true);
  const [zoomIn, setZoomIn] = useState(true);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % items.length);
    setZoomIn((z) => !z);
  }, [items.length]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + items.length) % items.length);
    setZoomIn((z) => !z);
  }, [items.length]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(next, SLIDE_DURATION_MS);
    return () => window.clearInterval(id);
  }, [playing, next]);

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
  const state = STATES_BY_CODE[item.stateCode];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      <AnimatePresence mode="sync">
        <motion.div
          key={item.photo.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <motion.div
            initial={{ scale: zoomIn ? 1 : 1.12 }}
            animate={{ scale: zoomIn ? 1.12 : 1 }}
            transition={{ duration: SLIDE_DURATION_MS / 1000 + 0.9, ease: "linear" }}
            className="absolute inset-0"
          >
            <Image
              src={item.photo.url}
              alt={item.photo.caption ?? item.memoryTitle}
              fill
              priority
              className="object-contain"
              sizes="100vw"
            />
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-16 text-white sm:p-10">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">
          {state?.name ?? item.stateCode}
        </p>
        <h2 className="font-display text-xl font-semibold sm:text-2xl">{item.memoryTitle}</h2>
      </div>

      <button
        onClick={onClose}
        aria-label="Close slideshow"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20"
      >
        ×
      </button>

      <button
        onClick={prev}
        aria-label="Previous"
        className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20 sm:left-4"
      >
        ‹
      </button>
      <button
        onClick={next}
        aria-label="Next"
        className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20 sm:right-4"
      >
        ›
      </button>

      <button
        onClick={() => setPlaying((p) => !p)}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-sm text-white hover:bg-white/20"
      >
        {playing ? "⏸ Pause" : "▶ Play"}
      </button>

      <div className="absolute left-0 top-0 h-1 bg-accent" style={{ width: `${((index + 1) / items.length) * 100}%` }} />
    </div>,
    document.body,
  );
}
