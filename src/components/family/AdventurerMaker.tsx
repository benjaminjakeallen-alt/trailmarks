"use client";

import { useRef, useState } from "react";
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
import { Button } from "@/components/ui/Button";
import Sheet from "@/components/ui/Sheet";
import Avatar from "@/components/family/Avatar";
import { useFamily } from "@/components/family/FamilyProvider";
import { BADGE_SIZE, HAT, makePhotoBadge } from "@/lib/photoBadge";
import { EASE_OUT_EXPO, HAPTICS, haptic } from "@/lib/motion";

const VIEW = 272;

type Choice = "illustrated" | "badge";
/** The one AI illustration each person gets: on offer, being drawn, made (and stored), used up, or unavailable. */
type Illustration =
  | { state: "offer" }
  | { state: "loading" }
  | { state: "ready"; url: string }
  | { state: "used" }
  | { state: "unavailable" };

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
        className="relative mx-auto touch-none select-none overflow-hidden rounded-full bg-sunken ring-4 ring-petrol/20"
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
      <p className="mt-3 text-center text-[13.5px] text-ink-3">Drag and pinch so your face fills the oval, under the hat.</p>
      <input
        type="range"
        min={1}
        max={4}
        step={0.01}
        value={zoom}
        onChange={(e) => setZoomClamped(Number(e.target.value))}
        aria-label="Zoom"
        className="mx-auto mt-3 block w-56 accent-[var(--petrol)]"
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
        selected ? "bg-petrol-soft ring-2 ring-petrol" : "bg-bg ring-1 ring-line hover:ring-petrol/40"
      } disabled:cursor-default`}
    >
      {selected && (
        <span className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-petrol text-white">
          <CheckIcon size={13} weight="bold" />
        </span>
      )}
      {children}
      <span className="text-[14px] font-semibold">{label}</span>
    </button>
  );
}

/** Selfie → crop → two adventurers to pick from (AI illustration, or the in-browser photo badge) → save. */
export default function AdventurerMaker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { viewer } = useFamily();
  const router = useRouter();
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [badge, setBadge] = useState<{ url: string; blob: Blob } | null>(null);
  const initialIllustration = (): Illustration =>
    viewer?.illustratedUrl
      ? { state: "ready", url: viewer.illustratedUrl }
      : viewer?.illustrationUsed
        ? { state: "used" }
        : { state: "offer" };
  const [illustration, setIllustration] = useState<Illustration>(initialIllustration);
  const crop = useRef<HTMLCanvasElement | null>(null);
  const [choice, setChoice] = useState<Choice>("badge");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const run = useRef(0);

  function reset() {
    run.current++;
    setImage(null);
    setBadge(null);
    // A made illustration stays on offer; only an unfinished attempt resets.
    setIllustration((i) => (i.state === "ready" || i.state === "used" ? i : { state: "offer" }));
    setChoice("badge");
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
    if (illustration.state === "ready") setChoice("illustrated");
  }

  /** Spends the person's one AI illustration (only when they ask). The server stores the result. */
  async function illustrate() {
    const canvas = crop.current;
    if (!canvas || (illustration.state !== "offer" && illustration.state !== "unavailable")) return;
    haptic(HAPTICS.select);
    setIllustration({ state: "loading" });
    const jpeg = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
    const form = new FormData();
    if (jpeg) form.append("file", jpeg, "selfie.jpg");
    const res = await fetch("/api/avatar/illustrate", { method: "POST", body: form }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data?.illustratedUrl) {
      setIllustration({ state: "ready", url: data.illustratedUrl });
      setChoice("illustrated");
      haptic(HAPTICS.everyone);
      router.refresh();
    } else if (res?.status === 409) {
      setIllustration({ state: "used" });
    } else {
      setIllustration({ state: "unavailable" });
    }
  }

  async function wearIllustration() {
    return fetch("/api/avatar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ use: "illustration" }),
    }).catch(() => null);
  }

  async function save() {
    setSaving(true);
    let res: Response | null = null;
    if (choice === "illustrated" && illustration.state === "ready") {
      res = await wearIllustration();
    } else if (badge) {
      const form = new FormData();
      form.append("file", badge.blob, "avatar.png");
      res = await fetch("/api/avatar", { method: "POST", body: form }).catch(() => null);
    }
    if (!res?.ok) {
      setError("That didn't save. Check your connection and try again.");
      setSaving(false);
      return;
    }
    haptic(HAPTICS.everyone);
    router.refresh();
    onClose();
  }

  async function remove() {
    setSaving(true);
    await fetch("/api/avatar", { method: "DELETE" }).catch(() => null);
    router.refresh();
    onClose();
  }

  const stage = badge ? "choose" : image ? "crop" : "pick";

  return (
    <Sheet open={open} onClose={onClose} label="Make your adventurer">
      <div className="pr-10">
        <h2 className="font-display text-[1.8rem] leading-tight">
          {stage === "choose" ? "Meet your adventurer" : "Make your adventurer"}
        </h2>
        <p className="mt-1 text-[15px] leading-relaxed text-ink-3">
          {stage === "pick"
            ? "Snap a selfie and you'll get an explorer version of you. It stands in for you on the family map."
            : stage === "crop"
              ? "Line yourself up."
              : "Pick the one that feels like you."}
        </p>
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
              <div className="flex items-center justify-center gap-3 py-2">
                <Avatar member={viewer} size={84} className="ring-4 ring-bg" />
                <SparkleIcon size={22} weight="fill" className="text-sun" />
                <span className="flex h-[84px] w-[84px] items-center justify-center rounded-full border-2 border-dashed border-line-strong bg-bg">
                  <svg viewBox="0 0 512 512" className="h-14 w-14" aria-hidden>
                    <path d={HAT.crown} fill="#d9b77e" stroke="#10262a" strokeWidth={14} strokeLinejoin="round" />
                    <path d={HAT.band} fill={viewer.color} stroke="#10262a" strokeWidth={14} strokeLinejoin="round" />
                    <path d={HAT.brim} fill="#c9a266" stroke="#10262a" strokeWidth={14} strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
              <div className="mt-5 grid gap-2">
                <Button onClick={() => cameraRef.current?.click()} icon={<CameraIcon size={18} weight="fill" />}>
                  Take a selfie
                </Button>
                <Button variant="secondary" onClick={() => libraryRef.current?.click()} icon={<ImageIcon size={18} />}>
                  Choose a photo
                </Button>
              </div>
              {viewer.illustratedUrl && viewer.avatarUrl !== viewer.illustratedUrl && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    await wearIllustration();
                    router.refresh();
                    onClose();
                  }}
                  className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-bg p-2.5 text-left ring-1 ring-line hover:ring-petrol/40"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- small stored avatar */}
                  <img src={viewer.illustratedUrl} alt="" className="h-12 w-12 rounded-full" />
                  <span className="flex-1 text-[14.5px] font-semibold">Wear your illustrated adventurer again</span>
                </button>
              )}
              {viewer.avatarUrl && (
                <button type="button" onClick={remove} disabled={saving} className="mx-auto mt-4 block text-[14px] font-semibold text-ink-3 hover:text-coral">
                  Go back to initials
                </button>
              )}
              <p className="mt-4 text-center text-[12.5px] leading-relaxed text-ink-3">
                Your selfie isn&apos;t kept, only the adventurer you pick. Photo badges are free and unlimited; everyone
                gets one AI-illustrated adventurer.
              </p>
            </div>
          )}

          {stage === "crop" && image && <Cropper image={image} onDone={make} />}

          {stage === "choose" && badge && (
            <div>
              <div className="grid grid-cols-2 gap-3">
                <OptionCard
                  label="Illustrated"
                  selected={choice === "illustrated"}
                  disabled={illustration.state === "loading" || illustration.state === "used"}
                  onSelect={() => (illustration.state === "ready" ? setChoice("illustrated") : illustrate())}
                >
                  <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-sunken">
                    {illustration.state === "offer" ? (
                      <span className="flex flex-col items-center gap-1.5 px-3 text-center">
                        <MagicWandIcon size={26} weight="fill" className="text-petrol" />
                        <span className="text-[13px] font-semibold text-petrol">Illustrate me</span>
                        <span className="text-[11.5px] leading-tight text-ink-3">One per person, so use your best selfie</span>
                      </span>
                    ) : illustration.state === "ready" ? (
                      <motion.img
                        src={illustration.url}
                        alt="Illustrated adventurer"
                        initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 18 }}
                        className="h-full w-full object-cover"
                      />
                    ) : illustration.state === "loading" ? (
                      <span className="flex flex-col items-center gap-2 px-3 text-center text-[12.5px] font-medium text-ink-3">
                        <MagicWandIcon size={26} className="animate-pulse text-petrol" />
                        Sketching you…
                      </span>
                    ) : (
                      <span className="px-4 text-center text-[12.5px] text-ink-3">
                        {illustration.state === "used"
                          ? "You've made your one illustration"
                          : "The illustrator is out right now. Your try wasn't used: tap to try again."}
                      </span>
                    )}
                  </div>
                </OptionCard>
                <OptionCard label="Photo badge" selected={choice === "badge"} onSelect={() => setChoice("badge")}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
                  <img src={badge.url} alt="Photo badge adventurer" className="h-32 w-32" />
                </OptionCard>
              </div>
              {error && <p className="mt-4 rounded-2xl bg-coral-soft px-4 py-3 text-[14px]">{error}</p>}
              <Button onClick={save} disabled={saving} icon={<CheckIcon size={18} weight="bold" />} className="mt-5 w-full">
                {saving ? "Saving…" : "Save my adventurer"}
              </Button>
              <button
                type="button"
                onClick={reset}
                className="mx-auto mt-3 flex items-center gap-1.5 text-[14px] font-semibold text-ink-2 hover:text-ink"
              >
                <ArrowCounterClockwiseIcon size={15} /> Try another photo
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      {error && stage === "pick" && <p className="mt-4 rounded-2xl bg-coral-soft px-4 py-3 text-[14px]">{error}</p>}
    </Sheet>
  );
}
