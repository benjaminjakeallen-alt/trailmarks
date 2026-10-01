"use client";

import { createContext, useContext, useEffect, useId, useMemo, useReducer, type ReactNode } from "react";
import { motion, type TargetAndTransition, type Transition } from "framer-motion";
import { initials } from "@/components/family/Avatar";
import type { Member } from "@/lib/types";

/**
 * The state as a stage. On a quick tap the state lifts off the map and tips
 * back into a 3D slab (CSS 3D: a tilted plane with thickness and a shadow),
 * its surface painted for the activity, and the family stand on it as little
 * game pieces and act it out. Everything on the slab is placed in the
 * state's own shape: u/v are 0-1 across its bounding box, snapped inside.
 */

export const TILT = 54;
/** Most adventurers on stage at once; bigger families take turns. */
export const MAX_CAST = 5;

type Pt = { u: number; v: number };

interface StageInfo {
  /** Slab size in px. */
  w: number;
  h: number;
  /** A figure's head size in px. */
  s: number;
  /** Nearest point inside the state to (u, v). */
  place: (u: number, v: number) => Pt;
}

const StageContext = createContext<StageInfo>({ w: 300, h: 200, s: 30, place: (u, v) => ({ u, v }) });
export const useStage = () => useContext(StageContext);

/** n spots in a row through the middle of the state, each snapped inside it. */
export function useRow(n: number, v = 0.6, spread = 0.62): Pt[] {
  const { place } = useStage();
  if (n <= 1) return [place(0.5, v)];
  return Array.from({ length: n }, (_, i) => place(0.5 - spread / 2 + (spread * i) / (n - 1), v));
}

/** n spots round a ring (the campfire circle), snapped inside. */
export function useRing(n: number, cu = 0.5, cv = 0.55, ru = 0.26, rv = 0.24): Pt[] {
  const { place } = useStage();
  return Array.from({ length: n }, (_, i) => {
    const a = Math.PI * 0.5 + (i / n) * Math.PI * 2;
    return place(cu + Math.cos(a) * ru, cv + Math.sin(a) * rv);
  });
}

/** Lies flat on the surface (a rug, a road, a puddle of light). */
export function Flat({ u, v, w, h, children }: Pt & { w: number; h: number; children: ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute"
      style={{ left: `${u * 100}%`, top: `${v * 100}%`, width: w, height: h, transform: "translate(-50%, -50%) translateZ(0.5px)" }}
    >
      {children}
    </div>
  );
}

/**
 * Stands up on the surface: its bottom edge sits at (u, v) and it rotates up
 * to face you. `lift` raises it off the ground (things in the sky).
 */
export function Stand({
  u,
  v,
  w,
  lift = 0,
  children,
  animate,
  transition,
}: Pt & { w: number; lift?: number; children: ReactNode; animate?: TargetAndTransition; transition?: Transition }) {
  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: `${u * 100}%`,
        top: `${v * 100}%`,
        width: w,
        transform: `translate(-50%, -100%) translateZ(${lift}px) rotateX(-${TILT}deg)`,
        transformOrigin: "50% 100%",
        transformStyle: "preserve-3d",
      }}
    >
      <motion.div className="relative" style={{ transformOrigin: "50% 100%" }} animate={animate} transition={transition}>
        {children}
      </motion.div>
    </div>
  );
}

/** A face: the adventurer avatar, or initials on their color. */
export function Head({ member, size }: { member: Member; size: number }) {
  if (member.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- tiny stored avatar
      <img
        src={member.avatarUrl}
        alt={member.displayName}
        draggable={false}
        className="block rounded-full object-cover shadow-[0_2px_5px_rgb(0_0_0/0.35)] ring-2 ring-white"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <svg viewBox="0 0 100 100" style={{ width: size, height: size }} className="block drop-shadow" role="img" aria-label={member.displayName}>
      <circle cx="50" cy="50" r="46" fill={member.color} stroke="#fff" strokeWidth="7" />
      <text x="50" y="52" textAnchor="middle" dominantBaseline="central" fontSize="40" fontWeight="700" fill="#fff">
        {initials(member.displayName)}
      </text>
    </svg>
  );
}

/** Something a figure holds or wears: x/y/w in percent of the figure's box. */
export function Held({
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
      style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, translate: "-50% -50%", transformOrigin: origin, zIndex: behind ? 0 : 3 }}
      animate={animate}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}

/** An emoji prop sized in px. */
export function Emo({ e, px }: { e: string; px: number }) {
  return (
    <span className="block select-none text-center leading-none" style={{ fontSize: px }} aria-hidden>
      {e}
    </span>
  );
}

/**
 * A family member as a little game piece: their avatar for a head on a body
 * in their color, standing at (u, v). `animate` is their part in the scene;
 * `children` are what they hold or wear (positioned with <Held>).
 */
