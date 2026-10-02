"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowCounterClockwiseIcon,
  CameraIcon,
  CheckIcon,
  ImageIcon,
  MagicWandIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import Sheet from "@/components/ui/Sheet";
import Avatar from "@/components/family/Avatar";
import { useFamily } from "@/components/family/FamilyProvider";
import { BADGE_SIZE, HAT, makePhotoBadge } from "@/lib/photoBadge";
import { EASE_OUT_EXPO, HAPTICS, haptic } from "@/lib/motion";

const VIEW = 272;
/** Matches MAX_ADVENTURERS on the server. */
const MAX = 5;

type Saved = { id: number; url: string };
/** What's picked in the choose step: the free photo badge, or one of the adventurers. */
type Choice = { kind: "badge" } | { kind: "adventurer"; id: number };
type Drawing = "idle" | "loading" | "unavailable";

/** Pan (drag) and zoom (slider, wheel, pinch) a photo inside a circle, with the hat as a guide. */
function Cropper({ image, onDone }: { image: HTMLImageElement; onDone: (crop: HTMLCanvasElement) => void }) {
  const base = VIEW / Math.min(image.naturalWidth, image.naturalHeight);
  const [zoom, setZoom] = useState(1.15);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  const scale = base * zoom;
  const w = image.naturalWidth * scale;
  const h = image.naturalHeight * scale;
  // Keep the photo covering the circle.
  const clamp = (p: { x: number; y: number }, z = zoom) => {
    const s = base * z;
    const mx = (image.naturalWidth * s - VIEW) / 2;
    const my = (image.naturalHeight * s - VIEW) / 2;
    return { x: Math.max(-mx, Math.min(mx, p.x)), y: Math.max(-my, Math.min(my, p.y)) };
  };
  const setZoomClamped = (z: number) => {
    const next = Math.max(1, Math.min(4, z));
    setZoom(next);
    setPos((p) => clamp(p, next));
  };

  function done() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = BADGE_SIZE;
    const ctx = canvas.getContext("2d")!;
    const k = BADGE_SIZE / VIEW;
    const left = (VIEW - w) / 2 + pos.x;
    const top = (VIEW - h) / 2 + pos.y;
    ctx.drawImage(image, left * k, top * k, w * k, h * k);
    onDone(canvas);
  }

  return (
    <div>
      <div
        className="relative mx-auto touch-none select-none overflow-hidden rounded-full bg-surface-sunken ring-4 ring-accent/20"
        style={{ width: VIEW, height: VIEW }}
        onWheel={(e) => setZoomClamped(zoom * (e.deltaY < 0 ? 1.06 : 0.94))}
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
          }
        }}
        onPointerMove={(e) => {
          const prev = pointers.current.get(e.pointerId);
          if (!prev) return;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointers.current.size === 2 && pinch.current) {
            const [a, b] = [...pointers.current.values()];
            setZoomClamped((pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.dist);
          } else if (pointers.current.size === 1) {
            setPos((p) => clamp({ x: p.x + e.clientX - prev.x, y: p.y + e.clientY - prev.y }));
          }
        }}
        onPointerUp={(e) => {
          pointers.current.delete(e.pointerId);
          if (pointers.current.size < 2) pinch.current = null;
        }}
        onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL being cropped */}
        <img
          src={image.src}
          alt=""
          draggable={false}
          className="pointer-events-none absolute max-w-none"
          style={{ width: w, height: h, left: (VIEW - w) / 2 + pos.x, top: (VIEW - h) / 2 + pos.y }}
        />
        <svg viewBox="0 0 512 512" className="pointer-events-none absolute inset-0" aria-hidden>
          {[HAT.crown, HAT.band, HAT.brim].map((d) => (
            <path key={d} d={d} fill="rgb(255 255 255 / 0.22)" stroke="#fff" strokeWidth={5} strokeDasharray="14 10" />
          ))}
          <ellipse cx={256} cy={318} rx={112} ry={138} fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={4} strokeDasharray="10 12" />
        </svg>
      </div>
      <p className="mt-3 text-center text-[13.5px] text-fg-subtle">Drag and pinch to fit the oval.</p>
      <input
        type="range"
        min={1}
        max={4}
        step={0.01}
        value={zoom}
        onChange={(e) => setZoomClamped(Number(e.target.value))}
        aria-label="Zoom"
        className="mx-auto mt-3 block w-56 accent-[var(--accent)]"
      />
      <Button onClick={done} icon={<MagicWandIcon size={18} weight="fill" />} className="mt-5 w-full">
        Make my adventurer
      </Button>
    </div>
  );
}

function OptionCard({
  selected,
  onSelect,
  disabled,
  label,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`relative flex flex-col items-center gap-2 rounded-3xl p-3 transition-[box-shadow,background-color] ${
        selected ? "bg-accent-soft ring-2 ring-accent" : "bg-canvas ring-1 ring-line hover:ring-accent/40"
      } disabled:cursor-default`}
    >
      {selected && (
        <span className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-on-accent">
          <CheckIcon size={13} weight="bold" />
        </span>
      )}
      {children}
      <span className="text-[14px] font-semibold">{label}</span>
    </button>
  );
}

