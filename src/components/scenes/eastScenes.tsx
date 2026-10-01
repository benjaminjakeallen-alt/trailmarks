"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Actor, Bg, Bit, Emo, Fg, row, useBeat, useIds } from "@/components/scenes/stage";
import type { SceneProps } from "@/components/scenes/westScenes";

const loop = (duration: number, delay = 0) => ({ duration, delay, repeat: Infinity, ease: "easeInOut" as const });

/** Texas: brisket on the smoker, ribs in hand, cowboy hats on. */
export function Texas({ cast }: SceneProps) {
  const id = useIds("sky");
  const pos = row(cast.length, 108, 120, 265);
  return (
    <>
      <Bg>
        <defs>
          <linearGradient id={id.sky} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff9a5a" />
            <stop offset="1" stopColor="#ffd59a" />
          </linearGradient>
        </defs>
        <rect width="300" height="160" fill={`url(#${id.sky})`} />
        <path d="M0 116 H300 V160 H0Z" fill="#c9a26b" />
        {/* Offset smoker */}
        <g transform="translate(14 70)">
          <rect x="0" y="16" width="70" height="32" rx="16" fill="#222" />
          <rect x="66" y="26" width="24" height="22" rx="3" fill="#333" />
          <rect x="10" y="-14" width="8" height="32" fill="#2a2a2a" />
          <line x1="8" y1="48" x2="4" y2="62" stroke="#222" strokeWidth="3" />
          <line x1="62" y1="48" x2="66" y2="62" stroke="#222" strokeWidth="3" />
          <circle cx="78" cy="38" r="3" fill="#ff7a2f" />
        </g>
        {[0, 1, 2].map((k) => (
          <motion.circle
            key={k}
            cx="28"
            cy="52"
            r="6"
            fill="#e6e6e6"
            animate={{ y: [0, -42], scale: [0.8, 2.3], opacity: [0.8, 0] }}
            transition={{ duration: 2.6, delay: k * 0.85, repeat: Infinity, ease: "easeOut" }}
          />
        ))}
      </Bg>
      <AnimatePresence>
        {cast.map((m, i) => (
          <Actor key={m.userId} member={m} x={pos[i].x} y={pos[i].y} animate={{ y: [0, -2, 0] }} transition={loop(1.8, i * 0.3)}>
            {/* Cowboy hat */}
            <Bit x={50} y={4} w={120}>
              <svg viewBox="0 0 60 24">
                <path d="M2 18 Q30 28 58 18 Q52 14 44 16 L40 4 Q30 0 20 4 L16 16 Q8 14 2 18Z" fill="#8b5a2b" stroke="#5a3a1a" strokeWidth="1.2" />
                <rect x="17" y="12" width="26" height="3" fill="#5a3a1a" />
              </svg>
            </Bit>
            <Bit x={96} y={72} w={55} origin="30% 80%" animate={{ rotate: [0, 0, -35, 0], y: [0, 0, -5, 0] }} transition={loop(2.6, i * 0.6)}>
              <Emo e="🍖" s={13} />
            </Bit>
          </Actor>
        ))}
      </AnimatePresence>
    </>
  );
}

