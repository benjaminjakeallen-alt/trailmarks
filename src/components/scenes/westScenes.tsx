"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Actor, Bg, Bit, Emo, Fg, row, useBeat, useIds } from "@/components/scenes/stage";
import type { Member } from "@/lib/types";

export interface SceneProps {
  cast: Member[];
}

const loop = (duration: number, delay = 0) => ({ duration, delay, repeat: Infinity, ease: "easeInOut" as const });

/** Utah: 44 oz sodas in the lawn chairs, under the arches. */
export function Utah({ cast }: SceneProps) {
  const id = useIds("sky");
  const pos = row(cast.length, 100, 55, 250);
  return (
    <>
      <Bg>
        <defs>
          <linearGradient id={id.sky} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7cc6f0" />
            <stop offset="1" stopColor="#f9dcae" />
          </linearGradient>
        </defs>
        <rect width="300" height="160" fill={`url(#${id.sky})`} />
        <circle cx="262" cy="28" r="15" fill="#ffd54a" />
        <path d="M8 124 V78 Q8 50 34 50 Q60 50 60 78 V124 H50 V80 Q50 62 34 62 Q18 62 18 80 V124Z" fill="#c4542a" />
        <path d="M200 124 L214 92 L238 92 L250 124Z" fill="#d2693a" opacity="0.8" />
        <path d="M0 124 Q80 112 150 121 T300 118 V160 H0Z" fill="#e8a865" />
      </Bg>
      <AnimatePresence>
        {cast.map((m, i) => (
          <Actor
            key={m.userId}
            member={m}
            x={pos[i].x}
            y={pos[i].y}
            animate={{ rotate: [0, -3, 0, 3, 0] }}
            transition={loop(5, i * 0.4)}
            behind={
              <Bit x={50} y={92} w={150} behind>
                <svg viewBox="0 0 60 50">
                  <rect x="6" y="2" width="48" height="24" rx="3" fill="#1fa7a1" />
                  {[12, 22, 32, 42].map((x) => (
                    <rect key={x} x={x} y="2" width="5" height="24" fill="#fff" opacity="0.85" />
                  ))}
                  <rect x="4" y="26" width="52" height="8" rx="3" fill="#178d88" />
                  <path d="M8 34 L4 48 M52 34 L56 48 M10 34 L50 48 M50 34 L10 48" stroke="#9aa5a8" strokeWidth="2.4" />
                </svg>
              </Bit>
            }
          >
            {/* The 44 oz: up for a sip, back down. */}
            <Bit x={112} y={74} w={40} origin="40% 100%" animate={{ rotate: [0, 0, -38, -38, 0], y: [0, 0, -6, -6, 0], x: [0, 0, -4, -4, 0] }} transition={loop(3.2, i * 0.7)}>
              <svg viewBox="0 0 30 46">
                <path d="M17 2 L21 -8" stroke="#ff4d6d" strokeWidth="2.5" strokeLinecap="round" />
                <rect x="3" y="4" width="24" height="5" rx="2" fill="#f2f2f2" />
                <path d="M4 9 H26 L23 44 H7Z" fill="#e63946" />
                <rect x="5" y="20" width="20" height="10" fill="#fff" />
                <text x="15" y="28.5" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#e63946">44</text>
              </svg>
            </Bit>
          </Actor>
        ))}
      </AnimatePresence>
    </>
  );
}

