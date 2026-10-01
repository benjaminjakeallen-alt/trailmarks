"use client";

import type { ComponentType, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Emo, Figure, Flat, Held, Stand, useBeat, useRing, useRow, useStage } from "@/components/scenes/diorama";
import type { Member } from "@/lib/types";

export interface PlayProps {
  cast: Member[];
}

export interface Diorama {
  title: string;
  /** The slab's sides. */
  edge: string;
  /** The surface, drawn in a 0-100 box stretched over the state. */
  ground: ReactNode;
  Play: ComponentType<PlayProps>;
}

const loop = (duration: number, delay = 0) => ({ duration, delay, repeat: Infinity, ease: "easeInOut" as const });

/** Moves its contents across the surface through spots (in u/v), looping. */
function Mover({
  from,
  path,
  duration,
  delay = 0,
  children,
}: {
  from: { u: number; v: number };
  path: { u: number; v: number }[];
  duration: number;
  delay?: number;
  children: ReactNode;
}) {
  const { w, h } = useStage();
  return (
    <motion.div
      className="pointer-events-none absolute inset-0"
      style={{ transformStyle: "preserve-3d" }}
      animate={{ x: path.map((p) => (p.u - from.u) * w), y: path.map((p) => (p.v - from.v) * h) }}
      transition={{ duration, delay, repeat: Infinity, ease: "linear" }}
    >
      {children}
    </motion.div>
  );
}

/* ---------- Utah: 44 oz sodas in the lawn chairs ---------- */

function UtahPlay({ cast }: PlayProps) {
  const { s, place } = useStage();
  const seats = useRow(cast.length, 0.62);
  const arch = place(0.28, 0.28);
  return (
    <>
      <Stand u={arch.u} v={arch.v} w={s * 2.2}>
        <svg viewBox="0 0 60 50">
          <path d="M4 50 V24 Q4 4 30 4 Q56 4 56 24 V50 H46 V26 Q46 14 30 14 Q14 14 14 26 V50Z" fill="#c4542a" />
          <path d="M4 50 V24 Q4 4 30 4" stroke="#8f3417" strokeWidth="2" fill="none" />
        </svg>
      </Stand>
      <AnimatePresence>
        {cast.map((m, i) => (
          <Figure key={m.userId} member={m} u={seats[i].u} v={seats[i].v} animate={{ rotate: [0, -3, 0, 3, 0] }} transition={loop(5, i * 0.4)}>
            <Held x={50} y={80} w={150} behind>
              <svg viewBox="0 0 60 44">
                <rect x="6" y="0" width="48" height="24" rx="3" fill="#1fa7a1" />
                {[12, 22, 32, 42].map((x) => (
                  <rect key={x} x={x} y="0" width="5" height="24" fill="#fff" opacity="0.85" />
                ))}
                <rect x="4" y="24" width="52" height="8" rx="3" fill="#178d88" />
                <path d="M8 32 L4 44 M52 32 L56 44" stroke="#9aa5a8" strokeWidth="2.4" />
              </svg>
            </Held>
            <Held x={98} y={58} w={44} origin="40% 100%" animate={{ rotate: [0, 0, -38, -38, 0], y: [0, 0, -5, -5, 0] }} transition={loop(3.2, i * 0.7)}>
              <svg viewBox="0 0 30 46">
                <path d="M17 2 L21 -8" stroke="#ff4d6d" strokeWidth="2.5" strokeLinecap="round" />
                <rect x="3" y="4" width="24" height="5" rx="2" fill="#f2f2f2" />
                <path d="M4 9 H26 L23 44 H7Z" fill="#e63946" />
                <rect x="5" y="20" width="20" height="10" fill="#fff" />
                <text x="15" y="28.5" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#e63946">44</text>
              </svg>
            </Held>
          </Figure>
        ))}
      </AnimatePresence>
    </>
  );
}

/* ---------- California: mouse ears + fireworks, or surfing ---------- */

function Burst({ color, delay }: { color: string; delay: number }) {
  return (
    <svg viewBox="-20 -20 40 40" className="overflow-visible">
      <g opacity="0">
        <animateTransform attributeName="transform" type="scale" values="0;1;1.15" keyTimes="0;0.5;1" dur="3s" begin={`${delay}s`} repeatCount="indefinite" />
        <animate attributeName="opacity" values="0;1;0;0" keyTimes="0;0.25;0.5;1" dur="3s" begin={`${delay}s`} repeatCount="indefinite" />
        {Array.from({ length: 12 }, (_, k) => {
          const a = (k / 12) * Math.PI * 2;
          return (
            <line
              key={k}
              x1={(Math.cos(a) * 4).toFixed(2)}
              y1={(Math.sin(a) * 4).toFixed(2)}
              x2={(Math.cos(a) * 17).toFixed(2)}
              y2={(Math.sin(a) * 17).toFixed(2)}
              stroke={color}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          );
        })}
      </g>
    </svg>
  );
}

function CaliforniaFireworksPlay({ cast }: PlayProps) {
  const { s, place } = useStage();
  const spots = useRow(cast.length, 0.68, 0.5);
  const castle = place(0.5, 0.36);
  return (
    <>
      <Stand u={castle.u} v={castle.v} w={s * 2.4}>
        <svg viewBox="0 0 80 64">
          <g fill="#f3e9ff">
            <rect x="18" y="30" width="44" height="34" />
            <rect x="32" y="16" width="16" height="22" />
            <rect x="10" y="24" width="10" height="40" />
            <rect x="60" y="24" width="10" height="40" />
          </g>
          <path d="M30 18 L40 0 L50 18Z M8 26 L15 12 L22 26Z M58 26 L65 12 L72 26Z" fill="#7aa6ff" />
          <path d="M34 64 V52 Q40 44 46 52 V64Z" fill="#3b2a73" />
        </svg>
      </Stand>
      {[
        { u: castle.u - 0.22, c: "#ff6b9a", d: 0 },
        { u: castle.u + 0.2, c: "#ffd54a", d: 1 },
        { u: castle.u, c: "#7ee8fa", d: 2 },
      ].map((b) => (
        <Stand key={b.d} u={b.u} v={castle.v} w={s * 1.6} lift={s * 2.6}>
          <Burst color={b.c} delay={b.d} />
        </Stand>
      ))}
      <AnimatePresence>
        {cast.map((m, i) => (
          <Figure key={m.userId} member={m} u={spots[i].u} v={spots[i].v} animate={{ y: [0, 0, -5, 0], rotate: [0, -4, 4, 0] }} transition={loop(1.7, i * 0.25)}>
            <Held x={18} y={4} w={38} behind>
              <svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#111" /></svg>
            </Held>
            <Held x={82} y={4} w={38} behind>
              <svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#111" /></svg>
            </Held>
          </Figure>
        ))}
      </AnimatePresence>
    </>
  );
}

