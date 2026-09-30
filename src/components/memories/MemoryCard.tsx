"use client";

import { useState } from "react";
import Image from "next/image";
import { TrashIcon } from "@phosphor-icons/react";
import Lightbox from "@/components/Lightbox";
import Avatar from "@/components/family/Avatar";
import VoiceNote from "@/components/memories/VoiceNote";
import { useFamily, useMemberName } from "@/components/family/FamilyProvider";
import type { Memory } from "@/lib/types";

export function formatMemoryDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** 1 photo: full-bleed. 2: split. 3+: one hero plus a stacked pair. */
function Mosaic({ memory, onOpen }: { memory: Memory; onOpen: (i: number) => void }) {
  const photos = memory.photos;
  if (photos.length === 0) return null;

  const tile = (i: number, className: string, sizes: string) => {
    const photo = photos[i];
    const extra = i === 2 && photos.length > 3 ? photos.length - 3 : 0;
    return (
      <button
        key={photo.id}
        type="button"
        onClick={() => onOpen(i)}
        className={`group relative overflow-hidden bg-sunken ${className}`}
      >
        <Image
          src={photo.url}
          alt={photo.caption ?? memory.title}
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.05]"
        />
        {extra > 0 && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/45 font-display text-2xl text-white">
            +{extra}
          </span>
        )}
      </button>
    );
  };

  if (photos.length === 1) {
    return (
      <div className="mt-5 grid overflow-hidden rounded-2xl">
        {tile(0, "aspect-[16/10]", "(min-width: 768px) 640px, 100vw")}
      </div>
    );
  }
  if (photos.length === 2) {
    return (
      <div className="mt-5 grid grid-cols-2 gap-1.5 overflow-hidden rounded-2xl">
        {tile(0, "aspect-[4/5]", "320px")}
        {tile(1, "aspect-[4/5]", "320px")}
      </div>
    );
  }
  return (
    <div className="mt-5 grid grid-cols-3 grid-rows-2 gap-1.5 overflow-hidden rounded-2xl">
      {tile(0, "col-span-2 row-span-2 aspect-square", "(min-width: 768px) 430px, 66vw")}
      {tile(1, "aspect-square", "220px")}
      {tile(2, "aspect-square", "220px")}
    </div>
  );
}

export default function MemoryCard({ memory, onDelete }: { memory: Memory; onDelete: (id: number) => void }) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { viewer, members, byId } = useFamily();
  const nameOf = useMemberName();
  const author = memory.userId ? byId[memory.userId] : undefined;
  const mine = !!viewer && memory.userId === viewer.userId;

  async function remove() {
    if (!confirm(`Delete "${memory.title}"? Its photos${memory.audioUrl ? " and recording" : ""} go with it.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/memories/${memory.id}`, { method: "DELETE" });
    if (res.ok) onDelete(memory.id);
    else setDeleting(false);
  }

  return (
    <article
      className={`rounded-[1.75rem] bg-elevated p-5 shadow-[var(--shadow-card)] ring-1 ring-line transition-opacity sm:p-6 ${
        deleting ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13px] font-medium text-ink-3">
            {members.length > 1 && author && (
              <>
                <Avatar member={author} size={20} />
                <span className="text-ink-2">{nameOf(memory.userId)}</span>
                <span aria-hidden>·</span>
              </>
            )}
            {formatMemoryDate(memory.memoryDate ?? memory.createdAt)}
          </p>
          <h3 className="mt-1 font-display text-[1.6rem] leading-tight">{memory.title}</h3>
        </div>
        {mine && (
          <button
            type="button"
            onClick={remove}
            disabled={deleting}
            aria-label={`Delete ${memory.title}`}
            className="-mr-2 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-coral-soft hover:text-coral"
          >
            <TrashIcon size={18} />
          </button>
        )}
      </div>

      {memory.audioUrl && (
        <VoiceNote
          src={memory.audioUrl}
          seconds={memory.audioSeconds}
          label={`voice note for ${memory.title}`}
          className="mt-3 max-w-md"
        />
      )}

      {memory.body && <p className="mt-3 max-w-[62ch] whitespace-pre-wrap leading-[1.7] text-ink-2">{memory.body}</p>}

      <Mosaic memory={memory} onOpen={setLightbox} />

      {lightbox !== null && (
        <Lightbox
          photos={memory.photos}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onIndexChange={setLightbox}
        />
      )}
    </article>
  );
}