/** Florida: tank tops on, running from a very slow cop car. */
export function Florida({ cast }: SceneProps) {
  const id = useIds("sky");
  const lane = cast.map((_, i) => 104 + (i % 2) * 14);
  return (
    <>
      <Bg>
        <defs>
          <linearGradient id={id.sky} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4fc3f7" />
            <stop offset="1" stopColor="#b3ecff" />
          </linearGradient>
        </defs>
        <rect width="300" height="160" fill={`url(#${id.sky})`} />
        <rect y="78" width="300" height="20" fill="#1fb6c9" />
        <path d="M0 96 H300 V160 H0Z" fill="#f5deb3" />
        {/* Palms */}
        {[40, 250].map((x) => (
          <g key={x}>
            <path d={`M${x} 98 Q${x + 4} 70 ${x - 2} 44`} stroke="#8b5a2b" strokeWidth="4" fill="none" />
            {[-60, -20, 20, 60, 100].map((a) => (
              <ellipse key={a} cx={x - 2} cy="44" rx="18" ry="5" fill="#2e9e4f" transform={`rotate(${a} ${x - 2} 44) translate(14 0)`} />
            ))}
          </g>
        ))}
      </Bg>
      {/* The whole chase runs right to left, on a loop. */}
      <motion.div
        className="absolute inset-0"
        animate={{ x: ["25%", "-60%"] }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
      >
        <AnimatePresence>
          {cast.map((m, i) => (
            <Actor
              key={m.userId}
              member={m}
              x={60 + i * 26}
              y={lane[i]}
              s={30}
              animate={{ y: [0, -6, 0], rotate: [-8, 8, -8] }}
              transition={loop(0.45, i * 0.1)}
            >
              {/* Tank top */}
              <Bit x={50} y={118} w={80}>
                <svg viewBox="0 0 30 22">
                  <path d="M6 0 H10 Q15 6 20 0 H24 L27 22 H3Z" fill={["#ff6b9a", "#ffd23f", "#7ee8fa", "#b8f27c", "#fff"][i % 5]} stroke="#123" strokeWidth="0.8" />
                </svg>
              </Bit>
            </Actor>
          ))}
        </AnimatePresence>
        <div className="absolute" style={{ left: `${(60 + cast.length * 26 + 30) / 3}%`, top: "60%", width: "26%" }}>
          <motion.svg viewBox="0 0 80 36" animate={{ y: [0, -1.5, 0] }} transition={loop(0.3)}>
            <rect x="4" y="14" width="72" height="14" rx="4" fill="#fff" stroke="#111" strokeWidth="1.5" />
            <path d="M18 14 L26 4 H54 L62 14Z" fill="#fff" stroke="#111" strokeWidth="1.5" />
            <rect x="4" y="18" width="72" height="5" fill="#111" />
            <text x="40" y="22.4" textAnchor="middle" fontSize="5" fontWeight="800" fill="#fff">POLICE</text>
            <motion.rect x="34" y="0" width="6" height="4" fill="#ff2d2d" animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.4, repeat: Infinity }} />
            <motion.rect x="40" y="0" width="6" height="4" fill="#2d6bff" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 0.4, repeat: Infinity }} />
            <circle cx="20" cy="29" r="6" fill="#111" />
            <circle cx="60" cy="29" r="6" fill="#111" />
          </motion.svg>
        </div>
      </motion.div>
    </>
  );
}

/** New York: a slice, folded, with the skyline behind. */
export function NewYork({ cast }: SceneProps) {
  const pos = row(cast.length, 112, 50, 250);
  return (
    <>
      <Bg>
        <rect width="300" height="160" fill="#ffb98a" />
        <g fill="#3c4a63">
          {[
            [0, 70, 30],
            [32, 50, 24],
            [58, 82, 26],
            [86, 36, 20],
            [108, 60, 30],
            [140, 20, 18],
            [160, 66, 34],
            [196, 44, 22],
            [220, 76, 30],
            [252, 54, 48],
          ].map(([x, y, w]) => (
            <rect key={x} x={x} y={y} width={w} height={160 - y} />
          ))}
          <path d="M146 20 L149 4 L152 20Z" />
        </g>
        {Array.from({ length: 30 }, (_, k) => (
          <rect key={k} x={6 + ((k * 37) % 285)} y={60 + ((k * 23) % 50)} width="3" height="4" fill="#ffe58a" opacity="0.8" />
        ))}
        <rect y="128" width="300" height="32" fill="#6b6f7a" />
        <rect x="0" y="126" width="300" height="3" fill="#999" />
      </Bg>
      <AnimatePresence>
        {cast.map((m, i) => (
          <Actor key={m.userId} member={m} x={pos[i].x} y={pos[i].y} animate={{ y: [0, -2, 0] }} transition={loop(1.6, i * 0.25)}>
            <Bit x={94} y={70} w={60} origin="20% 80%" animate={{ rotate: [10, 10, -30, 10], x: [0, 0, -5, 0] }} transition={loop(2.2, i * 0.5)}>
              <Emo e="🍕" s={14} />
            </Bit>
          </Actor>
        ))}
      </AnimatePresence>
    </>
  );
}