/**
 * Your adventurers: wear any of the ones you've made, or snap a selfie for a
 * new one. A new one can be the free photo badge or, up to five times, an AI
 * illustration. Every illustration is kept to switch back to.
 */
export default function AdventurerMaker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { viewer } = useFamily();
  const router = useRouter();
  const [saved, setSaved] = useState<Saved[] | null>(null);
  const [left, setLeft] = useState(MAX);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [badge, setBadge] = useState<{ url: string; blob: Blob } | null>(null);
  const [fresh, setFresh] = useState<Saved | null>(null);
  const [drawing, setDrawing] = useState<Drawing>("idle");
  const [choice, setChoice] = useState<Choice>({ kind: "badge" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const crop = useRef<HTMLCanvasElement | null>(null);
  const run = useRef(0);

  // Load their adventurers when the sheet opens (it's remounted fresh each time).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/avatar")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || cancelled) return;
        setSaved(d.adventurers);
        setLeft(d.left);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

  function reset() {
    run.current++;
    setImage(null);
    setBadge(null);
    setFresh(null);
    setDrawing("idle");
    setChoice({ kind: "badge" });
    setError(null);
    setSaving(false);
  }

  function pick(file: File | undefined) {
    if (!file) return;
    const img = new Image();
    img.onload = () => setImage(img);
    img.onerror = () => setError("That photo couldn't be opened. Try a JPEG or PNG.");
    img.src = URL.createObjectURL(file);
  }

  /** The free photo badge, made in the browser straight away. */
  async function make(canvas: HTMLCanvasElement) {
    if (!viewer) return;
    const id = ++run.current;
    crop.current = canvas;
    haptic(HAPTICS.claim);
    const b = await makePhotoBadge(canvas, viewer.color);
    if (id !== run.current) return;
    setBadge({ url: URL.createObjectURL(b), blob: b });
  }

  /** Spends one of the five AI illustrations (only when asked). The server keeps the result. */
  async function illustrate() {
    const canvas = crop.current;
    if (!canvas || drawing === "loading" || left <= 0) return;
    haptic(HAPTICS.select);
    setDrawing("loading");
    const jpeg = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
    const form = new FormData();
    if (jpeg) form.append("file", jpeg, "selfie.jpg");
    const res = await fetch("/api/avatar/illustrate", { method: "POST", body: form }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data?.adventurer) {
      setFresh(data.adventurer);
      setSaved((s) => [...(s ?? []), data.adventurer]);
      setLeft(data.left);
      setChoice({ kind: "adventurer", id: data.adventurer.id });
      setDrawing("idle");
      haptic(HAPTICS.everyone);
    } else {
      if (res?.status === 409) setLeft(0);
      setDrawing(res?.status === 409 ? "idle" : "unavailable");
    }
  }

  async function wear(id: number) {
    return fetch("/api/avatar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adventurer: id }),
    }).catch(() => null);
  }

  async function finish(res: Response | null) {
    if (!res?.ok) {
      setError("That didn't save. Check your connection and try again.");
      setSaving(false);
      return;
    }
    haptic(HAPTICS.everyone);
    router.refresh();
    onClose();
  }

  async function save() {
    setSaving(true);
    if (choice.kind === "adventurer") return finish(await wear(choice.id));
    if (!badge) return setSaving(false);
    const form = new FormData();
    form.append("file", badge.blob, "avatar.png");
    finish(await fetch("/api/avatar", { method: "POST", body: form }).catch(() => null));
  }

  async function remove() {
    setSaving(true);
    await fetch("/api/avatar", { method: "DELETE" }).catch(() => null);
    router.refresh();
    onClose();
  }

  const stage = badge ? "choose" : image ? "crop" : "pick";
  const wearing = viewer?.avatarUrl ?? null;

  return (
    <Sheet open={open} onClose={onClose} label="Your adventurers">
      <div className="pr-10">
        <h2 className="font-display text-[1.8rem] leading-tight">
          {stage === "choose" ? "Meet your adventurer" : stage === "crop" ? "Line yourself up" : "Your adventurers"}
        </h2>
      </div>

      <input ref={cameraRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      <input ref={libraryRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={stage}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
          className="mt-5"
        >
          {stage === "pick" && viewer && (
            <div>
              {saved === null ? (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5" role="status">
                  <span className="sr-only">Loading your adventurers</span>
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="aspect-square rounded-full" />
                  ))}
                </div>
              ) : saved.length > 0 ? (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {saved.map((a) => {
                    const on = wearing === a.url;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        disabled={saving}
                        aria-pressed={on}
                        aria-label={on ? "Wearing this adventurer" : "Wear this adventurer"}
                        onClick={async () => {
                          if (on) return;
                          setSaving(true);
                          finish(await wear(a.id));
                        }}
                        className={`relative aspect-square rounded-full transition-transform active:scale-95 ${
                          on ? "ring-4 ring-accent" : "ring-1 ring-line hover:ring-accent/50"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- small stored avatar */}
                        <img src={a.url} alt="" className="h-full w-full rounded-full object-cover" />
                        {on && (
                          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-on-accent ring-2 ring-surface">
                            <CheckIcon size={13} weight="bold" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {Array.from({ length: left }, (_, k) => (
                    <span
                      key={`empty-${k}`}
                      className="flex aspect-square items-center justify-center rounded-full border-2 border-dashed border-line-strong text-fg-subtle"
                      aria-hidden
                    >
                      <SparkleIcon size={18} />
                    </span>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3 py-2">
                  <Avatar member={viewer} size={84} className="ring-4 ring-canvas" />
                  <SparkleIcon size={22} weight="fill" className="text-reward" />
                  <span className="flex h-[84px] w-[84px] items-center justify-center rounded-full border-2 border-dashed border-line-strong bg-canvas">
                    <svg viewBox="0 0 512 512" className="h-14 w-14" aria-hidden>
                      <path d={HAT.crown} fill="#d9b77e" stroke="#10262a" strokeWidth={14} strokeLinejoin="round" />
                      <path d={HAT.band} fill={viewer.color} stroke="#10262a" strokeWidth={14} strokeLinejoin="round" />
                      <path d={HAT.brim} fill="#c9a266" stroke="#10262a" strokeWidth={14} strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              )}

              <p className="mt-5 text-[13.5px] font-semibold text-fg-muted">
                {saved && saved.length > 0 ? "Make a new one" : "Make your first"}
                <span className="ml-2 font-normal text-fg-subtle">
                  {left > 0 ? `${left} of ${MAX} illustrations left` : `All ${MAX} illustrations made; photo badges are unlimited`}
                </span>
              </p>
              <div className="mt-2 grid gap-2">
                <Button onClick={() => cameraRef.current?.click()} icon={<CameraIcon size={18} weight="fill" />}>
                  Take a selfie
                </Button>
                <Button variant="secondary" onClick={() => libraryRef.current?.click()} icon={<ImageIcon size={18} />}>
                  Choose a photo
                </Button>
              </div>
              {viewer.avatarUrl && (
                <button type="button" onClick={remove} disabled={saving} className="mx-auto mt-4 block text-[14px] font-semibold text-fg-subtle hover:text-danger-fg">
                  Go back to initials
                </button>
              )}
            </div>
          )}

          {stage === "crop" && image && <Cropper image={image} onDone={make} />}

          {stage === "choose" && badge && (
            <div>
              <div className="grid grid-cols-2 gap-3">
                <OptionCard
                  label="Illustrated"
                  selected={choice.kind === "adventurer"}
                  disabled={drawing === "loading" || (!fresh && left <= 0)}
                  onSelect={() => (fresh ? setChoice({ kind: "adventurer", id: fresh.id }) : illustrate())}
                >
                  <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-surface-sunken">
                    {fresh ? (
                      <motion.img
                        src={fresh.url}
                        alt="Illustrated adventurer"
                        initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 18 }}
                        className="h-full w-full object-cover"
                      />
                    ) : drawing === "loading" ? (
                      <span className="flex flex-col items-center gap-2 px-3 text-center text-[12.5px] font-medium text-fg-subtle">
                        <MagicWandIcon size={26} className="animate-pulse text-accent-fg" />
                        Sketching you…
                      </span>
                    ) : left <= 0 ? (
                      <span className="px-4 text-center text-[12.5px] text-fg-subtle">All {MAX} illustrations made</span>
                    ) : drawing === "unavailable" ? (
                      <span className="px-4 text-center text-[12.5px] text-fg-subtle">
                        The illustrator is out right now. That try wasn&apos;t used: tap to try again.
                      </span>
                    ) : (
                      <span className="flex flex-col items-center gap-1.5 px-3 text-center">
                        <MagicWandIcon size={26} weight="fill" className="text-accent-fg" />
                        <span className="text-[13px] font-semibold text-accent-fg">Illustrate me</span>
                        <span className="text-[11.5px] leading-tight text-fg-subtle">
                          {left} of {MAX} left
                        </span>
                      </span>
                    )}
                  </div>
                </OptionCard>
                <OptionCard label="Photo badge" selected={choice.kind === "badge"} onSelect={() => setChoice({ kind: "badge" })}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
                  <img src={badge.url} alt="Photo badge adventurer" className="h-32 w-32" />
                </OptionCard>
              </div>
              {error && <p className="mt-4 rounded-2xl bg-danger-soft px-4 py-3 text-[14px]">{error}</p>}
              <Button onClick={save} disabled={saving} icon={<CheckIcon size={18} weight="bold" />} className="mt-5 w-full">
                {saving ? "Saving…" : "Wear this one"}
              </Button>
              <button
                type="button"
                onClick={reset}
                className="mx-auto mt-3 flex items-center gap-1.5 text-[14px] font-semibold text-fg-muted hover:text-fg"
              >
                <ArrowCounterClockwiseIcon size={15} /> Try another photo
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      {error && stage === "pick" && <p className="mt-4 rounded-2xl bg-danger-soft px-4 py-3 text-[14px]">{error}</p>}
    </Sheet>
  );
}