function CaliforniaSurfPlay({ cast }: PlayProps) {
  const spots = useRow(cast.length, 0.55, 0.55);
  return (
    <AnimatePresence>
      {cast.map((m, i) => (
        <Figure
          key={m.userId}
          member={m}
          u={spots[i].u}
          v={spots[i].v}
          animate={{ y: [0, -8, 0, 3, 0], x: [0, 5, 0, -5, 0], rotate: [0, -8, 0, 6, 0] }}
          transition={loop(2.6, i * 0.45)}
        >
          <Held x={50} y={96} w={150}>
            <svg viewBox="0 0 60 14">
              <ellipse cx="30" cy="7" rx="29" ry="5.5" fill={["#ffd23f", "#ff6b9a", "#fff", "#7ee8fa", "#b8f27c"][i % 5]} stroke="#123" strokeWidth="1.2" />
            </svg>
          </Held>
        </Figure>
      ))}
    </AnimatePresence>
  );
}

/* ---------- Oregon: Tillamook ice cream ---------- */

function OregonPlay({ cast }: PlayProps) {
  const { s, place } = useStage();
  const spots = useRow(cast.length, 0.64);
  const barn = place(0.3, 0.3);
  const sign = place(0.72, 0.32);
  return (
    <>
      <Stand u={barn.u} v={barn.v} w={s * 1.6}>
        <svg viewBox="0 0 40 36">
          <path d="M0 16 L20 2 L40 16Z" fill="#922b21" />
          <rect x="3" y="16" width="34" height="20" fill="#c0392b" />
          <rect x="15" y="22" width="10" height="14" fill="#fff" />
        </svg>
      </Stand>
      <Stand u={sign.u} v={sign.v} w={s * 2}>
        <svg viewBox="0 0 64 30">
          <rect width="64" height="16" rx="3" fill="#fff" stroke="#1d4e89" strokeWidth="1.5" />
          <text x="32" y="11.5" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#1d4e89">TILLAMOOK</text>
          <rect x="30" y="16" width="4" height="14" fill="#8a6a4a" />
        </svg>
      </Stand>
      <AnimatePresence>
        {cast.map((m, i) => (
          <Figure key={m.userId} member={m} u={spots[i].u} v={spots[i].v} animate={{ y: [0, -2, 0] }} transition={loop(2, i * 0.3)}>
            <Held x={92} y={52} w={55} origin="50% 100%" animate={{ rotate: [10, 10, -30, 10], x: [0, 0, -5, 0] }} transition={loop(2.4, i * 0.5)}>
              <Emo e="🍦" px={s * 0.7} />
            </Held>
          </Figure>
        ))}
      </AnimatePresence>
    </>
  );
}

/* ---------- Nevada: the slots ---------- */

function NevadaPlay({ cast }: PlayProps) {
  const { s, place } = useStage();
  const beat = useBeat(1700);
  const jackpot = beat % 3 === 2;
  const reels = ["🍒", "🔔", "🍋", "⭐", "7️⃣"];
  const machine = place(0.5, 0.36);
  const playerSpot = place(0.5, 0.52);
  const watchers = cast.slice(1);
  const wspots = useRow(watchers.length, 0.72, 0.6);
  const player = cast[0];
  return (
    <>
      <Stand u={machine.u} v={machine.v} w={s * 1.7}>
        <div className="relative">
          <svg viewBox="0 0 60 80">
            <rect x="4" y="10" width="44" height="66" rx="7" fill="#d9a400" stroke="#8a6500" strokeWidth="2.5" />
            <rect x="8" y="2" width="36" height="12" rx="4" fill="#ff3b6b" />
            <text x="26" y="10.5" textAnchor="middle" fontSize="7" fontWeight="800" fill="#fff">{jackpot ? "JACKPOT" : "SLOTS"}</text>
            <rect x="9" y="22" width="34" height="18" rx="3" fill="#fff" />
            <rect x="12" y="50" width="28" height="14" rx="2" fill="#8a6500" />
            <g>
              <animateTransform attributeName="transform" type="rotate" values="0 52 40;0 52 40;55 52 40;0 52 40;0 52 40" keyTimes="0;0.05;0.25;0.5;1" dur="1.7s" repeatCount="indefinite" />
              <line x1="52" y1="40" x2="52" y2="20" stroke="#bbb" strokeWidth="3.5" strokeLinecap="round" />
              <circle cx="52" cy="18" r="5" fill="#ff3b6b" />
            </g>
          </svg>
          <div className="absolute flex justify-around" style={{ left: "15%", top: "29%", width: "57%" }}>
            {[0, 1, 2].map((k) => (
              <motion.span key={`${beat}-${k}`} initial={{ y: -4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: k * 0.12 }}>
                <Emo e={jackpot ? "7️⃣" : reels[(beat * 3 + k * 2) % reels.length]} px={s * 0.32} />
              </motion.span>
            ))}
          </div>
        </div>
      </Stand>
      <AnimatePresence>
        {player && <Figure key={player.userId} member={player} u={playerSpot.u} v={playerSpot.v} animate={{ x: [0, 2, 0] }} transition={loop(1.7)} />}
        {watchers.map((m, i) => (
          <Figure
            key={m.userId}
            member={m}
            u={wspots[i].u}
            v={wspots[i].v}
            animate={jackpot ? { y: [0, -14, 0, -7, 0] } : { y: [0, -1, 0] }}
            transition={jackpot ? { duration: 0.9 } : loop(2, i * 0.3)}
          />
        ))}
      </AnimatePresence>
      {jackpot &&
        [0, 1, 2, 3, 4, 5].map((k) => (
          <Stand key={`${beat}-c${k}`} u={machine.u} v={machine.v + 0.02} w={s * 0.4} lift={s}>
            <motion.div initial={{ x: 0, y: 0, opacity: 1 }} animate={{ x: (k - 2.5) * s * 0.4, y: [0, -s * 1.4, s * 0.6], opacity: [1, 1, 0] }} transition={{ duration: 1.1 }}>
              <Emo e="🪙" px={s * 0.35} />
            </motion.div>
          </Stand>
        ))}
    </>
  );
}

/* ---------- Arizona: through the cliff dwellings ---------- */