/** Tennessee: a country star with big blonde hair and rhinestones sings; everyone sways. */
export function Tennessee({ cast }: SceneProps) {
  const id = useIds("spot");
  const pos = row(cast.length, 132, 40, 260);
  return (
    <>
      <Bg>
        <defs>
          <radialGradient id={id.spot} cx="50%" cy="40%" r="50%">
            <stop offset="0" stopColor="#fff6c9" stopOpacity="0.9" />
            <stop offset="1" stopColor="#fff6c9" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="300" height="160" fill="#2b1236" />
        <path d="M0 0 H40 Q30 60 40 112 H0Z M300 0 H260 Q270 60 260 112 H300Z" fill="#a3123a" />
        <rect y="104" width="300" height="10" fill="#6b3a1e" />
        <ellipse cx="150" cy="64" rx="70" ry="52" fill={`url(#${id.spot})`} />
        {/* The singer */}
        <g>
          <animateTransform attributeName="transform" type="rotate" values="-3 150 104;3 150 104;-3 150 104" dur="1.6s" repeatCount="indefinite" />
          <path d="M136 104 L140 62 Q150 56 160 62 L164 104Z" fill="#ff7ab8" />
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <motion.circle
              key={k}
              cx={142 + (k % 3) * 8}
              cy={72 + Math.floor(k / 3) * 14}
              r="1.4"
              fill="#fff"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 0.8, delay: k * 0.13, repeat: Infinity }}
            />
          ))}
          <path d="M131 46 Q128 18 150 16 Q172 18 169 46 Q172 58 160 56 L140 56 Q128 58 131 46Z" fill="#ffe36b" />
          <circle cx="150" cy="44" r="10" fill="#f6c9a8" />
          <ellipse cx="150" cy="49" rx="3" ry="2" fill="#a3123a">
            <animate attributeName="ry" values="1;3;1" dur="0.5s" repeatCount="indefinite" />
          </ellipse>
          <circle cx="146" cy="42" r="1.2" fill="#333" />
          <circle cx="154" cy="42" r="1.2" fill="#333" />
          <path d="M166 76 Q186 84 176 98 Q164 96 162 84Z" fill="#c98a3b" />
          <line x1="168" y1="80" x2="190" y2="62" stroke="#5a3a1a" strokeWidth="2" />
        </g>
      </Bg>
      {[0, 1, 2].map((k) => (
        <motion.div
          key={k}
          className="absolute"
          style={{ left: `${56 + k * 6}%`, top: "26%", zIndex: 120 }}
          animate={{ y: [0, -24], x: [0, 10], opacity: [0, 1, 0] }}
          transition={{ duration: 2, delay: k * 0.6, repeat: Infinity }}
        >
          <Emo e={k % 2 ? "♪" : "♫"} s={11} />
        </motion.div>
      ))}
      <AnimatePresence>
        {cast.map((m, i) => (
          <Actor key={m.userId} member={m} x={pos[i].x} y={pos[i].y} s={32} animate={{ rotate: [-10, 10, -10], x: [-3, 3, -3] }} transition={loop(1.6, i * 0.2)} />
        ))}
      </AnimatePresence>
    </>
  );
}

