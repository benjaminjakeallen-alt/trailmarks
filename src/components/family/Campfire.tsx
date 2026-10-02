"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Avatar from "@/components/family/Avatar";
import type { Member } from "@/lib/types";

/**
 * Who's been to a state, as a little scene instead of a row of dots: their
 * adventurers sit round a campfire. One person roasts a marshmallow; two or
 * more toss it back and forth across the fire, and whoever catches it hops.
 * When the whole family has been, sparks go up.
 */

const SIZES = {
  map: { w: 136, h: 96, avatar: 30, fire: 26 },
  card: { w: 300, h: 150, avatar: 48, fire: 44 },
} as const;

type Variant = keyof typeof SIZES;

interface Seat {
  member: Member;
  x: number;
  y: number;
  scale: number;
}

function seats(members: Member[], variant: Variant): Seat[] {
  const { w, h } = SIZES[variant];
  const cx = w / 2;
  const cy = h * 0.6;
  const rx = w * 0.36;
  const ry = h * 0.25;
  const n = members.length;
  // Behind and beside the fire; with a crowd, the circle closes round the front too (leaving the fire visible).
  const angles =
    n === 1
      ? [200]
      : n <= 4
        ? members.map((_, i) => 180 + (180 * i) / (n - 1))
        : members.map((_, i) => 140 + (260 * i) / (n - 1));
  return members.map((member, i) => {
    const a = (angles[i] * Math.PI) / 180;
    const depth = Math.sin(a); // -1 back … 1 front
    return { member, x: cx + rx * Math.cos(a), y: cy + ry * depth, scale: 1 + depth * 0.12 };
  });
}

function Fire({ size, x, y, gold }: { size: number; x: number; y: number; gold: boolean }) {
  const reduce = useReducedMotion();
  const flicker = (delay: number) =>
    reduce
      ? {}
      : {
          animate: { scaleY: [1, 1.14, 0.94, 1.08, 1], scaleX: [1, 0.94, 1.04, 0.97, 1] },
          transition: { duration: 0.9, repeat: Infinity, delay, ease: "easeInOut" as const },
        };
  return (
    <div className="absolute" style={{ left: x - size / 2, top: y - size * 0.85, width: size, height: size }}>
      <div
        className="absolute rounded-full"
        style={{
          left: -size * 0.6,
          top: -size * 0.3,
          width: size * 2.2,
          height: size * 1.9,
          background: `radial-gradient(closest-side, ${gold ? "rgb(255 205 80 / 0.55)" : "rgb(255 150 60 / 0.42)"}, transparent)`,
        }}
      />
      <svg viewBox="0 0 40 40" className="absolute inset-0 overflow-visible">
        <g stroke="#5a3a1c" strokeWidth={4.5} strokeLinecap="round">
          <line x1={8} y1={36} x2={32} y2={30} />
          <line x1={8} y1={30} x2={32} y2={36} />
        </g>
        <motion.path
          d="M20 4 C27 13 31 18 30 25 C29 31 25 34 20 34 C15 34 11 31 10 25 C9.5 19 14 16 16 10 C18 15 19 16 20 17 C21 12 20 8 20 4 Z"
          fill="#f7632b"
          style={{ transformOrigin: "20px 34px" }}
          {...flicker(0)}
        />
        <motion.path
          d="M20 12 C25 18 27 22 26 27 C25 31 23 33 20 33 C17 33 14.5 31 14 27 C13.6 23 16 21 17.5 17 C19 20 19.5 20 20 21 C20.6 18 20.5 15 20 12 Z"
          fill="#ffb02e"
          style={{ transformOrigin: "20px 33px" }}
          {...flicker(0.2)}
        />
        <motion.path
          d="M20 20 C23 24 24 26 23.4 29 C23 31 21.6 32.4 20 32.4 C18.4 32.4 17 31 16.6 29 C16.3 27 18 25 20 20 Z"
          fill="#fff1b8"
          style={{ transformOrigin: "20px 32px" }}
          {...flicker(0.4)}
        />
      </svg>
      {!reduce &&
        [0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{ left: size * (0.35 + i * 0.14), top: size * 0.15, width: 3, height: 3, background: gold ? "#ffd75e" : "#ffb02e" }}
            animate={{ y: [0, -size * (0.7 + i * 0.2)], x: [0, (i - 1) * 6], opacity: [0, 1, 0] }}
            transition={{ duration: 1.4 + i * 0.3, repeat: Infinity, delay: i * 0.45, ease: "easeOut" }}
          />
        ))}
    </div>
  );
}

function Sparks({ w }: { w: number }) {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          className="absolute text-[#f5b929]"
          style={{ left: w * (0.18 + i * 0.16), top: 0, fontSize: 10 + (i % 2) * 4 }}
          animate={{ y: [8, -6, 8], opacity: [0, 1, 0], rotate: [0, 90, 180] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.35 }}
          aria-hidden
        >
          ✦
        </motion.span>
      ))}
    </>
  );
}