/** California, take one: mouse ears on, fireworks over the castle. */
export function CaliforniaFireworks({ cast }: SceneProps) {
  const id = useIds("sky");
  const pos = row(cast.length, 124, 50, 250);
  const bursts = [
    { x: 70, y: 36, c: "#ff6b9a", d: 0 },
    { x: 225, y: 30, c: "#ffd54a", d: 0.9 },
    { x: 150, y: 22, c: "#7ee8fa", d: 1.7 },
    { x: 110, y: 48, c: "#b892ff", d: 2.5 },
  ];
  return (
    <>
      <Bg>
        <defs>
          <linearGradient id={id.sky} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0c1445" />
            <stop offset="1" stopColor="#3b2a73" />
          </linearGradient>
        </defs>
        <rect width="300" height="160" fill={`url(#${id.sky})`} />
        {bursts.map((b) => (
          <g key={b.x} transform={`translate(${b.x} ${b.y})`}>
            <g opacity="0">
              <animateTransform attributeName="transform" type="scale" values="0;1;1.15" keyTimes="0;0.5;1" dur="3.2s" begin={`${b.d}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;1;0;0" keyTimes="0;0.25;0.5;1" dur="3.2s" begin={`${b.d}s`} repeatCount="indefinite" />
              {Array.from({ length: 12 }, (_, k) => {
                const a = (k / 12) * Math.PI * 2;
                const r1 = 5;
                const r2 = 18;
                return (
                  <line
                    key={k}
                    x1={(Math.cos(a) * r1).toFixed(2)}
                    y1={(Math.sin(a) * r1).toFixed(2)}
                    x2={(Math.cos(a) * r2).toFixed(2)}
                    y2={(Math.sin(a) * r2).toFixed(2)}
                    stroke={b.c}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                );
              })}
            </g>
          </g>
        ))}
        {/* The castle */}
        <g fill="#f3e9ff" opacity="0.92">
          <rect x="118" y="78" width="64" height="44" />
          <rect x="140" y="58" width="20" height="30" />
          <path d="M136 60 L150 34 L164 60Z" fill="#7aa6ff" />
          <rect x="108" y="70" width="14" height="52" />
          <path d="M104 72 L115 52 L126 72Z" fill="#7aa6ff" />
          <rect x="178" y="70" width="14" height="52" />
          <path d="M174 72 L185 52 L196 72Z" fill="#7aa6ff" />
          <path d="M142 122 V104 Q150 94 158 104 V122Z" fill="#3b2a73" />
        </g>
        <rect y="120" width="300" height="40" fill="#1b2a4a" />
      </Bg>
      <AnimatePresence>
        {cast.map((m, i) => (
          <Actor key={m.userId} member={m} x={pos[i].x} y={pos[i].y} animate={{ y: [0, 0, -4, 0], rotate: [0, -4, 4, 0] }} transition={loop(1.7, i * 0.25)}>
            {/* Mouse ears */}
            <Bit x={16} y={6} w={52} behind>
              <svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#111" /></svg>
            </Bit>
            <Bit x={84} y={6} w={52} behind>
              <svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#111" /></svg>
            </Bit>
          </Actor>
        ))}
      </AnimatePresence>
    </>
  );
}

/** California, take two: surfing. */
export function CaliforniaSurf({ cast }: SceneProps) {
  const id = useIds("sky", "sea");
  const pos = row(cast.length, 98, 45, 255);
  return (
    <>
      <Bg>
        <defs>
          <linearGradient id={id.sky} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffb36b" />
            <stop offset="1" stopColor="#ffe3a8" />
          </linearGradient>
          <linearGradient id={id.sea} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2ab3c9" />
            <stop offset="1" stopColor="#0b6f8c" />
          </linearGradient>
        </defs>
        <rect width="300" height="160" fill={`url(#${id.sky})`} />
        <circle cx="240" cy="64" r="22" fill="#ff8a3d" />
        <rect y="70" width="300" height="90" fill={`url(#${id.sea})`} />
        <motion.path
          d="M-60 84 Q-30 74 0 84 T60 84 T120 84 T180 84 T240 84 T300 84 T360 84 V160 H-60Z"
          fill="#47c6d8"
          opacity="0.6"
          animate={{ x: [0, 60] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      </Bg>
      <AnimatePresence>
        {cast.map((m, i) => (
          <Actor
            key={m.userId}
            member={m}
            x={pos[i].x}
            y={pos[i].y}
            animate={{ y: [0, -9, 0, 4, 0], x: [0, 6, 0, -6, 0], rotate: [0, -8, 0, 6, 0] }}
            transition={loop(2.6, i * 0.45)}
          >
            <Bit x={50} y={118} w={170}>
              <svg viewBox="0 0 60 14">
                <ellipse cx="30" cy="7" rx="29" ry="5.5" fill={["#ffd23f", "#ff6b9a", "#fff", "#7ee8fa", "#b8f27c"][i % 5]} stroke="#123" strokeWidth="1.2" />
                <line x1="6" y1="7" x2="54" y2="7" stroke="#123" strokeWidth="1" opacity="0.4" />
              </svg>
            </Bit>
          </Actor>
        ))}
      </AnimatePresence>
      <Fg>
        <motion.path
          d="M-60 128 Q-30 118 0 128 T60 128 T120 128 T180 128 T240 128 T300 128 T360 128 V160 H-60Z"
          fill="#0b6f8c"
          animate={{ x: [0, -60] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        />
      </Fg>
    </>
  );
}

/** Oregon: Tillamook ice cream on the green coast. */
export function Oregon({ cast }: SceneProps) {
  const pos = row(cast.length, 102, 60, 250);
  return (
    <>
      <Bg>
        <rect width="300" height="160" fill="#bfe6f2" />
        <path d="M0 96 Q60 70 120 90 T240 80 T300 86 V160 H0Z" fill="#5fae4e" />
        <path d="M0 116 Q90 100 170 114 T300 110 V160 H0Z" fill="#7cc35f" />
        <g transform="translate(18 62)">
          <rect width="38" height="30" fill="#c0392b" />
          <path d="M-4 2 L19 -14 L42 2Z" fill="#922b21" />
          <rect x="14" y="14" width="10" height="16" fill="#fff" />
        </g>
        <g transform="translate(222 64)">
          <rect width="62" height="16" rx="3" fill="#fff" stroke="#1d4e89" strokeWidth="1.5" />
          <text x="31" y="11.5" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#1d4e89">TILLAMOOK</text>
          <rect x="29" y="16" width="4" height="14" fill="#8a6a4a" />
        </g>
      </Bg>
      <AnimatePresence>
        {cast.map((m, i) => (
          <Actor key={m.userId} member={m} x={pos[i].x} y={pos[i].y} animate={{ y: [0, -2, 0] }} transition={loop(2, i * 0.3)}>
            {/* Lick: the cone comes up to the mouth and back. */}
            <Bit x={92} y={70} w={60} origin="50% 100%" animate={{ rotate: [10, 10, -30, 10], x: [0, 0, -6, 0] }} transition={loop(2.4, i * 0.5)}>
              <Emo e="🍦" s={22} />
            </Bit>
          </Actor>
        ))}
      </AnimatePresence>
    </>
  );
}

/** Nevada: one pulls the slot machine, everyone else watches, and sometimes it pays. */
export function Nevada({ cast }: SceneProps) {
  const beat = useBeat(1700);
  const jackpot = beat % 3 === 2;
  const reels = ["🍒", "7️⃣", "🔔", "🍋", "⭐"];
  const pick = (k: number) => (jackpot ? "7️⃣" : reels[(beat * 3 + k * 2) % reels.length]);
  const player = cast[0];
  const watchers = cast.slice(1);
  const wpos = row(watchers.length, 108, 175, 270);
  return (
    <>
      <Bg>
        <rect width="300" height="160" fill="#2a0f3d" />
        {Array.from({ length: 18 }, (_, k) => (
          <motion.circle
            key={k}
            cx={10 + k * 17}
            cy="10"
            r="2.5"
            fill={k % 2 ? "#ffd54a" : "#ff5fa2"}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 0.8, delay: (k % 4) * 0.2, repeat: Infinity }}
          />
        ))}
        <rect y="128" width="300" height="32" fill="#7a1f3d" />
        {/* The machine */}
        <rect x="40" y="38" width="84" height="92" rx="10" fill="#d9a400" stroke="#8a6500" strokeWidth="3" />
        <rect x="48" y="30" width="68" height="14" rx="5" fill="#ff3b6b" />
        <text x="82" y="40.5" textAnchor="middle" fontSize="9" fontWeight="800" fill="#fff">
          {jackpot ? "JACKPOT!" : "SLOTS"}
        </text>
        <rect x="50" y="56" width="64" height="26" rx="4" fill="#fff" />
        <rect x="56" y="98" width="52" height="20" rx="3" fill="#8a6500" />
        {/* The lever: pulled down every spin (pivots at its base). */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0 130 76;0 130 76;55 130 76;0 130 76;0 130 76"
            keyTimes="0;0.05;0.25;0.5;1"
            dur="1.7s"
            repeatCount="indefinite"
          />
          <line x1="130" y1="76" x2="130" y2="46" stroke="#bbb" strokeWidth="4" strokeLinecap="round" />
          <circle cx="130" cy="44" r="6" fill="#ff3b6b" />
        </g>
      </Bg>
      {/* Reels, as emoji so they read at any size */}
      <div className="absolute flex justify-around" style={{ left: "17.5%", top: "36%", width: "19.5%" }}>
        {[0, 1, 2].map((k) => (
          <motion.span key={`${beat}-${k}`} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: k * 0.12 }}>
            <Emo e={pick(k)} s={13} />
          </motion.span>
        ))}
      </div>
      <AnimatePresence>
        {player && (
          <Actor key={player.userId} member={player} x={140} y={112} s={36} animate={{ x: [0, -3, 0], y: [0, 2, 0] }} transition={loop(1.7)} />
        )}
        {watchers.map((m, i) => (
          <Actor
            key={m.userId}
            member={m}
            x={wpos[i].x}
            y={wpos[i].y}
            animate={jackpot ? { y: [0, -14, 0, -8, 0] } : { y: [0, -1, 0] }}
            transition={jackpot ? { duration: 0.9 } : loop(2, i * 0.3)}
          />
        ))}
      </AnimatePresence>
      <AnimatePresence>
        {jackpot &&
          Array.from({ length: 8 }, (_, k) => (
            <motion.div
              key={`${beat}-coin-${k}`}
              className="absolute"
              style={{ left: "27%", top: "60%", zIndex: 300 }}
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{ x: (k - 3.5) * 14, y: [0, -40 - (k % 3) * 10, 30], opacity: [1, 1, 0] }}
              transition={{ duration: 1.1, ease: "easeOut" }}
            >
              <Emo e="🪙" s={11} />
            </motion.div>
          ))}
      </AnimatePresence>
    </>
  );
}

/** Arizona: up the ladder and through the cliff dwellings. */
export function Arizona({ cast }: SceneProps) {
  // A route up the ladder, along the ledge, in and out of the doorways, and back down.
  const route = {
    x: [40, 92, 92, 120, 150, 150, 186, 222, 222, 40],
    y: [128, 128, 74, 70, 70, 70, 70, 70, 128, 128],
    opacity: [1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
  };
  return (
    <>
      <Bg>
        <rect width="300" height="160" fill="#f6b26b" />
        <circle cx="40" cy="30" r="14" fill="#ffe08a" />
        <path d="M0 40 Q150 14 300 40 V138 H0Z" fill="#b5532a" />
        {/* The alcove and its dwellings */}
        <path d="M70 84 Q150 34 250 84Z" fill="#6b2a14" opacity="0.65" />
        <rect x="108" y="56" width="36" height="28" fill="#d98c5f" />
        <rect x="140" y="64" width="30" height="20" fill="#e3a073" />
        <rect x="176" y="54" width="34" height="30" fill="#d98c5f" />
        <rect x="120" y="66" width="8" height="12" fill="#3b1608" />
        <rect x="150" y="70" width="8" height="12" fill="#3b1608" />
        <rect x="188" y="64" width="8" height="12" fill="#3b1608" />
        <rect x="70" y="84" width="180" height="5" fill="#8c3d1c" />
        {/* Ladder */}
        <g stroke="#7a4a1e" strokeWidth="2.5">
          <line x1="86" y1="86" x2="86" y2="140" />
          <line x1="98" y1="86" x2="98" y2="140" />
          {[94, 104, 114, 124, 134].map((y) => (
            <line key={y} x1="86" y1={y} x2="98" y2={y} />
          ))}
        </g>
        <rect y="138" width="300" height="22" fill="#d9874f" />
      </Bg>
      <AnimatePresence>
        {cast.map((m, i) => (
          <motion.div
            key={m.userId}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0"
              animate={{ x: route.x.map((v) => `${((v - 150) / 300) * 100}%`), y: route.y.map((v) => `${((v - 80) / 160) * 100}%`), opacity: route.opacity }}
              transition={{ duration: 9, delay: i * 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <Actor member={m} x={150} y={80} s={28} />
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </>
  );
}

/** New Mexico: a saucer drifts over, and one of you goes up the beam (and comes back). */
export function NewMexico({ cast }: SceneProps) {
  const beat = useBeat(4200);
  const taken = cast.length ? beat % cast.length : -1;
  const pos = row(cast.length, 124, 50, 250);
  const ufoX = pos[taken]?.x ?? 150;
  const id = useIds("sky", "beam");
  return (
    <>
      <Bg>
        <defs>
          <linearGradient id={id.sky} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#071a3a" />
            <stop offset="1" stopColor="#3d2b6b" />
          </linearGradient>
          <linearGradient id={id.beam} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b8ff8a" stopOpacity="0.85" />
            <stop offset="1" stopColor="#b8ff8a" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <rect width="300" height="160" fill={`url(#${id.sky})`} />
        {Array.from({ length: 22 }, (_, k) => (
          <circle key={k} cx={(k * 53) % 300} cy={(k * 29) % 70} r="0.9" fill="#fff" opacity="0.8" />
        ))}
        <path d="M0 130 L40 118 L70 126 L120 114 L180 124 L240 112 L300 122 V160 H0Z" fill="#7a4b2a" />
        <g fill="#2f6b3a">
          <rect x="22" y="96" width="6" height="30" rx="3" />
          <rect x="15" y="104" width="5" height="12" rx="2.5" />
          <rect x="30" y="100" width="5" height="10" rx="2.5" />
          <rect x="268" y="92" width="6" height="32" rx="3" />
          <rect x="276" y="100" width="5" height="12" rx="2.5" />
        </g>
      </Bg>
      <motion.div className="absolute inset-0" style={{ zIndex: 5 }} animate={{ x: `${((ufoX - 150) / 300) * 100}%` }} transition={{ type: "spring", stiffness: 40, damping: 12 }}>
        <svg viewBox="0 0 300 160" className="absolute inset-0 h-full w-full" aria-hidden>
          <motion.path
            d="M138 40 L162 40 L182 132 L118 132Z"
            fill={`url(#${id.beam})`}
            animate={{ opacity: [0, 0, 1, 1, 0] }}
            transition={{ duration: 4.2, times: [0, 0.15, 0.25, 0.8, 0.95], repeat: Infinity }}
          />
          <motion.g animate={{ y: [0, -3, 0] }} transition={{ duration: 1.4, repeat: Infinity }}>
            <ellipse cx="150" cy="22" rx="11" ry="9" fill="#9be7ff" opacity="0.9" />
            <ellipse cx="150" cy="32" rx="30" ry="8" fill="#a7b3c2" />
            {[130, 142, 158, 170].map((x, k) => (
              <motion.circle key={x} cx={x} cy="33" r="2" fill="#ffd54a" animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.6, delay: k * 0.15, repeat: Infinity }} />
            ))}
          </motion.g>
        </svg>
      </motion.div>
      <AnimatePresence>
        {cast.map((m, i) =>
          i === taken ? (
            <Actor
              key={`${m.userId}-${beat}`}
              member={m}
              x={pos[i].x}
              y={pos[i].y}
              z={4}
              animate={{ y: [0, 0, -78, -78, 0], rotate: [0, 0, 360, 360, 360], scale: [1, 1, 0.6, 0.6, 1] }}
              transition={{ duration: 4.2, times: [0, 0.2, 0.5, 0.7, 1] }}
            />
          ) : (
            <Actor key={m.userId} member={m} x={pos[i].x} y={pos[i].y} animate={{ rotate: [0, -10, 10, -10, 0] }} transition={loop(0.9, i * 0.1)}>
              <Bit x={50} y={-22} w={50}>
                <Emo e="❗" s={9} />
              </Bit>
            </Actor>
          ),
        )}
      </AnimatePresence>
    </>
  );
}

/** Idaho: dig up potatoes, bake them. */
export function Idaho({ cast }: SceneProps) {
  const pos = row(cast.length, 106, 40, 205);
  return (
    <>
      <Bg>
        <rect width="300" height="160" fill="#cfe8ff" />
        <path d="M0 64 L50 30 L90 56 L140 22 L200 60 L250 34 L300 58 V100 H0Z" fill="#7d8fa6" />
        <path d="M0 96 H300 V160 H0Z" fill="#8a5a33" />
        {[108, 122, 136, 150].map((y) => (
          <path key={y} d={`M0 ${y} Q150 ${y - 6} 300 ${y}`} stroke="#6e4527" strokeWidth="3" fill="none" />
        ))}
        {/* Oven, with the baked ones */}
        <g transform="translate(232 70)">
          <rect width="56" height="54" rx="6" fill="#4a4f57" />
          <rect x="6" y="14" width="44" height="30" rx="4" fill="#ff9d3b" />
          <rect x="6" y="4" width="44" height="6" rx="2" fill="#2d3136" />
        </g>
      </Bg>
      <div className="absolute" style={{ left: "80%", top: "57%", zIndex: 150 }}>
        <Emo e="🥔" s={16} />
      </div>
      {[0, 1].map((k) => (
        <motion.div
          key={k}
          className="absolute"
          style={{ left: `${83 + k * 5}%`, top: "38%", zIndex: 150 }}
          animate={{ y: [0, -14], opacity: [0, 0.8, 0], scale: [0.6, 1.2] }}
          transition={{ duration: 1.8, delay: k * 0.9, repeat: Infinity }}
        >
          <Emo e="💨" s={10} />
        </motion.div>
      ))}
      <AnimatePresence>
        {cast.map((m, i) => (
          <Actor key={m.userId} member={m} x={pos[i].x} y={pos[i].y} animate={{ y: [0, 3, 0] }} transition={loop(1.2, i * 0.3)}>
            {/* Shovel digs */}
            <Bit x={100} y={86} w={50} origin="20% 20%" animate={{ rotate: [0, 30, 0] }} transition={loop(1.2, i * 0.3)}>
              <svg viewBox="0 0 20 40">
                <line x1="4" y1="2" x2="14" y2="28" stroke="#8a5a2b" strokeWidth="3" strokeLinecap="round" />
                <path d="M9 26 L20 24 L18 38 L10 36Z" fill="#9aa5a8" />
              </svg>
            </Bit>
            {/* A potato pops out now and then */}
            <Bit
              x={120}
              y={110}
              w={40}
              animate={{ y: [0, 0, -26, 0], x: [0, 0, 18, 30], opacity: [0, 0, 1, 0] }}
              transition={{ duration: 2.4, delay: i * 0.5, repeat: Infinity }}
            >
              <Emo e="🥔" s={10} />
            </Bit>
          </Actor>
        ))}
      </AnimatePresence>
    </>
  );
}