/** Wisconsin: game day in green and gold, cheese hats on. */
export function Wisconsin({ cast }: SceneProps) {
  const beat = useBeat(2200);
  const pos = row(cast.length, 136, 40, 260);
  return (
    <>
      <Bg>
        <rect width="300" height="160" fill="#9fd3ff" />
        <path d="M0 18 H300 V60 H0Z" fill="#8a96a3" />
        {[24, 34, 44, 54].map((y) => (
          <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="#6f7a86" strokeWidth="1.5" />
        ))}
        <rect y="60" width="300" height="100" fill="#3f9b3f" />
        {[40, 80, 120, 160, 200, 240].map((x) => (
          <line key={x} x1={x} y1="60" x2={x - 20} y2="160" stroke="#fff" strokeWidth="1.2" opacity="0.6" />
        ))}
        {/* Two players in green and gold */}
        {[70, 230].map((x, k) => (
          <motion.g key={x} animate={{ y: [0, -3, 0] }} transition={loop(0.8, k * 0.4)}>
            <rect x={x - 6} y="78" width="12" height="16" rx="3" fill="#203731" />
            <text x={x} y="89" textAnchor="middle" fontSize="7" fontWeight="800" fill="#ffb612">
              {k ? 12 : 4}
            </text>
            <circle cx={x} cy="72" r="6" fill="#ffb612" />
            <rect x={x - 6} y="94" width="12" height="6" fill="#ffb612" />
          </motion.g>
        ))}
        {/* The ball: across the field and back */}
        <motion.g
          key={beat}
          initial={{ x: 0, y: 0 }}
          animate={{ x: beat % 2 ? -144 : 144, y: [0, -36, 0] }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
        >
          <ellipse cx={beat % 2 ? 222 : 78} cy="72" rx="4" ry="2.6" fill="#7a3b12" />
        </motion.g>
      </Bg>
      <AnimatePresence>
        {cast.map((m, i) => (
          <Actor
            key={m.userId}
            member={m}
            x={pos[i].x}
            y={pos[i].y}
            s={32}
            animate={{ y: [0, 0, -10, 0] }}
            transition={{ duration: 2.2, times: [0, 0.55, 0.68, 0.8], repeat: Infinity, delay: i * 0.05 }}
          >
            {/* Cheese wedge hat */}
            <Bit x={50} y={2} w={95}>
              <svg viewBox="0 0 40 20">
                <path d="M2 18 L38 18 L30 2Z" fill="#ffcc33" stroke="#c99a00" strokeWidth="1.2" />
                <circle cx="22" cy="12" r="2" fill="#e0a800" />
                <circle cx="30" cy="9" r="1.4" fill="#e0a800" />
              </svg>
            </Bit>
          </Actor>
        ))}
      </AnimatePresence>
    </>
  );
}

/** Michigan: everybody in the pickup, cruising. */
export function Michigan({ cast }: SceneProps) {
  // Driver up front, the rest in the bed.
  const seats = [
    { x: 202, y: 74 },
    { x: 116, y: 80 },
    { x: 150, y: 80 },
    { x: 100, y: 68 },
    { x: 134, y: 68 },
  ];
  return (
    <>
      <Bg>
        <rect width="300" height="160" fill="#a9dcff" />
        <motion.g animate={{ x: [0, -150] }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }}>
          {Array.from({ length: 10 }, (_, k) => (
            <g key={k} transform={`translate(${k * 50 + 10} 70)`}>
              <rect x="-2" y="18" width="4" height="14" fill="#7a4a1e" />
              <circle cy="12" r="12" fill={k % 2 ? "#3f9b3f" : "#2f7d3a"} />
            </g>
          ))}
        </motion.g>
        <rect y="102" width="300" height="58" fill="#4a4f57" />
        <motion.g animate={{ x: [0, -40] }} transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}>
          {Array.from({ length: 10 }, (_, k) => (
            <rect key={k} x={k * 40} y="130" width="20" height="3" fill="#ffd54a" />
          ))}
        </motion.g>
      </Bg>
      <motion.div className="absolute inset-0" animate={{ y: [0, -2, 0] }} transition={loop(0.35)}>
        <AnimatePresence>
          {cast.slice(0, 5).map((m, i) => (
            <Actor key={m.userId} member={m} x={seats[i].x} y={seats[i].y} s={26} z={i === 0 ? 210 : 190 + i} animate={{ rotate: [-3, 3, -3] }} transition={loop(0.7, i * 0.1)} />
          ))}
        </AnimatePresence>
        <Fg>
          {/* The pickup (no badges) */}
          <path d="M90 92 H178 V80 Q182 66 196 66 H214 Q224 66 230 80 L238 92 Q246 94 246 104 V116 H86 V100Z" fill="#1d4e89" stroke="#0f2c50" strokeWidth="2" />
          <path d="M184 70 H212 Q220 70 224 82 H184Z" fill="#bfe3ff" opacity="0.55" />
          <rect x="86" y="104" width="160" height="4" fill="#0f2c50" opacity="0.5" />
          {[110, 222].map((cx) => (
            <g key={cx}>
              <animateTransform attributeName="transform" type="rotate" values={`0 ${cx} 118;360 ${cx} 118`} dur="0.5s" repeatCount="indefinite" />
              <circle cx={cx} cy="118" r="11" fill="#111" />
              <circle cx={cx} cy="118" r="4.5" fill="#bbb" />
              <rect x={cx - 1} y="108" width="2" height="6" fill="#bbb" />
            </g>
          ))}
        </Fg>
      </motion.div>
    </>
  );
}