export function Figure({
  member,
  u,
  v,
  scale = 1,
  lift = 0,
  animate,
  transition,
  children,
  body = true,
}: Pt & {
  member: Member;
  scale?: number;
  lift?: number;
  animate?: TargetAndTransition;
  transition?: Transition;
  children?: ReactNode;
  body?: boolean;
}) {
  const { s } = useStage();
  const head = s * scale;
  const w = head * 1.25;
  // The head sits down into the shoulders, like a game piece.
  const h = body ? head * 1.5 : head;
  return (
    <>
      {lift === 0 && (
        <Flat u={u} v={v} w={head * 1.1} h={head * 0.55}>
          <div className="h-full w-full rounded-[50%] bg-black/30 blur-[2px]" />
        </Flat>
      )}
      <Stand u={u} v={v} w={w} lift={lift}>
        <motion.div
          className="relative"
          style={{ width: w, height: h, transformOrigin: "50% 100%" }}
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          exit={{ scaleY: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.35 }}
          title={member.displayName}
        >
          <motion.div className="absolute inset-0" style={{ transformOrigin: "50% 100%" }} animate={animate} transition={transition}>
            {body && (
              <svg viewBox="0 0 50 40" className="absolute bottom-0 left-1/2 -translate-x-1/2" style={{ width: head * 0.95, height: head * 0.95, zIndex: 1 }} aria-hidden>
                <path d="M8 40 Q6 14 25 10 Q44 14 42 40Z" fill={member.color} stroke="rgb(0 0 0 / 0.18)" strokeWidth="1.5" />
                <ellipse cx="25" cy="14" rx="9" ry="3" fill="rgb(255 255 255 / 0.25)" />
              </svg>
            )}
            <div className="absolute left-1/2 top-0 -translate-x-1/2" style={{ zIndex: 2 }}>
              <Head member={member} size={head} />
            </div>
            {children}
          </motion.div>
        </motion.div>
      </Stand>
    </>
  );
}

/** A tiny canvas, shared, just for asking "is this point inside the state?". */
let probeCtx: CanvasRenderingContext2D | null = null;
function getProbe() {
  if (!probeCtx && typeof document !== "undefined") probeCtx = document.createElement("canvas").getContext("2d");
  return probeCtx;
}

/**
 * The slab itself. `ground` paints the surface (drawn in a 0-100 box,
 * stretched over the state and clipped to it); `edge` is the slab's side color.
 */
export function Slab({
  d,
  bounds,
  centroid,
  w,
  h,
  ground,
  edge,
  children,
}: {
  d: string;
  bounds: [[number, number], [number, number]];
  centroid: [number, number];
  w: number;
  h: number;
  ground: ReactNode;
  edge: string;
  children: ReactNode;
}) {
  const clipId = `slab-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [[x0, y0], [x1, y1]] = bounds;
  const bw = x1 - x0;
  const bh = y1 - y0;
  const s = Math.max(22, Math.min(38, Math.sqrt(w * h) * 0.13));

  const place = useMemo(() => {
    const path = typeof Path2D !== "undefined" ? new Path2D(d) : null;
    const probe = getProbe();
    const inside = (x: number, y: number) => {
      if (!path || !probe) return true;
      // A little margin, so figures don't stand on the very edge.
      const m = Math.min(bw, bh) * 0.04;
      return [
        [0, 0],
        [m, 0],
        [-m, 0],
        [0, m],
        [0, -m],
      ].every(([dx, dy]) => probe.isPointInPath(path, x + dx, y + dy));
    };
    return (u: number, v: number): Pt => {
      const x = x0 + u * bw;
      const y = y0 + v * bh;
      for (let t = 0; t <= 1; t += 0.1) {
        const px = x + (centroid[0] - x) * t;
        const py = y + (centroid[1] - y) * t;
        if (inside(px, py)) return { u: (px - x0) / bw, v: (py - y0) / bh };
      }
      return { u: (centroid[0] - x0) / bw, v: (centroid[1] - y0) / bh };
    };
  }, [d, x0, y0, bw, bh, centroid]);

  const viewBox = `${x0} ${y0} ${bw} ${bh}`;
  const layer = (z: number, fill: string, extra?: string) => (
    <svg
      key={`layer${z}`}
      viewBox={viewBox}
      preserveAspectRatio="none"
      className={`absolute inset-0 h-full w-full overflow-visible ${extra ?? ""}`}
      style={{ transform: `translateZ(${z}px)` }}
      aria-hidden
    >
      <path d={d} fill={fill} />
    </svg>
  );

  return (
    <StageContext.Provider value={{ w, h, s, place }}>
      <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
        {/* Shadow on the map below, then the slab's sides, then the painted top. */}
        {layer(-22, "rgb(5 30 34 / 0.35)", "blur-[6px]")}
        {[-10, -8, -6, -4, -2].map((z) => layer(z, edge))}
        <svg viewBox={viewBox} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          <defs>
            <clipPath id={clipId}>
              <path d={d} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            <svg x={x0} y={y0} width={bw} height={bh} viewBox="0 0 100 100" preserveAspectRatio="none" overflow="visible">
              {ground}
            </svg>
          </g>
          <path d={d} fill="none" stroke="rgb(255 255 255 / 0.85)" strokeWidth={Math.max(bw, bh) / 160} vectorEffect="non-scaling-stroke" />
        </svg>
        {children}
      </div>
    </StageContext.Provider>
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
