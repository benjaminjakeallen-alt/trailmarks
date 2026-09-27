"use client";

import { useState } from "react";
import Image from "next/image";
import Lightbox from "@/components/Lightbox";
import type { Memory } from "@/lib/types";

interface MemoryCardProps {
  memory: Memory;
  onDelete: (id: number) => void;
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export default function MemoryCard({ memory, onDelete }: MemoryCardProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const dateLabel = formatDate(memory.memoryDate);

  async function handleDelete() {
    if (!confirm(`Delete "${memory.title}"? This removes its photos too.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/memories/${memory.id}`, { method: "DELETE" });
    if (res.ok) onDelete(memory.id);
    setDeleting(false);
  }

  return (
    <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">{memory.title}</h3>
          {dateLabel && <p className="text-sm text-foreground-muted">{dateLabel}</p>}
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          aria-label="Delete memory"
          className="shrink-0 rounded-full p-1.5 text-foreground-muted transition-colors hover:bg-surface-muted hover:text-red-600 disabled:opacity-50"
        >
          🗑
        </button>
      </div>

      {memory.body && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-foreground-muted">{memory.body}</p>
      )}

      {memory.photos.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {memory.photos.map((photo, i) => (
            <button
              key={photo.id}
              onClick={() => setLightboxIndex(i)}
              className="relative aspect-square overflow-hidden rounded-lg bg-surface-muted"
            >
              <Image
                src={photo.url}
                alt={photo.caption ?? memory.title}
                fill
                className="object-cover transition-transform duration-200 hover:scale-105"
                sizes="200px"
              />
            </button>
          ))}
        </div>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          photos={memory.photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      )}
    </article>
  );
}