/** Louisiana: a jazz band on the corner in New Orleans; everybody dances. */
export function Louisiana({ cast }: SceneProps) {
  const pos = row(cast.length, 126, 120, 270);
  return (
    <>
      <Bg>
        <rect width="300" height="160" fill="#1c1640" />
        <rect x="0" y="20" width="300" height="86" fill="#7a3b5c" />
        <rect x="0" y="54" width="300" height="5" fill="#222" />
        {Array.from({ length: 20 }, (_, k) => (
          <line key={k} x1={k * 16} y1="40" x2={k * 16} y2="54" stroke="#222" strokeWidth="1.5" />
        ))}
        {[30, 110, 190, 270].map((x) => (
          <rect key={x} x={x - 10} y="66" width="20" height="30" fill="#ffd27a" opacity="0.85" />
        ))}
        <rect y="106" width="300" height="54" fill="#3a3355" />
        <rect x="102" y="40" width="3" height="70" fill="#111" />
        <circle cx="103.5" cy="38" r="6" fill="#ffe9a8" />
        <circle cx="103.5" cy="38" r="16" fill="#ffe9a8" opacity="0.25" />
        {/* The band: trumpet and sax */}
        {[
          { x: 30, horn: "M44 84 L66 78 L68 90 Z", c: "#d9a400" },
          { x: 70, horn: "M80 80 Q92 96 82 104 Q76 104 78 96Z", c: "#e0b84a" },
        ].map((b, k) => (
          <g key={b.x}>
            <animateTransform attributeName="transform" type="rotate" values={`-3 ${b.x} 110;3 ${b.x} 110;-3 ${b.x} 110`} dur="0.8s" begin={`${k * 0.3}s`} repeatCount="indefinite" />
            <rect x={b.x - 8} y="84" width="16" height="26" rx="4" fill={k ? "#2c6e8f" : "#8f2c4a"} />
            <circle cx={b.x} cy="76" r="8" fill="#8d5a3b" />
            <rect x={b.x - 9} y="66" width="18" height="4" fill="#111" />
            <rect x={b.x - 6} y="60" width="12" height="7" fill="#111" />
            <path d={b.horn} fill={b.c} />
          </g>
        ))}
      </Bg>
      {[0, 1, 2, 3].map((k) => (
        <motion.div
          key={k}
          className="absolute"
          style={{ left: `${18 + (k % 2) * 10}%`, top: "42%", zIndex: 120 }}
          animate={{ y: [0, -30], x: [0, 14], opacity: [0, 1, 0] }}
          transition={{ duration: 2, delay: k * 0.5, repeat: Infinity }}
        >
          <Emo e={k % 2 ? "♪" : "♫"} s={11} />
        </motion.div>
      ))}
      <AnimatePresence>
        {cast.map((m, i) => (
          <Actor
            key={m.userId}
            member={m}
            x={pos[i].x}
            y={pos[i].y}
            s={30}
            animate={{ y: [0, -7, 0, -3, 0], rotate: [-12, 12, -12] }}
            transition={loop(1, i * 0.15)}
          />
        ))}
      </AnimatePresence>
    </>
  );
}

/** Georgia: picking peaches into baskets. */
export function Georgia({ cast }: SceneProps) {
  const pos = row(cast.length, 112, 50, 250);
  return (
    <>
      <Bg>
        <rect width="300" height="160" fill="#c6ecff" />
        <path d="M0 96 Q150 84 300 96 V160 H0Z" fill="#8bc34a" />
        {[45, 150, 255].map((x) => (
          <g key={x}>
            <rect x={x - 4} y="56" width="8" height="44" fill="#7a4a1e" />
            <circle cx={x} cy="44" r="30" fill="#3f9b3f" />
            {[
              [-14, -8],
              [10, -14],
              [16, 6],
              [-6, 10],
              [-20, 8],
            ].map(([dx, dy], k) => (
              <circle key={k} cx={x + dx} cy={44 + dy} r="4.5" fill="#ffab5e" stroke="#ff7b3b" strokeWidth="1" />
            ))}
          </g>
        ))}
      </Bg>
      <AnimatePresence>
        {cast.map((m, i) => (
          <Actor
            key={m.userId}
            member={m}
            x={pos[i].x}
            y={pos[i].y}
            animate={{ y: [0, 0, -12, 0] }}
            transition={{ duration: 2.4, times: [0, 0.3, 0.45, 0.6], repeat: Infinity, delay: i * 0.4 }}
          >
            {/* A peach falls into the basket */}
            <Bit x={95} y={-10} w={40} animate={{ y: [0, 0, 0, 50], opacity: [0, 0, 1, 0] }} transition={{ duration: 2.4, times: [0, 0.4, 0.5, 0.75], repeat: Infinity, delay: i * 0.4 }}>
              <Emo e="🍑" s={9} />
            </Bit>
            <Bit x={100} y={110} w={65}>
              <Emo e="🧺" s={14} />
            </Bit>
          </Actor>
        ))}
      </AnimatePresence>
    </>
  );
}
