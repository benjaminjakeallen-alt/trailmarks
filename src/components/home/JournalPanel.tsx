"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  usePresence,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { ArrowUpRightIcon, NotebookIcon, XIcon } from "@phosphor-icons/react";
import StateSilhouette from "@/components/map/StateSilhouette";
import MemoryComposer from "@/components/memories/MemoryComposer";
import MemoryTimeline from "@/components/memories/MemoryTimeline";
import Visitors from "@/components/family/Visitors";
import { useFamily } from "@/components/family/FamilyProvider";
import { STATES_BY_CODE } from "@/lib/statesData";
import { EASE_OUT_EXPO } from "@/lib/motion";
import type { Memory } from "@/lib/types";

/** Where the journal grows from: the button that opened it, in viewport pixels. */
export interface JournalOrigin {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function originOf(el: Element): JournalOrigin {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

const MORPH = { type: "spring", stiffness: 210, damping: 30, mass: 1 } as const;

/** Docked to the right edge, the side the "Open journal" button lives on. Full-screen on phones. */
function panelSize() {
  const vw = window.innerWidth;
  const w = vw >= 640 ? Math.min(560, vw * 0.92) : vw;
  return { w, h: window.innerHeight, x: vw - w, radius: vw >= 640 ? 32 : 0 };
}

/**
 * The panel's window. It animates its own box (not a scale, so nothing
 * stretches) from the opening button to the right edge, while the content
 * stays pinned in place and is revealed through it. A petrol wash carrying
 * the button's label fades as it grows, so it reads as the button opening.
 * Closing runs the same path back into the button.
 */
function JournalShell({ origin, children }: { origin: JournalOrigin | null; children: ReactNode }) {
  const [isPresent, safeToRemove] = usePresence();
  const reduce = useReducedMotion();
  const [size, setSize] = useState(panelSize);
  const start = origin ?? { x: window.innerWidth, y: 0, w: size.w, h: size.h };

  const left = useMotionValue(start.x);
  const top = useMotionValue(start.y);
  const width = useMotionValue(start.w);
  const height = useMotionValue(start.h);
  const radius = useMotionValue(origin ? origin.h / 2 : size.radius);
  const wash = useMotionValue(origin ? 1 : 0);
  // Counter-move the content so it stays put (at its docked spot) while the window around it moves.
  const dockX = useMotionValue(size.x);
  const contentX = useTransform(() => dockX.get() - left.get());
  const contentY = useTransform(top, (v) => -v);

  useEffect(() => {
    const onResize = () => setSize(panelSize());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const t = reduce ? { duration: 0 } : MORPH;
    if (isPresent) {
      const runs = [
        animate(left, size.x, t),
        animate(top, 0, t),
        animate(width, size.w, t),
        animate(height, size.h, t),
        animate(radius, size.radius, t),
        animate(wash, 0, reduce ? { duration: 0 } : { duration: 0.45, delay: 0.08 }),
      ];
      return () => runs.forEach((r) => r.stop());
    }
    const back = reduce ? { duration: 0 } : { ...MORPH, stiffness: 340 };
    animate(wash, origin ? 1 : 0, reduce ? { duration: 0 } : { duration: 0.2 });
    animate(radius, origin ? origin.h / 2 : size.radius, back);
    animate(width, start.w, back);
    animate(height, start.h, back);
    animate(top, start.y, back);
    animate(left, start.x, back).then(() => safeToRemove?.());
    // Only presence changes drive this; size updates are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent]);

  useEffect(() => {
    if (!isPresent) return;
    dockX.set(size.x);
    left.set(size.x);
    width.set(size.w);
    height.set(size.h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  return (
    <motion.div
      className="fixed z-[71] overflow-hidden bg-canvas shadow-[var(--shadow-float)]"
      style={{ left, top, width, height, borderRadius: radius, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
    >
      <motion.div className="absolute left-0 top-0" style={{ x: contentX, y: contentY, width: size.w, height: size.h }}>
        {children}
      </motion.div>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 bg-accent text-[15px] font-medium text-on-accent"
        style={{ opacity: wash }}
      >
        <NotebookIcon size={17} /> Open journal
      </motion.div>
    </motion.div>
  );
}

/**
 * A state's journal, docked on the right over the map, so writing (or
 * speaking) a memory never leaves the map. The full page at /states/[code]
 * is a link away.
 */
export default function JournalPanel({
  code,
  origin,
  claimed,
  visitorIds,
  onClose,
  onWrote,
}: {
  code: string | null;
  origin: JournalOrigin | null;
  claimed: boolean;
  visitorIds: string[];
  onClose: () => void;
  /** A new memory claims the state for its author; the map should show it. */
  onWrote: (code: string) => void;
}) {
  const { members } = useFamily();
  const [memories, setMemories] = useState<Memory[] | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    fetch(`/api/states/${code}/memories`)
      .then((r) => (r.ok ? r.json() : { memories: [] }))
      .then((data) => {
        if (cancelled) return;
        setMemories(data.memories ?? []);
        setLoadedFor(code);
      })
      .catch(() => !cancelled && setMemories([]));
    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    if (!code) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [code, onClose]);

  const info = code ? STATES_BY_CODE[code] : null;
  const ready = memories !== null && loadedFor === code;
  const gold = members.length > 1 && visitorIds.length === members.length;

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {info && (
        <>
          <motion.div
            key="journal-scrim"
            className="fixed inset-0 z-[70] bg-fg/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <JournalShell key="journal-panel" origin={origin}>
            <aside role="dialog" aria-label={`${info.name} journal`} className="flex h-full w-full flex-col bg-canvas">
              <header className="flex items-center gap-4 border-b border-line bg-surface px-5 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] sm:px-6">
                <StateSilhouette
                  code={info.code}
                  claimed={claimed}
                  gold={gold}
                  width={80}
                  height={60}
                  className="h-12 w-16 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-display text-[1.7rem] leading-tight">{info.name}</h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close journal"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-canvas text-fg-muted ring-1 ring-line hover:text-fg"
                >
                  <XIcon size={18} />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-5 sm:px-6">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: 0.22 }}
                  className="space-y-6"
                >
                  <Visitors userIds={visitorIds} />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                      href={`/states/${info.code.toLowerCase()}`}
                      className="group ml-auto inline-flex items-center gap-1 text-[14px] font-semibold text-accent-fg hover:text-accent-strong"
                    >
                      Full page
                      <ArrowUpRightIcon
                        size={14}
                        className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      />
                    </Link>
                  </div>

                  <MemoryComposer
                    key={info.code}
                    endpoint={`/api/states/${info.code}/memories`}
                    photoStateCode={info.code}
                    prompt={`Write about ${info.name}…`}
                    titlePlaceholder="Sunrise hike above the clouds"
                    onCreated={(memory) => {
                      setMemories((prev) => [memory, ...(prev ?? [])]);
                      onWrote(info.code);
                    }}
                  />

                  {ready ? (
                    <MemoryTimeline
                      memories={memories}
                      onDelete={(id) => setMemories((prev) => (prev ?? []).filter((m) => m.id !== id))}
                      emptyTitle={`Nothing from ${info.name} yet`}
                      emptyBody="Write the first memory above, or tap Speak it and say what happened."
                    />
                  ) : (
                    <div className="space-y-3" aria-hidden>
                      {[0, 1].map((i) => (
                        <div key={i} className="h-40 animate-pulse rounded-[1.75rem] bg-surface-sunken" />
                      ))}
                    </div>
                  )}
                </motion.div>
              </div>
            </aside>
          </JournalShell>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
