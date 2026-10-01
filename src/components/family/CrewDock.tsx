"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CameraIcon, PlusIcon } from "@phosphor-icons/react";
import Avatar from "@/components/family/Avatar";
import { useFamily } from "@/components/family/FamilyProvider";
import { EASE_OUT_EXPO, HAPTICS, haptic } from "@/lib/motion";

const HINT_KEY = "trailmarks:crewHint";

/**
 * The family, docked in the map's header: you first (tap to make or change
 * your adventurer), then everyone else, then an empty dashed seat that opens
 * the invite. It replaces separate "take a selfie" / "invite" cards: the
 * missing pieces show up as a camera badge and an empty seat, in place.
 */
export default function CrewDock() {
  const { viewer, members, openAdventurer, openInvite } = useFamily();
  const [hint, setHint] = useState<"adventurer" | "invite" | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const meRef = useRef<HTMLButtonElement>(null);
  const seatRef = useRef<HTMLButtonElement>(null);
  // The bubble hangs from the dock's right edge (it never runs off a phone screen); its arrow points at the target.
  const [arrowRight, setArrowRight] = useState(16);
  useLayoutEffect(() => {
    const target = hint === "adventurer" ? meRef.current : hint === "invite" ? seatRef.current : null;
    const dock = dockRef.current;
    if (!target || !dock) return;
    const t = target.getBoundingClientRect();
    setArrowRight(dock.getBoundingClientRect().right - (t.left + t.width / 2) - 6);
  }, [hint]);

  // One gentle pointer, once: the adventurer first, then (for a family of one) the empty seat.
  useEffect(() => {
    if (!viewer) return;
    let seen: string[] = [];
    try {
      seen = JSON.parse(localStorage.getItem(HINT_KEY) ?? "[]");
    } catch {}
    const next = !viewer.avatarUrl && !seen.includes("adventurer") ? "adventurer" : members.length < 2 && !seen.includes("invite") ? "invite" : null;
    if (!next) return;
    const t = window.setTimeout(() => setHint(next), 1800);
    return () => window.clearTimeout(t);
  }, [viewer, members.length]);

  // It's a nudge, not a gate: any tap elsewhere, or a few seconds, puts it away (and it won't come back).
  const bubbleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!hint) return;
    const away = (e: PointerEvent) => {
      if (!bubbleRef.current?.contains(e.target as Node)) dismiss(hint);
    };
    const t = window.setTimeout(() => dismiss(hint), 9000);
    document.addEventListener("pointerdown", away, true);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("pointerdown", away, true);
    };
  }, [hint]);

  function dismiss(which: "adventurer" | "invite") {
    setHint(null);
    try {
      const seen: string[] = JSON.parse(localStorage.getItem(HINT_KEY) ?? "[]");
      localStorage.setItem(HINT_KEY, JSON.stringify([...new Set([...seen, which])]));
    } catch {}
  }

  if (!viewer) return null;
  const others = members.filter((m) => m.userId !== viewer.userId);
  const shown = others.slice(0, 3);
  const extra = others.length - shown.length;
  const solo = others.length === 0;

  return (
    <div ref={dockRef} className="relative flex items-center">
      <button
        ref={meRef}
        type="button"
        onClick={() => {
          haptic(HAPTICS.select);
          dismiss("adventurer");
          openAdventurer();
        }}
        aria-label={viewer.avatarUrl ? "Change your adventurer" : "Make your adventurer"}
        className="relative z-[4] rounded-full transition-transform active:scale-95"
      >
        <Avatar member={viewer} size={40} className="ring-[3px] ring-elevated" />
        {!viewer.avatarUrl && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-petrol text-white ring-2 ring-elevated">
            <CameraIcon size={10} weight="fill" />
          </span>
        )}
      </button>

      {shown.length > 0 && (
        <Link href="/family" aria-label="Your family" className="flex items-center">
          {shown.map((m) => (
            <Avatar key={m.userId} member={m} size={40} className="-ml-2.5 ring-[3px] ring-elevated" />
          ))}
          {extra > 0 && (
            <span className="-ml-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-sunken text-[13px] font-semibold text-ink-2 ring-[3px] ring-elevated">
              +{extra}
            </span>
          )}
        </Link>
      )}

      <button
        ref={seatRef}
        type="button"
        onClick={() => {
          haptic(HAPTICS.select);
          dismiss("invite");
          openInvite();
        }}
        aria-label="Invite family"
        className={`group ml-1.5 flex h-10 items-center gap-1.5 rounded-full border-2 border-dashed border-petrol/35 bg-elevated text-petrol transition-colors hover:border-petrol hover:bg-petrol-soft ${
          solo ? "pl-2.5 pr-3.5" : "w-10 justify-center"
        }`}
      >
        <PlusIcon size={15} weight="bold" className="transition-transform group-hover:rotate-90" />
        {solo && <span className="text-[14px] font-semibold">Invite</span>}
      </button>

      <AnimatePresence>
        {hint && (
          <motion.button
            ref={bubbleRef}
            type="button"
            key={hint}
            onClick={() => {
              dismiss(hint);
              if (hint === "adventurer") openAdventurer();
              else openInvite();
            }}
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
            transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
            className="absolute right-0 top-[calc(100%+10px)] z-20 w-[228px] rounded-2xl bg-ink px-3.5 py-2.5 text-left text-[13px] leading-snug text-bg shadow-[var(--shadow-float)]"
          >
            <span className="absolute -top-1.5 h-3 w-3 rotate-45 bg-ink" style={{ right: arrowRight }} />
            <span className="relative block font-semibold">
              {hint === "adventurer" ? "Become an adventurer" : "Bring the family"}
            </span>
            <span className="relative block text-bg/70">
              {hint === "adventurer"
                ? "Snap a selfie. You'll show up round the campfire on every state you've been."
                : "Their states join your map, and the places you've all been turn gold."}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