function ArizonaPlay({ cast }: PlayProps) {
  const { s, place } = useStage();
  const cliff = place(0.5, 0.42);
  const W = s * 4.2;
  // Up the ladder, along the ledge, in one doorway and out another, back down (in the cliff's own 0-100 box).
  const route = { left: [8, 30, 30, 42, 55, 55, 70, 86, 86, 8], top: [86, 86, 46, 40, 40, 40, 40, 40, 86, 86], opacity: [1, 1, 1, 1, 1, 0, 1, 1, 1, 1] };
  return (
    <Stand u={cliff.u} v={cliff.v} w={W}>
      <div className="relative" style={{ width: W, height: W * 0.62 }}>
        <svg viewBox="0 0 100 62" className="absolute inset-0 h-full w-full">
          <path d="M0 62 V14 Q50 0 100 14 V62Z" fill="#b5532a" />
          <path d="M14 34 Q50 4 88 34Z" fill="#6b2a14" opacity="0.6" />
          <rect x="30" y="20" width="18" height="14" fill="#d98c5f" />
          <rect x="47" y="24" width="15" height="10" fill="#e3a073" />
          <rect x="62" y="18" width="17" height="16" fill="#d98c5f" />
          <rect x="36" y="25" width="4" height="7" fill="#3b1608" />
          <rect x="53" y="27" width="4" height="7" fill="#3b1608" />
          <rect x="68" y="23" width="4" height="7" fill="#3b1608" />
          <rect x="14" y="34" width="74" height="3" fill="#8c3d1c" />
          <g stroke="#7a4a1e" strokeWidth="1.4">
            <line x1="26" y1="35" x2="26" y2="62" />
            <line x1="33" y1="35" x2="33" y2="62" />
            {[40, 46, 52, 58].map((y) => (
              <line key={y} x1="26" y1={y} x2="33" y2={y} />
            ))}
          </g>
        </svg>
        <AnimatePresence>
          {cast.map((m, i) => (
            <motion.div
              key={m.userId}
              className="absolute"
              style={{ translate: "-50% -100%" }}
              initial={{ opacity: 0 }}
              animate={{ left: route.left.map((x) => `${x}%`), top: route.top.map((y) => `${y}%`), opacity: route.opacity }}
              exit={{ opacity: 0 }}
              transition={{ duration: 9, delay: i * 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <Figurine member={m} size={s * 0.62} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Stand>
  );
}

/** A small standing figure drawn inside a set piece (the cliff, the pickup). */
function Figurine({ member, size }: { member: Member; size: number }) {
  return (
    <div className="relative" style={{ width: size * 1.2, height: size * 1.7 }}>
      <svg viewBox="0 0 50 40" className="absolute bottom-0 left-1/2 -translate-x-1/2" style={{ width: size * 0.95, height: size * 0.85 }} aria-hidden>
        <path d="M8 40 Q6 14 25 10 Q44 14 42 40Z" fill={member.color} />
      </svg>
      <div className="absolute left-1/2 top-0 -translate-x-1/2">
        <HeadSmall member={member} size={size} />
      </div>
    </div>
  );
}

function HeadSmall({ member, size }: { member: Member; size: number }) {
  return member.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- tiny stored avatar
    <img src={member.avatarUrl} alt={member.displayName} className="block rounded-full object-cover ring-[1.5px] ring-white" style={{ width: size, height: size }} />
  ) : (
    <span
      className="flex items-center justify-center rounded-full font-bold text-white ring-[1.5px] ring-white"
      style={{ width: size, height: size, background: member.color, fontSize: size * 0.42 }}
    >
      {member.displayName.slice(0, 1).toUpperCase()}
    </span>
  );
}

/* ---------- New Mexico: somebody's getting abducted ---------- */

function NewMexicoPlay({ cast }: PlayProps) {
  const { s, place } = useStage();
  const beat = useBeat(4200);
  const spots = useRow(cast.length, 0.6, 0.6);
  const taken = cast.length ? beat % cast.length : -1;
  const target = spots[taken] ?? place(0.5, 0.6);
  const cacti = [place(0.15, 0.3), place(0.85, 0.75)];
  return (
    <>
      {cacti.map((c, k) => (
        <Stand key={k} u={c.u} v={c.v} w={s * 0.7}>
          <svg viewBox="0 0 20 34">
            <rect x="8" y="2" width="5" height="32" rx="2.5" fill="#2f6b3a" />
            <rect x="2" y="10" width="4" height="12" rx="2" fill="#2f6b3a" />
            <rect x="3" y="20" width="7" height="3" fill="#2f6b3a" />
            <rect x="15" y="8" width="4" height="10" rx="2" fill="#2f6b3a" />
            <rect x="11" y="16" width="7" height="3" fill="#2f6b3a" />
          </svg>
        </Stand>
      ))}
      {/* The saucer drifts to whoever's next, and beams them up */}
      <div className="pointer-events-none absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
        <Stand u={target.u} v={target.v} w={s * 1.4} lift={0}>
          <motion.svg
            viewBox="0 0 40 100"
            style={{ width: s * 1.4, height: s * 3.5 }}
            animate={{ opacity: [0, 0, 0.9, 0.9, 0] }}
            transition={{ duration: 4.2, times: [0, 0.15, 0.25, 0.8, 0.95], repeat: Infinity }}
          >
            <defs>
              <linearGradient id="nm-beam" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#b8ff8a" stopOpacity="0.9" />
                <stop offset="1" stopColor="#b8ff8a" stopOpacity="0.15" />
              </linearGradient>
            </defs>
            <path d="M14 0 H26 L40 100 H0Z" fill="url(#nm-beam)" />
          </motion.svg>
        </Stand>
        <Stand u={target.u} v={target.v} w={s * 2} lift={s * 3.2} animate={{ y: [0, -3, 0] }} transition={loop(1.4)}>
          <svg viewBox="0 0 60 28">
            <ellipse cx="30" cy="10" rx="11" ry="9" fill="#9be7ff" opacity="0.9" />
            <ellipse cx="30" cy="18" rx="29" ry="8" fill="#a7b3c2" />
            {[12, 24, 36, 48].map((x, k) => (
              <circle key={x} cx={x} cy="19" r="2" fill="#ffd54a">
                <animate attributeName="opacity" values="1;0.2;1" dur="0.6s" begin={`${k * 0.15}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </svg>
        </Stand>
      </div>
      <AnimatePresence>
        {cast.map((m, i) =>
          i === taken ? (
            <Figure
              key={`${m.userId}-${beat}`}
              member={m}
              u={spots[i].u}
              v={spots[i].v}
              animate={{ y: [0, 0, -s * 2.6, -s * 2.6, 0], rotate: [0, 0, 360, 360, 360], scale: [1, 1, 0.7, 0.7, 1] }}
              transition={{ duration: 4.2, times: [0, 0.2, 0.5, 0.7, 1] }}
            />
          ) : (
            <Figure key={m.userId} member={m} u={spots[i].u} v={spots[i].v} animate={{ rotate: [0, -10, 10, -10, 0] }} transition={loop(0.9, i * 0.1)}>
              <Held x={50} y={-18} w={50}>
                <Emo e="❗" px={s * 0.35} />
              </Held>
            </Figure>
          ),
        )}
      </AnimatePresence>
    </>
  );
}

/* ---------- Idaho: dig 'em up, bake 'em ---------- */

function IdahoPlay({ cast }: PlayProps) {
  const { s, place } = useStage();
  const spots = useRow(cast.length, 0.66, 0.55);
  const oven = place(0.5, 0.3);
  return (
    <>
      <Stand u={oven.u} v={oven.v} w={s * 1.5}>
        <div className="relative">
          <svg viewBox="0 0 56 54">
            <rect width="56" height="54" rx="6" fill="#4a4f57" />
            <rect x="6" y="14" width="44" height="30" rx="4" fill="#ff9d3b" />
            <rect x="6" y="4" width="44" height="6" rx="2" fill="#2d3136" />
          </svg>
          <div className="absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2">
            <Emo e="🥔" px={s * 0.5} />
          </div>
          <motion.div className="absolute left-[40%] top-[-30%]" animate={{ y: [0, -10], opacity: [0, 0.8, 0] }} transition={{ duration: 1.8, repeat: Infinity }}>
            <Emo e="💨" px={s * 0.4} />
          </motion.div>
        </div>
      </Stand>
      <AnimatePresence>
        {cast.map((m, i) => (
          <Figure key={m.userId} member={m} u={spots[i].u} v={spots[i].v} animate={{ y: [0, 3, 0] }} transition={loop(1.2, i * 0.3)}>
            <Held x={100} y={70} w={50} origin="20% 20%" animate={{ rotate: [0, 30, 0] }} transition={loop(1.2, i * 0.3)}>
              <svg viewBox="0 0 20 40">
                <line x1="4" y1="2" x2="14" y2="28" stroke="#8a5a2b" strokeWidth="3" strokeLinecap="round" />
                <path d="M9 26 L20 24 L18 38 L10 36Z" fill="#9aa5a8" />
              </svg>
            </Held>
            <Held x={120} y={95} w={40} animate={{ y: [0, 0, -s * 0.9, 0], x: [0, 0, s * 0.4, s * 0.7], opacity: [0, 0, 1, 0] }} transition={{ duration: 2.4, delay: i * 0.5, repeat: Infinity }}>
              <Emo e="🥔" px={s * 0.36} />
            </Held>
          </Figure>
        ))}
      </AnimatePresence>
    </>
  );
}

/* ---------- Texas: brisket on the smoker ---------- */

function TexasPlay({ cast }: PlayProps) {
  const { s, place } = useStage();
  const spots = useRow(cast.length, 0.66, 0.58);
  const smoker = place(0.32, 0.32);
  return (
    <>
      <Stand u={smoker.u} v={smoker.v} w={s * 2.4}>
        <div className="relative">
          <svg viewBox="0 0 92 64">
            <rect x="0" y="22" width="70" height="30" rx="15" fill="#222" />
            <rect x="66" y="32" width="24" height="20" rx="3" fill="#333" />
            <rect x="10" y="0" width="8" height="30" fill="#2a2a2a" />
            <line x1="8" y1="52" x2="4" y2="64" stroke="#222" strokeWidth="3" />
            <line x1="62" y1="52" x2="66" y2="64" stroke="#222" strokeWidth="3" />
            <circle cx="78" cy="42" r="3" fill="#ff7a2f" />
          </svg>
          {[0, 1, 2].map((k) => (
            <motion.span
              key={k}
              className="absolute block rounded-full bg-[#e6e6e6]"
              style={{ left: "11%", top: "-4%", width: s * 0.4, height: s * 0.4 }}
              animate={{ y: [0, -s * 1.6], scale: [0.6, 2], opacity: [0.85, 0] }}
              transition={{ duration: 2.6, delay: k * 0.85, repeat: Infinity, ease: "easeOut" }}
            />
          ))}
        </div>
      </Stand>
      <AnimatePresence>
        {cast.map((m, i) => (
          <Figure key={m.userId} member={m} u={spots[i].u} v={spots[i].v} animate={{ y: [0, -2, 0] }} transition={loop(1.8, i * 0.3)}>
            <Held x={50} y={-2} w={120}>
              <svg viewBox="0 0 60 24">
                <path d="M2 18 Q30 28 58 18 Q52 14 44 16 L40 4 Q30 0 20 4 L16 16 Q8 14 2 18Z" fill="#8b5a2b" stroke="#5a3a1a" strokeWidth="1.2" />
                <rect x="17" y="12" width="26" height="3" fill="#5a3a1a" />
              </svg>
            </Held>
            <Held x={96} y={58} w={50} origin="30% 80%" animate={{ rotate: [0, 0, -35, 0], y: [0, 0, -4, 0] }} transition={loop(2.6, i * 0.6)}>
              <Emo e="🍖" px={s * 0.5} />
            </Held>
          </Figure>
        ))}
      </AnimatePresence>
    </>
  );
}

/* ---------- Florida: tank tops on, run ---------- */

function FloridaPlay({ cast }: PlayProps) {
  const { s, place } = useStage();
  const loopPts = useRing(8, 0.62, 0.5, 0.24, 0.3);
  const path = [...loopPts, loopPts[0]];
  const palms = [place(0.2, 0.2), place(0.8, 0.85)];
  return (
    <>
      {palms.map((p, k) => (
        <Stand key={k} u={p.u} v={p.v} w={s * 1.3}>
          <svg viewBox="0 0 40 56">
            <path d="M20 56 Q24 30 18 12" stroke="#8b5a2b" strokeWidth="3.5" fill="none" />
            {[-60, -20, 20, 60, 100].map((a) => (
              <ellipse key={a} cx="18" cy="12" rx="15" ry="4" fill="#2e9e4f" transform={`rotate(${a} 18 12) translate(11 0)`} />
            ))}
          </svg>
        </Stand>
      ))}
      <AnimatePresence>
        {cast.map((m, i) => (
          <Mover key={m.userId} from={path[0]} path={path} duration={7} delay={-i * 0.55}>
            <Figure member={m} u={path[0].u} v={path[0].v} animate={{ y: [0, -5, 0], rotate: [-8, 8, -8] }} transition={loop(0.45, i * 0.1)}>
              <Held x={50} y={82} w={80}>
                <svg viewBox="0 0 30 22">
                  <path d="M6 0 H10 Q15 6 20 0 H24 L27 22 H3Z" fill={["#ff6b9a", "#ffd23f", "#7ee8fa", "#b8f27c", "#fff"][i % 5]} stroke="#123" strokeWidth="0.8" />
                </svg>
              </Held>
            </Figure>
          </Mover>
        ))}
      </AnimatePresence>
      <Mover from={path[0]} path={path} duration={7} delay={-cast.length * 0.55 - 0.6}>
        <Stand u={path[0].u} v={path[0].v} w={s * 1.9}>
          <motion.svg viewBox="0 0 80 36" animate={{ y: [0, -1.5, 0] }} transition={loop(0.3)}>
            <rect x="4" y="14" width="72" height="14" rx="4" fill="#fff" stroke="#111" strokeWidth="1.5" />
            <path d="M18 14 L26 4 H54 L62 14Z" fill="#fff" stroke="#111" strokeWidth="1.5" />
            <rect x="4" y="18" width="72" height="5" fill="#111" />
            <text x="40" y="22.4" textAnchor="middle" fontSize="5" fontWeight="800" fill="#fff">POLICE</text>
            <rect x="34" y="0" width="6" height="4" fill="#ff2d2d">
              <animate attributeName="opacity" values="1;0.2;1" dur="0.4s" repeatCount="indefinite" />
            </rect>
            <rect x="40" y="0" width="6" height="4" fill="#2d6bff">
              <animate attributeName="opacity" values="0.2;1;0.2" dur="0.4s" repeatCount="indefinite" />
            </rect>
            <circle cx="20" cy="29" r="6" fill="#111" />
            <circle cx="60" cy="29" r="6" fill="#111" />
          </motion.svg>
        </Stand>
      </Mover>
    </>
  );
}

/* ---------- New York: a real slice ---------- */

function NewYorkPlay({ cast }: PlayProps) {
  const { s, place } = useStage();
  const spots = useRow(cast.length, 0.68, 0.55);
  const skyline = place(0.5, 0.3);
  return (
    <>
      <Stand u={skyline.u} v={skyline.v} w={s * 3.6}>
        <svg viewBox="0 0 120 60">
          <g fill="#3c4a63">
            {[
              [0, 28, 14],
              [15, 18, 12],
              [28, 34, 12],
              [41, 10, 10],
              [52, 24, 14],
              [67, 2, 8],
              [76, 26, 16],
              [93, 16, 11],
              [105, 30, 15],
            ].map(([x, y, w]) => (
              <rect key={x} x={x} y={y} width={w} height={60 - y} />
            ))}
          </g>
          {Array.from({ length: 22 }, (_, k) => (
            <rect key={k} x={3 + ((k * 23) % 114)} y={22 + ((k * 13) % 34)} width="2" height="3" fill="#ffe58a" opacity="0.85" />
          ))}
        </svg>
      </Stand>
      <AnimatePresence>
        {cast.map((m, i) => (
          <Figure key={m.userId} member={m} u={spots[i].u} v={spots[i].v} animate={{ y: [0, -2, 0] }} transition={loop(1.6, i * 0.25)}>
            <Held x={94} y={52} w={55} origin="20% 80%" animate={{ rotate: [10, 10, -30, 10], x: [0, 0, -4, 0] }} transition={loop(2.2, i * 0.5)}>
              <Emo e="🍕" px={s * 0.55} />
            </Held>
          </Figure>
        ))}
      </AnimatePresence>
    </>
  );
}

/* ---------- Tennessee: front row for the country queen ---------- */

function TennesseePlay({ cast }: PlayProps) {
  const { s, place } = useStage();
  const spots = useRow(cast.length, 0.74, 0.7);
  const stage = place(0.5, 0.42);
  return (
    <>
      <Stand u={stage.u} v={stage.v} w={s * 3.2}>
        <div className="relative">
          <svg viewBox="0 0 100 70">
            <rect width="100" height="62" fill="#2b1236" />
            <path d="M0 0 H16 Q12 30 16 62 H0Z M100 0 H84 Q88 30 84 62 H100Z" fill="#a3123a" />
            <ellipse cx="50" cy="30" rx="28" ry="26" fill="#fff6c9" opacity="0.25" />
            <rect y="62" width="100" height="8" fill="#6b3a1e" />
            <g>
              <animateTransform attributeName="transform" type="rotate" values="-3 50 62;3 50 62;-3 50 62" dur="1.6s" repeatCount="indefinite" />
              <path d="M43 62 L45 36 Q50 32 55 36 L57 62Z" fill="#ff7ab8" />
              {[0, 1, 2, 3].map((k) => (
                <circle key={k} cx={47 + (k % 2) * 6} cy={42 + Math.floor(k / 2) * 9} r="1" fill="#fff">
                  <animate attributeName="opacity" values="0.2;1;0.2" dur="0.8s" begin={`${k * 0.2}s`} repeatCount="indefinite" />
                </circle>
              ))}
              <path d="M40 24 Q38 6 50 5 Q62 6 60 24 Q62 31 56 30 L44 30 Q38 31 40 24Z" fill="#ffe36b" />
              <circle cx="50" cy="23" r="6" fill="#f6c9a8" />
              <ellipse cx="50" cy="26" rx="2" ry="1.4" fill="#a3123a">
                <animate attributeName="ry" values="0.6;2;0.6" dur="0.5s" repeatCount="indefinite" />
              </ellipse>
              <circle cx="47.6" cy="21.8" r="0.8" fill="#333" />
              <circle cx="52.4" cy="21.8" r="0.8" fill="#333" />
              <path d="M56 44 Q68 50 62 58 Q55 56 54 50Z" fill="#c98a3b" />
              <line x1="57" y1="47" x2="70" y2="36" stroke="#5a3a1a" strokeWidth="1.4" />
            </g>
          </svg>
          {[0, 1, 2].map((k) => (
            <motion.div key={k} className="absolute" style={{ left: `${58 + k * 7}%`, top: "15%" }} animate={{ y: [0, -s * 0.8], x: [0, 6], opacity: [0, 1, 0] }} transition={{ duration: 2, delay: k * 0.6, repeat: Infinity }}>
              <Emo e={k % 2 ? "♪" : "♫"} px={s * 0.4} />
            </motion.div>
          ))}
        </div>
      </Stand>
      <AnimatePresence>
        {cast.map((m, i) => (
          <Figure key={m.userId} member={m} u={spots[i].u} v={spots[i].v} animate={{ rotate: [-10, 10, -10] }} transition={loop(1.6, i * 0.2)} />
        ))}
      </AnimatePresence>
    </>
  );
}

/* ---------- Wisconsin: game day in green and gold ---------- */

function WisconsinPlay({ cast }: PlayProps) {
  const { s, place } = useStage();
  const beat = useBeat(2200);
  const spots = useRow(cast.length, 0.74, 0.62);
  const a = place(0.28, 0.32);
  const b = place(0.72, 0.32);
  const player = (k: number) => (
    <svg viewBox="0 0 20 34">
      <circle cx="10" cy="7" r="6" fill="#ffb612" />
      <rect x="3" y="13" width="14" height="13" rx="3" fill="#203731" />
      <text x="10" y="23" textAnchor="middle" fontSize="7" fontWeight="800" fill="#ffb612">{k ? 12 : 4}</text>
      <rect x="4" y="26" width="12" height="8" fill="#ffb612" />
    </svg>
  );
  return (
    <>
      <Stand u={a.u} v={a.v} w={s * 0.7} animate={{ y: [0, -3, 0] }} transition={loop(0.8)}>
        {player(0)}
      </Stand>
      <Stand u={b.u} v={b.v} w={s * 0.7} animate={{ y: [0, -3, 0] }} transition={loop(0.8, 0.4)}>
        {player(1)}
      </Stand>
      <Mover key={beat} from={beat % 2 ? b : a} path={beat % 2 ? [b, a] : [a, b]} duration={1.4}>
        <Stand u={(beat % 2 ? b : a).u} v={(beat % 2 ? b : a).v} w={s * 0.35} lift={s * 0.8} animate={{ y: [0, -s * 1.3, 0] }} transition={{ duration: 1.4, ease: "easeInOut" }}>
          <svg viewBox="0 0 12 8">
            <ellipse cx="6" cy="4" rx="5.5" ry="3.4" fill="#7a3b12" />
          </svg>
        </Stand>
      </Mover>
      <AnimatePresence>
        {cast.map((m, i) => (
          <Figure key={m.userId} member={m} u={spots[i].u} v={spots[i].v} animate={{ y: [0, 0, -10, 0] }} transition={{ duration: 2.2, times: [0, 0.55, 0.68, 0.8], repeat: Infinity, delay: i * 0.05 }}>
            <Held x={50} y={0} w={95}>
              <svg viewBox="0 0 40 20">
                <path d="M2 18 L38 18 L30 2Z" fill="#ffcc33" stroke="#c99a00" strokeWidth="1.2" />
                <circle cx="22" cy="12" r="2" fill="#e0a800" />
              </svg>
            </Held>
          </Figure>
        ))}
      </AnimatePresence>
    </>
  );
}

/* ---------- Michigan: everybody in the pickup ---------- */

function MichiganPlay({ cast }: PlayProps) {
  const { s } = useStage();
  const ring = useRing(10, 0.55, 0.62, 0.2, 0.2);
  const path = [...ring, ring[0]];
  const W = s * 3;
  const riders = cast.slice(0, 5);
  return (
    <Mover from={path[0]} path={path} duration={9}>
      <Stand u={path[0].u} v={path[0].v} w={W} animate={{ y: [0, -2, 0] }} transition={loop(0.35)}>
        <div className="relative" style={{ width: W, height: W * 0.55 }}>
          {/* Driver in the cab, the rest in the bed. */}
          {riders.map((m, i) => (
            <div
              key={m.userId}
              className="absolute"
              style={{ left: `${[72, 18, 32, 46, 25][i]}%`, top: `${[2, 14, 10, 14, 4][i]}%`, translate: "-50% 0" }}
            >
              <motion.div animate={{ rotate: [-4, 4, -4] }} transition={loop(0.7, i * 0.1)}>
                <HeadSmall member={m} size={s * 0.62} />
              </motion.div>
            </div>
          ))}
          <svg viewBox="0 0 120 66" className="absolute inset-0 h-full w-full">
            <path d="M6 30 H74 V18 Q78 6 90 6 H104 Q112 6 116 18 L118 30 Q120 32 120 40 V52 H4 V36Z" fill="#1d4e89" stroke="#0f2c50" strokeWidth="2" />
            <path d="M80 10 H102 Q108 10 112 22 H80Z" fill="#bfe3ff" opacity="0.4" />
            {[24, 100].map((cx) => (
              <g key={cx}>
                <animateTransform attributeName="transform" type="rotate" values={`0 ${cx} 54;360 ${cx} 54`} dur="0.5s" repeatCount="indefinite" />
                <circle cx={cx} cy="54" r="10" fill="#111" />
                <circle cx={cx} cy="54" r="4" fill="#bbb" />
                <rect x={cx - 1} y="45" width="2" height="5" fill="#bbb" />
              </g>
            ))}
          </svg>
        </div>
      </Stand>
    </Mover>
  );
}

/* ---------- Louisiana: jazz on the corner ---------- */

function LouisianaPlay({ cast }: PlayProps) {
  const { s, place } = useStage();
  const spots = useRow(cast.length, 0.7, 0.62);
  const facade = place(0.5, 0.3);
  const band = [place(0.22, 0.48), place(0.36, 0.44)];
  const lamp = place(0.8, 0.45);
  return (
    <>
      <Stand u={facade.u} v={facade.v} w={s * 3.4}>
        <svg viewBox="0 0 120 56">
          <rect width="120" height="56" fill="#7a3b5c" />
          <rect y="20" width="120" height="3" fill="#222" />
          {Array.from({ length: 13 }, (_, k) => (
            <line key={k} x1={k * 10} y1="10" x2={k * 10} y2="20" stroke="#222" strokeWidth="1.2" />
          ))}
          {[15, 45, 75, 105].map((x) => (
            <rect key={x} x={x - 6} y="28" width="12" height="18" fill="#ffd27a" opacity="0.85" />
          ))}
        </svg>
      </Stand>
      <Stand u={lamp.u} v={lamp.v} w={s * 0.6}>
        <svg viewBox="0 0 16 60">
          <rect x="7" y="8" width="2" height="52" fill="#111" />
          <circle cx="8" cy="7" r="5" fill="#ffe9a8" />
        </svg>
      </Stand>
      {band.map((p, k) => (
        <Stand key={k} u={p.u} v={p.v} w={s * 0.9} animate={{ rotate: [-3, 3, -3] }} transition={loop(0.8, k * 0.3)}>
          <svg viewBox="0 0 30 46">
            <rect x="7" y="18" width="16" height="28" rx="4" fill={k ? "#2c6e8f" : "#8f2c4a"} />
            <circle cx="15" cy="12" r="7" fill="#8d5a3b" />
            <rect x="7" y="3" width="16" height="4" fill="#111" />
            <rect x="10" y="-2" width="10" height="6" fill="#111" />
            <path d={k ? "M22 22 Q30 34 24 40 Q20 40 21 34Z" : "M20 16 L30 12 L30 20Z"} fill={k ? "#e0b84a" : "#d9a400"} />
          </svg>
          {[0, 1].map((n) => (
            <motion.div key={n} className="absolute" style={{ left: "70%", top: "0%" }} animate={{ y: [0, -s * 0.9], x: [0, 8], opacity: [0, 1, 0] }} transition={{ duration: 2, delay: n * 1 + k * 0.5, repeat: Infinity }}>
              <Emo e={n % 2 ? "♪" : "♫"} px={s * 0.38} />
            </motion.div>
          ))}
        </Stand>
      ))}
      <AnimatePresence>
        {cast.map((m, i) => (
          <Figure key={m.userId} member={m} u={spots[i].u} v={spots[i].v} animate={{ y: [0, -6, 0, -3, 0], rotate: [-12, 12, -12] }} transition={loop(1, i * 0.15)} />
        ))}
      </AnimatePresence>
    </>
  );
}

/* ---------- Georgia: picking peaches ---------- */

function GeorgiaPlay({ cast }: PlayProps) {
  const { s, place } = useStage();
  const spots = useRow(cast.length, 0.66, 0.6);
  const trees = [place(0.25, 0.32), place(0.55, 0.28), place(0.8, 0.4)];
  return (
    <>
      {trees.map((t, k) => (
        <Stand key={k} u={t.u} v={t.v} w={s * 1.5}>
          <svg viewBox="0 0 50 56">
            <rect x="22" y="30" width="6" height="26" fill="#7a4a1e" />
            <circle cx="25" cy="22" r="21" fill="#3f9b3f" />
            {[
              [-10, -6],
              [8, -10],
              [12, 6],
              [-4, 8],
              [-14, 6],
            ].map(([dx, dy], j) => (
              <circle key={j} cx={25 + dx} cy={22 + dy} r="3.4" fill="#ffab5e" stroke="#ff7b3b" strokeWidth="0.8" />
            ))}
          </svg>
        </Stand>
      ))}
      <AnimatePresence>
        {cast.map((m, i) => (
          <Figure key={m.userId} member={m} u={spots[i].u} v={spots[i].v} animate={{ y: [0, 0, -10, 0] }} transition={{ duration: 2.4, times: [0, 0.3, 0.45, 0.6], repeat: Infinity, delay: i * 0.4 }}>
            <Held x={95} y={-14} w={40} animate={{ y: [0, 0, 0, s * 1.2], opacity: [0, 0, 1, 0] }} transition={{ duration: 2.4, times: [0, 0.4, 0.5, 0.75], repeat: Infinity, delay: i * 0.4 }}>
              <Emo e="🍑" px={s * 0.36} />
            </Held>
            <Held x={100} y={92} w={60}>
              <Emo e="🧺" px={s * 0.5} />
            </Held>
          </Figure>
        ))}
      </AnimatePresence>
    </>
  );
}

/* ---------- Everywhere else: round the campfire ---------- */

function CampfirePlay({ cast }: PlayProps) {
  const { s, place } = useStage();
  const beat = useBeat(1300);
  const fire = place(0.5, 0.52);
  const seats = useRing(Math.max(cast.length, 1), fire.u, fire.v, 0.22, 0.22);
  const from = seats[beat % seats.length];
  const to = seats[(beat + 1 + (beat % 2)) % seats.length];
  return (
    <>
      <Flat u={fire.u} v={fire.v} w={s * 2.4} h={s * 2.4}>
        <div className="h-full w-full rounded-full bg-[radial-gradient(closest-side,rgb(255_160_60/0.55),transparent)]" />
      </Flat>
      <Stand u={fire.u} v={fire.v} w={s * 0.95}>
        <svg viewBox="0 0 40 40" className="overflow-visible">
          <g stroke="#5a3a1c" strokeWidth="4.5" strokeLinecap="round">
            <line x1="8" y1="38" x2="32" y2="32" />
            <line x1="8" y1="32" x2="32" y2="38" />
          </g>
          <path d="M20 4 C27 13 31 18 30 25 C29 31 25 34 20 34 C15 34 11 31 10 25 C9.5 19 14 16 16 10 C18 15 19 16 20 17 C21 12 20 8 20 4 Z" fill="#f7632b">
            <animateTransform attributeName="transform" type="scale" values="1 1;0.94 1.12;1.04 0.95;1 1" dur="0.9s" repeatCount="indefinite" additive="sum" />
          </path>
          <path d="M20 14 C25 19 27 23 26 27 C25 31 23 33 20 33 C17 33 14.5 31 14 27 C13.6 23 16 21 17.5 17 C19 20 20 21 20 14 Z" fill="#ffb02e" />
        </svg>
      </Stand>
      <AnimatePresence>
        {cast.map((m, i) => (
          <Figure key={m.userId} member={m} u={seats[i].u} v={seats[i].v} animate={{ y: [0, -1.5, 0] }} transition={loop(2.2, i * 0.3)} />
        ))}
      </AnimatePresence>
      {cast.length > 1 && (
        <Mover key={beat} from={from} path={[from, to]} duration={0.8}>
          <Stand u={from.u} v={from.v} w={s * 0.3} lift={s * 1.2} animate={{ y: [0, -s * 1.2, 0] }} transition={{ duration: 0.8, ease: "easeInOut" }}>
            <div className="aspect-[10/9] w-full rounded-[3px] bg-[#fffaf0] shadow-[0_0_6px_rgb(255_190_90/0.9)] ring-1 ring-[#e6cfa3]" />
          </Stand>
        </Mover>
      )}
    </>
  );
}

/* ---------- The grounds (surfaces) ---------- */

const sand = (a: string, b: string) => (
  <>
    <defs>
      <linearGradient id={`g-${a.slice(1)}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={a} />
        <stop offset="1" stopColor={b} />
      </linearGradient>
    </defs>
    <rect x="-10" y="-10" width="120" height="120" fill={`url(#g-${a.slice(1)})`} />
  </>
);

const dots = (color: string, n = 26, r = 1.6) =>
  Array.from({ length: n }, (_, k) => <circle key={k} cx={(k * 37) % 100} cy={(k * 61) % 100} r={r} fill={color} />);

export const DIORAMAS: Record<string, Diorama[]> = {
  UT: [{ title: "44 oz sodas in the lawn chairs", edge: "#a8532d", ground: <>{sand("#f2c27f", "#df8f52")}{dots("#c4542a", 18, 2.4)}</>, Play: UtahPlay }],
  CA: [
    {
      title: "Mouse ears and fireworks",
      edge: "#1b2340",
      ground: <>{sand("#2b3d6b", "#1b2340")}<path d="M20 100 Q50 40 80 100" stroke="#e8d9b0" strokeWidth="8" fill="none" opacity="0.5" />{dots("#ffd54a", 30, 0.6)}</>,
      Play: CaliforniaFireworksPlay,
    },
    {
      title: "Surf's up",
      edge: "#0b5d75",
      ground: (
        <>
          {sand("#47c6d8", "#0b6f8c")}
          {[10, 25, 40, 55, 70, 85].map((y) => (
            <path key={y} d={`M-20 ${y} q10 -5 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0`} stroke="#bff3fb" strokeWidth="1.6" fill="none" opacity="0.7">
              <animateTransform attributeName="transform" type="translate" values="0 0;20 0" dur="1.6s" repeatCount="indefinite" />
            </path>
          ))}
        </>
      ),
      Play: CaliforniaSurfPlay,
    },
  ],
  OR: [{ title: "Tillamook ice cream", edge: "#3b7a32", ground: <>{sand("#7cc35f", "#4f9a44")}{dots("#2f6b2a", 30, 2.2)}</>, Play: OregonPlay }],
  NV: [
    {
      title: "Feeling lucky at the slots",
      edge: "#4a0f22",
      ground: (
        <>
          {sand("#8a1f3d", "#5a0f28")}
          {Array.from({ length: 12 }, (_, k) => (
            <path key={k} d={`M${(k % 4) * 30 + 5} ${Math.floor(k / 4) * 34 + 10} l6 -6 l6 6 l-6 6z`} fill="#f2c94c" opacity="0.5" />
          ))}
        </>
      ),
      Play: NevadaPlay,
    },
  ],
  AZ: [{ title: "Climbing the cliff dwellings", edge: "#8c3d1c", ground: <>{sand("#f0a35e", "#d9783f")}{dots("#b5532a", 20, 2)}</>, Play: ArizonaPlay }],
  NM: [{ title: "Somebody's getting abducted", edge: "#3a2440", ground: <>{sand("#5b3a5e", "#2a1d3d")}{dots("#ffffff", 26, 0.5)}</>, Play: NewMexicoPlay }],
  ID: [
    {
      title: "Dig 'em up, bake 'em",
      edge: "#5a3a1e",
      ground: (
        <>
          {sand("#9a6a3f", "#7a4f2c")}
          {[15, 30, 45, 60, 75, 90].map((y) => (
            <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#5f3c1e" strokeWidth="3" opacity="0.6" />
          ))}
        </>
      ),
      Play: IdahoPlay,
    },
  ],
  TX: [{ title: "Brisket on the smoker", edge: "#8a6234", ground: <>{sand("#d7b679", "#b38a4c")}{dots("#8aa04a", 30, 1.8)}</>, Play: TexasPlay }],
  FL: [
    {
      title: "Tank tops on. Run!",
      edge: "#b38f55",
      ground: (
        <>
          {sand("#f8e3b5", "#ecd096")}
          <path d="M70 -10 Q60 40 85 110 H110 V-10Z" fill="#2ab3c9" opacity="0.85" />
        </>
      ),
      Play: FloridaPlay,
    },
  ],
  NY: [
    {
      title: "A real New York slice",
      edge: "#3a3d45",
      ground: (
        <>
          {sand("#7b7f89", "#5b5f69")}
          <line x1="0" y1="62" x2="100" y2="62" stroke="#ffd54a" strokeWidth="1.5" strokeDasharray="6 5" />
          {[40, 46, 52, 58].map((x) => (
            <rect key={x} x={x} y="72" width="3" height="16" fill="#fff" opacity="0.8" />
          ))}
        </>
      ),
      Play: NewYorkPlay,
    },
  ],
  TN: [
    {
      title: "Front row for the country queen",
      edge: "#5a2e14",
      ground: (
        <>
          {sand("#b07040", "#8a5228")}
          {[10, 22, 34, 46, 58, 70, 82, 94].map((x) => (
            <line key={x} x1={x} y1="0" x2={x} y2="100" stroke="#6b3a1e" strokeWidth="1" opacity="0.6" />
          ))}
        </>
      ),
      Play: TennesseePlay,
    },
  ],
  WI: [
    {
      title: "Game day in green and gold",
      edge: "#245e24",
      ground: (
        <>
          {sand("#4fae4f", "#348c34")}
          {[10, 22, 34, 46, 58, 70, 82, 94].map((x) => (
            <line key={x} x1={x} y1="0" x2={x} y2="100" stroke="#fff" strokeWidth="1" opacity="0.6" />
          ))}
          <rect x="40" y="40" width="20" height="20" fill="#203731" opacity="0.5" />
          <text x="50" y="54" textAnchor="middle" fontSize="9" fontWeight="800" fill="#ffb612" opacity="0.8">G</text>
        </>
      ),
      Play: WisconsinPlay,
    },
  ],
  MI: [
    {
      title: "Everybody in the pickup",
      edge: "#2f6b2a",
      ground: (
        <>
          {sand("#6fbf5a", "#4c9a40")}
          <ellipse cx="55" cy="62" rx="22" ry="22" fill="none" stroke="#4a4f57" strokeWidth="9" />
          <ellipse cx="55" cy="62" rx="22" ry="22" fill="none" stroke="#ffd54a" strokeWidth="1" strokeDasharray="4 4" />
        </>
      ),
      Play: MichiganPlay,
    },
  ],
  LA: [{ title: "Jazz on the corner", edge: "#3a3355", ground: <>{sand("#6b6187", "#4a4166")}{dots("#857aa8", 40, 2.4)}</>, Play: LouisianaPlay }],
  GA: [{ title: "Picking peaches", edge: "#4f8a2c", ground: <>{sand("#9ccc5a", "#6fae3f")}{dots("#ffab5e", 12, 1.6)}</>, Play: GeorgiaPlay }],
};

export const CAMPFIRE: Diorama = {
  title: "Round the campfire",
  edge: "#3f6b2a",
  ground: <>{sand("#7cb45a", "#57913f")}{dots("#3f7a2c", 26, 2)}</>,
  Play: CampfirePlay,
};
