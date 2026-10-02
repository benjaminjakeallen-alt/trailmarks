"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRightIcon, CalendarBlankIcon, MapPinIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import { appendMeta, readPhotoMeta } from "@/lib/photoMeta";
import { planImport, type ImportGroup, type ImportPhoto } from "@/lib/photoImport";
import { STATES_BY_CODE } from "@/lib/statesData";
import { EASE_OUT_EXPO, HAPTICS, haptic } from "@/lib/motion";
import type { Memory } from "@/lib/types";

/** Formats the server can re-encode. iPhone's picker converts HEIC to JPEG on the way out. */
const SUPPORTED = /^image\/(jpeg|png|webp|avif|gif|tiff)$/;
const UPLOAD_CONCURRENCY = 3;

type Stage =
  | { kind: "reading"; done: number; total: number }
  | { kind: "review" }
  | { kind: "uploading"; done: number; total: number }
  | { kind: "error"; message: string };

function Thumbs({ photos }: { photos: ImportPhoto[] }) {
  const shown = photos.slice(0, 7);
  return (
    <div className="mt-3 flex gap-1.5 overflow-hidden">
      {shown.map((p) => (
        // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
        <img key={p.key} src={p.previewUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
      ))}
      {photos.length > shown.length && (
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-[14px] font-semibold text-fg-muted">
          +{photos.length - shown.length}
        </span>
      )}
    </div>
  );
}

function when(photos: ImportPhoto[]) {
  const times = photos.filter((p) => p.takenAt).map((p) => p.takenAt!.getTime());
  if (!times.length) return "No date";
  const fmt = (t: number) => new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const [a, b] = [Math.min(...times), Math.max(...times)];
  return a === b ? fmt(a) : `${fmt(a)} – ${new Date(b).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

/**
 * Pick a batch of photos; each is sorted into the trip by the time and place
 * the camera recorded. Photos join a step taken the same day nearby, the rest
 * become new stops. Review, rename or leave groups out, then import.
 */
export default function PhotoImport({
  tripId,
  trip,
  steps,
  files,
  onClose,
  onImported,
}: {
  tripId: number;
  trip: { startedAt: string | null; endedAt: string | null };
  steps: Memory[];
  files: File[];
  onClose: () => void;
  onImported: () => void;
}) {
  const [stage, setStage] = useState<Stage>({ kind: "reading", done: 0, total: files.length });
  const [photos, setPhotos] = useState<ImportPhoto[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [excluded, setExcluded] = useState<Set<string>>(new Set(["outside"]));
  const [titles, setTitles] = useState<Record<string, string>>({});
  const urls = useRef<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const usable = files.filter((f) => SUPPORTED.test(f.type));
      setSkipped(files.length - usable.length);
      const read: ImportPhoto[] = [];
      for (const [i, file] of usable.entries()) {
        const meta = await readPhotoMeta(file);
        const previewUrl = URL.createObjectURL(file);
        urls.current.push(previewUrl);
        read.push({ key: `${i}-${file.name}`, file, previewUrl, ...meta });
        if (cancelled) return;
        setStage({ kind: "reading", done: i + 1, total: usable.length });
      }
      setPhotos(read);
      setStage({ kind: "review" });
    })();
    return () => {
      cancelled = true;
    };
  }, [files]);

  useEffect(() => {
    const previews = urls.current;
    return () => previews.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && stage.kind !== "uploading" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, stage.kind]);

  const groups = useMemo(() => planImport(photos, trip, steps), [photos, trip, steps]);
  const included = groups.filter((g) => !excluded.has(g.key));
  const photoCount = included.reduce((n, g) => n + g.photos.length, 0);
  const newStops = included.filter((g) => g.kind !== "existing").length;
  const withMeta = photos.filter((p) => p.takenAt).length;

  function toggle(key: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function run() {
    const total = photoCount;
    let done = 0;
    setStage({ kind: "uploading", done, total });
    try {
      for (const group of included) {
        let memoryId: number;
        if (group.kind === "existing") {
          memoryId = group.memory.id;
        } else {
          const res = await fetch(`/api/trips/${tripId}/memories`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              group.kind === "new"
                ? {
                    title: (titles[group.key] ?? group.title).trim() || group.title,
                    memoryDate: group.memoryDate,
                    lat: group.lat,
                    lng: group.lng,
                  }
                : { title: (titles.outside ?? "More photos").trim() || "More photos" },
            ),
          });
          if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Couldn't create a stop");
          memoryId = (await res.json()).memory.id;
        }

        const queue = [...group.photos];
        const worker = async () => {
          for (let photo = queue.shift(); photo; photo = queue.shift()) {
            const form = new FormData();
            form.append("file", photo.file);
            form.append("memoryId", String(memoryId));
            appendMeta(form, photo);
            const res = await fetch("/api/photos", { method: "POST", body: form });
            if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "A photo didn't upload");
            done += 1;
            setStage({ kind: "uploading", done, total });
          }
        };
        await Promise.all(Array.from({ length: UPLOAD_CONCURRENCY }, worker));
      }
      haptic(HAPTICS.claim);
      onImported();
      onClose();
    } catch (err) {
      setStage({ kind: "error", message: err instanceof Error ? err.message : "Something went wrong" });
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-fg/40 backdrop-blur-sm sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={() => stage.kind !== "uploading" && onClose()}
    >
      <motion.div
        role="dialog"
        aria-label="Import photos"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[2rem] bg-surface shadow-[var(--shadow-float)] ring-1 ring-line sm:rounded-[2rem]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-line p-5 sm:p-6">
          <div>
            <h2 className="font-display text-[1.6rem] leading-tight">
              {stage.kind === "reading"
                ? "Reading dates and places…"
                : stage.kind === "uploading"
                  ? "Adding photos to your trip…"
                  : `Sorted ${photos.length} ${photos.length === 1 ? "photo" : "photos"} by time and place`}
            </h2>
            {stage.kind === "review" && (withMeta < photos.length || skipped > 0) && (
              <p className="mt-1 text-[14px] text-fg-subtle">
                {withMeta < photos.length && `${photos.length - withMeta} had no date, so they're grouped together at the end.`}
                {skipped > 0 && ` ${skipped} ${skipped === 1 ? "file wasn't a supported image" : "files weren't supported images"} (HEIC: pick from Photos, which converts to JPEG).`}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={stage.kind === "uploading"}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-canvas text-fg-muted hover:text-fg disabled:opacity-40"
          >
            <XIcon size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {(stage.kind === "reading" || stage.kind === "uploading") && (
            <div className="py-10">
              <div className="h-2 overflow-hidden rounded-full bg-map-land">
                <motion.div
                  className="h-full origin-left rounded-full bg-gradient-to-r from-accent to-success"
                  animate={{ scaleX: stage.total ? stage.done / stage.total : 0 }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="mt-3 text-center text-[14px] text-fg-subtle tabular">
                {stage.done} of {stage.total}
              </p>
            </div>
          )}

          {stage.kind === "error" && (
            <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-[14px] text-fg">
              {stage.message}. Photos that finished are saved; you can import the rest again.
            </p>
          )}

          {stage.kind === "review" && (
            <ol className="space-y-3">
              <AnimatePresence initial={false}>
                {groups.map((group, i) => (
                  <motion.li
                    key={group.key}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: excluded.has(group.key) ? 0.5 : 1, y: 0 }}
                    transition={{ duration: 0.4, ease: EASE_OUT_EXPO, delay: i * 0.04 }}
                    className="rounded-[1.4rem] bg-canvas p-4 ring-1 ring-line"
                  >
                    <GroupCard
                      group={group}
                      title={titles[group.key]}
                      onTitle={(t) => setTitles((prev) => ({ ...prev, [group.key]: t }))}
                      included={!excluded.has(group.key)}
                      onToggle={() => toggle(group.key)}
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>
          )}
        </div>

        {(stage.kind === "review" || stage.kind === "error") && (
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-5 sm:p-6">
            <p className="text-[14px] text-fg-subtle">
              {photoCount} {photoCount === 1 ? "photo" : "photos"}
              {newStops > 0 && ` · ${newStops} new ${newStops === 1 ? "stop" : "stops"}`}
            </p>
            <Button onClick={run} disabled={photoCount === 0} trailingIcon={<ArrowRightIcon size={15} />}>
              {stage.kind === "error" ? "Try again" : "Import"}
            </Button>
          </footer>
        )}
      </motion.div>
    </motion.div>,
    document.body,
  );
}

function GroupCard({
  group,
  title,
  onTitle,
  included,
  onToggle,
}: {
  group: ImportGroup;
  title: string | undefined;
  onTitle: (t: string) => void;
  included: boolean;
  onToggle: () => void;
}) {
  const label =
    group.kind === "existing" ? "Adds to step" : group.kind === "new" ? "New stop" : "Outside this trip's dates";
  const state = group.kind === "new" && group.stateCode ? STATES_BY_CODE[group.stateCode]?.name : null;
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">{label}</p>
          {group.kind === "existing" ? (
            <p className="mt-0.5 truncate font-display text-[1.15rem]">{group.memory.title}</p>
          ) : (
            <input
              value={title ?? (group.kind === "new" ? group.title : "More photos")}
              onChange={(e) => onTitle(e.target.value)}
              aria-label="Stop name"
              maxLength={80}
              className="mt-0.5 w-full rounded-lg bg-transparent font-display text-[1.15rem] outline-none ring-accent/50 focus:bg-surface focus:px-2 focus:ring-2"
            />
          )}
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-fg-subtle">
            <span className="flex items-center gap-1">
              <CalendarBlankIcon size={13} /> {when(group.photos)}
            </span>
            {state && (
              <span className="flex items-center gap-1">
                <MapPinIcon size={13} weight="fill" className="text-reward" /> {state}
              </span>
            )}
            <span>
              {group.photos.length} {group.photos.length === 1 ? "photo" : "photos"}
            </span>
          </p>
        </div>
        <Switch on={included} onChange={onToggle} label={included ? "Leave these out" : "Include these"} />
      </div>
      <Thumbs photos={group.photos} />
    </div>
  );
}
