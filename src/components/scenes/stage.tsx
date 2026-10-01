"use client";

import { useEffect, useId, useReducer, type ReactNode } from "react";
import { motion, type TargetAndTransition, type Transition } from "framer-motion";
import { initials } from "@/components/family/Avatar";
import type { Member } from "@/lib/types";

/**
 * The little stage each state's activity plays on. Everything is laid out in
 * a 300×160 box and scaled with the container (sizes in `cqw`), so the same
 * scene works as a tiny map bubble or a full-width card.
 */

export const W = 300;
export const H = 160;
/** Most adventurers on stage at once; bigger families take turns. */
export const MAX_CAST = 5;

export const at = (x: number, y: number) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` });
const pctW = (s: number) => `${(s / W) * 100}%`;
/** A font size in stage units. */
export const fs = (s: number) => `${(s / W) * 100}cqw`;

/** n positions evenly along a line (centered for one). */
export function row(n: number, y: number, x0 = 50, x1 = 250): { x: number; y: number }[] {
  if (n <= 1) return [{ x: (x0 + x1) / 2, y }];
  return Array.from({ length: n }, (_, i) => ({ x: x0 + ((x1 - x0) * i) / (n - 1), y }));
}

/** Unique SVG ids per scene instance (several scenes can be on screen). */
export function useIds<K extends string>(...names: K[]): Record<K, string> {
  const base = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return Object.fromEntries(names.map((n) => [n, `${base}-${n}`])) as Record<K, string>;
}

/** The backdrop: an SVG in stage units, filling the stage. */
export function Bg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
      {children}
    </svg>
  );
}

/** A foreground SVG layer (above the cast), in stage units. */
export function Fg({ children, z = 200 }: { children: ReactNode; z?: number }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: z }}
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** The person's face: their adventurer avatar, or initials on their color. */
export function Face({ member }: { member: Member }) {
  if (member.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- tiny stored avatar
      <img
        src={member.avatarUrl}
        alt={member.displayName}
        draggable={false}
        className="relative block h-full w-full rounded-full object-cover shadow-[0_2px_6px_-2px_rgb(0_0_0/0.5)] ring-[1.5px] ring-white"
      />
    );
  }
  return (
    <svg viewBox="0 0 100 100" className="relative block h-full w-full drop-shadow" role="img" aria-label={member.displayName}>
      <circle cx="50" cy="50" r="46" fill={member.color} stroke="#fff" strokeWidth="6" />
      <text x="50" y="52" textAnchor="middle" dominantBaseline="central" fontSize="40" fontWeight="700" fill="#fff">
        {initials(member.displayName)}
      </text>
    </svg>
  );
}

/** Something drawn in an actor's own box: x/y/w in percent of the face. */
export function Bit({
  x,
  y,
  w,
  children,
  animate,
  transition,
  origin = "50% 50%",
  behind = false,
}: {
  x: number;
  y: number;
  w: number;
  children: ReactNode;
  animate?: TargetAndTransition;
  transition?: Transition;
  origin?: string;
  behind?: boolean;
}) {
  return (
    <motion.div
      className="pointer-events-none absolute"
      style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, translate: "-50% -50%", transformOrigin: origin, zIndex: behind ? -1 : 1 }}
      animate={animate}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}

/** An emoji prop, sized in stage units. */
export function Emo({ e, s }: { e: string; s: number }) {
  return (
    <span className="block select-none text-center leading-none" style={{ fontSize: fs(s) }} aria-hidden>
      {e}
    </span>
  );
}

/**
 * One adventurer, centered at (x, y) in stage units. They pop in when they
 * join and drop out when they leave (bigger families take turns), and
 * `animate` is their part in the activity.
 */
export function Actor({
  member,
  x,
  y,
  s = 34,
  z,
  animate,
  transition,
  children,
  behind,
}: {
  member: Member;
  x: number;
  y: number;
  s?: number;
  z?: number;
  animate?: TargetAndTransition;
  transition?: Transition;
  children?: ReactNode;
  behind?: ReactNode;
}) {
  return (
    <motion.div
      className="absolute"
      style={{ ...at(x, y), width: pctW(s), aspectRatio: "1", translate: "-50% -50%", zIndex: z ?? Math.round(y) }}
      initial={{ opacity: 0, scale: 0.3, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.3, y: 16, transition: { duration: 0.35 } }}
      transition={{ type: "spring", stiffness: 380, damping: 20 }}
      title={member.displayName}
    >
      <motion.div className="relative h-full w-full" style={{ isolation: "isolate" }} animate={animate} transition={transition}>
        {behind}
        <Face member={member} />
        {children}
      </motion.div>
    </motion.div>
  );
}

type CastState = { ids: string[]; queue: string[]; tick: number };

/**
 * Who's on stage: everyone, up to five. With more, one swaps out every few
 * seconds for whoever's waited longest, so all of them (up to ten) get a turn.
 */
export function useCast(members: Member[], every = 3600): Member[] {
  // (The scene is keyed by its line-up, so a different family starts fresh.)
  const init = (): CastState => ({
    ids: members.slice(0, MAX_CAST).map((m) => m.userId),
    queue: members.slice(MAX_CAST).map((m) => m.userId),
    tick: 0,
  });
  const [state, dispatch] = useReducer(
    (s: CastState): CastState => {
      if (!s.queue.length) return s;
      const slot = s.tick % s.ids.length;
      const ids = [...s.ids];
      const [incoming, ...rest] = s.queue;
      const outgoing = ids[slot];
      ids[slot] = incoming;
      return { ids, queue: [...rest, outgoing], tick: s.tick + 1 };
    },
    undefined,
    init,
  );

  useEffect(() => {
    if (members.length <= MAX_CAST) return;
    const t = window.setInterval(() => dispatch(), every);
    return () => window.clearInterval(t);
  }, [members.length, every]);

  const byId = new Map(members.map((m) => [m.userId, m]));
  return state.ids.map((id) => byId.get(id)).filter((m): m is Member => Boolean(m));
}

/** A looping beat for scenes that take turns (who gets abducted, who pulls the lever). */
export function useBeat(ms: number) {
  const [n, bump] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const t = window.setInterval(bump, ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return n;
}
