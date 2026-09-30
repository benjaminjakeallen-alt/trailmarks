"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PencilSimpleIcon, MapPinIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { DateInput, Label, TextArea } from "@/components/ui/Field";
import PhotoDropzone from "@/components/memories/PhotoDropzone";
import { appendMeta, localDay, readPhotoMeta } from "@/lib/photoMeta";
import { EASE_OUT_EXPO } from "@/lib/motion";
import type { Memory, Photo } from "@/lib/types";

interface MemoryComposerProps {
  /** POST target for the memory itself, e.g. /api/states/tn/memories */
  endpoint: string;
  /** Tag uploaded photos with a state, when the memory belongs to one. */
  photoStateCode?: string;
  /** Pin the memory to the device's current location (trip steps). */
  captureLocation?: boolean;
  fallbackPoint?: { lat: number; lng: number } | null;
  prompt: string;
  titlePlaceholder: string;
  onCreated: (memory: Memory) => void;
}

function currentPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 10000,
    });
  });
}

export default function MemoryComposer({
  endpoint,
  photoStateCode,
  captureLocation = false,
  fallbackPoint,
  prompt,
  titlePlaceholder,
  onCreated,
}: MemoryComposerProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [memoryDate, setMemoryDate] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTitle("");
    setBody("");
    setMemoryDate("");
    setFiles([]);
    setOpen(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Give it a title first.");
      return;
    }
    setError(null);
    setStatus("Saving…");

    try {
      let coords: { lat: number | null; lng: number | null } = { lat: null, lng: null };
      if (captureLocation) {
        setStatus("Pinning your location…");
        const pos = await currentPosition();
        coords = {
          lat: pos?.coords.latitude ?? fallbackPoint?.lat ?? null,
          lng: pos?.coords.longitude ?? fallbackPoint?.lng ?? null,
        };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, memoryDate: memoryDate || null, ...coords }),
      });
      if (!res.ok) throw new Error();
      const { memory } = (await res.json()) as { memory: Memory };

      const photos: Photo[] = [];
      for (const [i, file] of files.entries()) {
        setStatus(`Uploading photo ${i + 1} of ${files.length}…`);
        const form = new FormData();
        form.append("file", file);
        appendMeta(form, await readPhotoMeta(file));
        form.append("memoryId", String(memory.id));
        if (photoStateCode) form.append("stateCode", photoStateCode);
        const up = await fetch("/api/photos", { method: "POST", body: form });
        if (up.ok) photos.push((await up.json()).photo);
      }

      onCreated({ ...memory, photos });
      reset();
    } catch {
      setError("That didn't save. Check your connection and try again.");
    } finally {
      setStatus(null);
    }
  }

  return (
    <motion.div
      layout
      transition={{ layout: { duration: 0.5, ease: EASE_OUT_EXPO } }}
      className="overflow-hidden rounded-[1.75rem] bg-elevated shadow-[var(--shadow-card)] ring-1 ring-line"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {!open ? (
          <motion.button
            key="closed"
            type="button"
            onClick={() => setOpen(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex w-full items-center gap-3 p-3 pr-5 text-left"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-petrol text-white">
              <PencilSimpleIcon size={18} weight="regular" />
            </span>
            <span className="flex-1 text-[15px] text-ink-3">{prompt}</span>
            {captureLocation && <MapPinIcon size={18} className="text-ink-3" />}
          </motion.button>
        ) : (
          <motion.form
            key="open"
            onSubmit={submit}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
            className="space-y-4 p-5 sm:p-6"
          >
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={titlePlaceholder}
              aria-label="Title"
              className="w-full bg-transparent font-display text-[1.7rem] leading-tight outline-none placeholder:text-ink-3/70"
            />

            <TextArea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What happened here? Write it while it's fresh."
              aria-label="Story"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[200px_1fr]">
              <div>
                <Label htmlFor="memory-date">When</Label>
                <DateInput id="memory-date" value={memoryDate} onChange={(e) => setMemoryDate(e.target.value)} />
              </div>
              <div>
                <Label>Photos</Label>
                <PhotoDropzone
                  files={files}
                  onChange={async (next) => {
                    setFiles(next);
                    // No date yet? Use the day the earliest photo was taken.
                    if (!memoryDate && next.length) {
                      const dates = (await Promise.all(next.map(readPhotoMeta)))
                        .map((m) => m.takenAt)
                        .filter((d): d is Date => d != null);
                      if (dates.length) {
                        setMemoryDate((current) => current || localDay(new Date(Math.min(...dates.map(Number)))));
                      }
                    }
                  }}
                />
              </div>
            </div>

            {captureLocation && (
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink-3">
                <MapPinIcon size={13} /> Pinned to where you are when you save
              </p>
            )}

            {error && <p className="text-sm text-coral">{error}</p>}

            <div className="flex items-center justify-end gap-2 pt-1">
              {status && <span className="mr-auto text-[13px] font-medium text-ink-3">{status}</span>}
              <Button type="button" variant="quiet" onClick={reset} disabled={!!status}>
                Cancel
              </Button>
              <Button type="submit" disabled={!!status}>
                Save memory
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