export default function Campfire({
  members,
  variant = "card",
  gold = false,
  dates,
  className = "",
}: {
  members: Member[];
  variant?: Variant;
  /** The whole family has been. */
  gold?: boolean;
  /** First-visit dates by user, shown when an adventurer is tapped (card only). */
  dates?: Record<string, string | null>;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const size = SIZES[variant];
  const placed = useMemo(() => seats(members, variant), [members, variant]);
  const fire = { x: size.w / 2, y: size.h * 0.6 };
  const [toss, setToss] = useState({ from: 0, to: 1, n: 0 });
  const [picked, setPicked] = useState<string | null>(null);
  const tossing = placed.length > 1 && !reduce;

  // Hot potato: whoever has the marshmallow throws it to someone else.
  useEffect(() => {
    if (!tossing) return;
    const id = window.setInterval(() => {
      setToss((t) => {
        const holder = t.to % placed.length;
        let next = Math.floor(Math.random() * (placed.length - 1));
        if (next >= holder) next++;
        return { from: holder, to: next, n: t.n + 1 };
      });
    }, 1250);
    return () => window.clearInterval(id);
  }, [tossing, placed.length]);

  if (!placed.length) return null;
  const from = placed[toss.from % placed.length];
  const to = placed[toss.to % placed.length];
  const hand = (s: Seat) => ({ x: s.x, y: s.y - (size.avatar * s.scale) / 2 - 4 });
  const pickedSeat = placed.find((s) => s.member.userId === picked);

  return (
    <div className={`relative ${className}`} style={{ width: size.w, height: size.h }}>
      {gold && !reduce && <Sparks w={size.w} />}
      {/* Back row first, so nearer adventurers overlap them. */}
      {[...placed]
        .sort((a, b) => a.y - b.y)
        .map((s, order) => {
          const d = size.avatar * s.scale;
          const idx = placed.indexOf(s);
          const catching = tossing && toss.to % placed.length === idx;
          const behindFire = s.y < fire.y;
          return (
            <motion.button
              key={s.member.userId}
              type="button"
              tabIndex={variant === "map" ? -1 : 0}
              onClick={() => setPicked((p) => (p === s.member.userId ? null : s.member.userId))}
              aria-label={s.member.displayName}
              className={`absolute rounded-full ${variant === "map" ? "pointer-events-none" : "cursor-pointer"}`}
              style={{ left: s.x - d / 2, top: s.y - d, width: d, height: d, zIndex: behindFire ? order : 20 + order }}
              animate={
                reduce
                  ? { y: 0 }
                  : catching
                    ? { y: [0, 0, -d * 0.28, 0], transition: { duration: 1.25, times: [0, 0.58, 0.72, 0.9] } }
                    : { y: [0, -1.5, 0], transition: { duration: 2.2 + idx * 0.3, repeat: Infinity } }
              }
            >
              {/* The pop-in lives on its own layer, so the hop and bob above never touch its scale. */}
              <motion.span
                className="block"
                initial={{ scale: 0, y: 12 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.05 * idx }}
              >
                <Avatar member={s.member} size={d} className="shadow-[0_4px_10px_-4px_rgb(0_0_0/0.45)] ring-2 ring-white" />
              </motion.span>
            </motion.button>
          );
        })}

      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 10 }}>
        <Fire size={size.fire} x={fire.x} y={fire.y} gold={gold} />
      </div>

      {/* One person: a marshmallow on a stick over the fire. Several: it flies between them. */}
      {placed.length === 1 && (
        <svg className="pointer-events-none absolute inset-0 overflow-visible" style={{ zIndex: 15 }} aria-hidden>
          <line
            x1={placed[0].x + size.avatar * 0.3}
            y1={placed[0].y - size.avatar * 0.35}
            x2={fire.x - 2}
            y2={fire.y - size.fire * 0.9}
            stroke="#7a5230"
            strokeWidth={variant === "map" ? 1.6 : 2.4}
            strokeLinecap="round"
          />
          <motion.rect
            x={fire.x - 6}
            y={fire.y - size.fire * 0.9 - 5}
            width={variant === "map" ? 7 : 10}
            height={variant === "map" ? 6 : 9}
            rx={2.5}
            animate={reduce ? {} : { fill: ["#fffaf0", "#f3d9a4", "#d9a35a", "#fffaf0"], y: [0, -1.5, 0, 0] }}
            fill="#fffaf0"
            stroke="#e6cfa3"
            transition={{ duration: 4, repeat: Infinity }}
          />
        </svg>
      )}
      {tossing && (
        <motion.span
          key={toss.n}
          className="pointer-events-none absolute rounded-[3px] bg-[#fffaf0] shadow-[0_0_6px_rgb(255_190_90/0.9)] ring-1 ring-[#e6cfa3]"
          style={{ left: 0, top: 0, width: variant === "map" ? 7 : 10, height: variant === "map" ? 6 : 9, zIndex: 30 }}
          initial={{ x: hand(from).x, y: hand(from).y, rotate: 0 }}
          animate={{
            x: [hand(from).x, (hand(from).x + hand(to).x) / 2, hand(to).x],
            y: [hand(from).y, Math.min(hand(from).y, hand(to).y) - size.h * 0.42, hand(to).y],
            rotate: 360,
          }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />
      )}

      <AnimatePresence>
        {pickedSeat && variant === "card" && (
          <motion.div
            key={pickedSeat.member.userId}
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4 }}
            className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap rounded-xl bg-fg px-2.5 py-1 text-[12px] font-semibold text-canvas shadow-[var(--shadow-float)]"
            style={{ left: pickedSeat.x, top: pickedSeat.y - size.avatar * pickedSeat.scale - 30, zIndex: 40 }}
          >
            {pickedSeat.member.displayName}
            {dates?.[pickedSeat.member.userId] && (
              <span className="ml-1 font-normal opacity-70">
                · since{" "}
                {new Date(`${dates[pickedSeat.member.userId]}T12:00:00`).toLocaleDateString(undefined, {
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
