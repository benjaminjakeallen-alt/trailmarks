"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MAP_HEIGHT, MAP_WIDTH, getUsGeometry } from "@/lib/usGeo";
import { EASE_OUT_EXPO, SPRING_SNAPPY, SPRING_STAMP, haptic } from "@/lib/motion";
import { initials } from "@/components/family/Avatar";
import type { Member } from "@/lib/types";

type FxKind = "claim" | "unclaim";

interface Fx {
  id: number;
  code: string;
  x: number;
  y: number;
  kind: FxKind;
}

interface UsMapProps {
  /** The viewer's own claims: what a tap toggles. */
  visited: Set<string>;
  /** Everyone in the family who has claimed each state, in family order. */
  family?: Record<string, string[]>;
  members?: Member[];
  viewerId?: string;
  selectedCode: string | null;
  onStateTap: (code: string) => void;
}

const NO_FAMILY: Record<string, string[]> = {};
const NO_MEMBERS: Member[] = [];
const MARKER_R = 8.5;
const MARKER_GAP = 11.5;
const MAX_MARKERS = 3;

/** Little member badges at a state's centroid; "+n" past three. */
function MemberMarkers({ x, y, members }: { x: number; y: number; members: Member[] }) {
  const shown = members.slice(0, MAX_MARKERS);
  const extra = members.length - shown.length;
  const count = shown.length + (extra > 0 ? 1 : 0);
  const startX = x - ((count - 1) * MARKER_GAP) / 2;
  return (
    <g>
      {shown.map((m, i) => (
        <motion.g
          key={m.userId}
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.3 }}
          transition={SPRING_STAMP}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        >
          <circle cx={startX + i * MARKER_GAP} cy={y} r={MARKER_R} fill={m.color} stroke="#ffffff" strokeWidth={1.6} />
          <text
            x={startX + i * MARKER_GAP}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={9}
            fontWeight={700}
            fill="#ffffff"
          >
            {initials(m.displayName).slice(0, 1)}
          </text>
        </motion.g>
      ))}
      {extra > 0 && (
        <g>
          <circle cx={startX + shown.length * MARKER_GAP} cy={y} r={MARKER_R} fill="var(--ink)" stroke="#ffffff" strokeWidth={1.6} />
          <text
            x={startX + shown.length * MARKER_GAP}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={7.5}
            fontWeight={700}
            fill="#ffffff"
          >
            +{extra}
          </text>
        </g>
      )}
    </g>
  );
}

const SPARK_COLORS = ["var(--sun)", "var(--aqua-bright)", "var(--petrol)"];
const INTRO_MS = 1700;

/** Sunrise sweep: eastern states light up first. */
function sweepDelay(cx: number) {
  return ((MAP_WIDTH - cx) / MAP_WIDTH) * 0.85;
}

/** Deterministic jitter so render stays pure. */
function jitter(seed: number, n: number) {
  return (Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453) % 1;
}

function ClaimFx({ fx, d }: { fx: Fx; d: string }) {
  const sparks = Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * Math.PI * 2 + jitter(fx.id, i) * 0.4;
    const dist = 42 + Math.abs(jitter(fx.id, i + 20)) * 34;
    return { angle, dist, color: SPARK_COLORS[i % SPARK_COLORS.length] };
  });

  return (
    <g>
      {/* A glint of light across the freshly claimed state. */}
      <motion.path
        d={d}
        fill="#ffffff"
        initial={{ opacity: 0.7 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.7, ease: EASE_OUT_EXPO, delay: 0.08 }}
      />
      <motion.circle
        cx={fx.x}
        cy={fx.y}
        fill="none"
        stroke="var(--aqua-bright)"
        initial={{ r: 6, opacity: 1, strokeWidth: 6 }}
        animate={{ r: 96, opacity: 0, strokeWidth: 0.5 }}
        transition={{ duration: 0.85, ease: EASE_OUT_EXPO }}
      />
      <motion.circle
        cx={fx.x}
        cy={fx.y}
        fill="none"
        stroke="var(--sun)"
        initial={{ r: 3, opacity: 0.9, strokeWidth: 4 }}
        animate={{ r: 60, opacity: 0, strokeWidth: 0.5 }}
        transition={{ duration: 0.8, ease: EASE_OUT_EXPO, delay: 0.09 }}
      />
      {sparks.map((s, i) => (
        <motion.circle
          key={i}
          fill={s.color}
          initial={{ cx: fx.x, cy: fx.y, r: 4.5, opacity: 1 }}
          animate={{
            cx: fx.x + Math.cos(s.angle) * s.dist,
            cy: fx.y + Math.sin(s.angle) * s.dist,
            r: 0,
            opacity: 0,
          }}
          transition={{ duration: 0.75, ease: EASE_OUT_EXPO, delay: 0.03 }}
        />
      ))}
      <motion.text
        x={fx.x}
        y={fx.y - 14}
        textAnchor="middle"
        fontSize={16}
        fontWeight={700}
        fill="var(--petrol)"
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: [0, 1, 1, 0], y: -34 }}
        transition={{ duration: 0.95, ease: EASE_OUT_EXPO, times: [0, 0.15, 0.6, 1] }}
      >
        +1
      </motion.text>
    </g>
  );
}

function UnclaimFx({ fx }: { fx: Fx }) {
  return (
    <motion.circle
      cx={fx.x}
      cy={fx.y}
      fill="none"
      stroke="var(--ink-3)"
      initial={{ r: 46, opacity: 0, strokeWidth: 0.5 }}
      animate={{ r: 2, opacity: [0, 0.7, 0], strokeWidth: 3 }}
      transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
    />
  );
}

export default function UsMap({
  visited,
  family = NO_FAMILY,
  members = NO_MEMBERS,
  viewerId,
  selectedCode,
  onStateTap,
}: UsMapProps) {
  const geo = useMemo(() => getUsGeometry(), []);
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const fxSeq = useRef(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const [fx, setFx] = useState<Fx[]>([]);
  const [introDone, setIntroDone] = useState(false);
  const reduceMotion = useReducedMotion();

  const isFamily = members.length > 1;
  const byId = useMemo(() => Object.fromEntries(members.map((m) => [m.userId, m])), [members]);
  /** Gold: every member of a family of two or more has been. */
  const everyone = (code: string) => isFamily && members.every((m) => family[code]?.includes(m.userId));
  const familyOnly = (code: string) => !visited.has(code) && (family[code]?.length ?? 0) > 0;
  const visitorNames = (code: string) =>
    (family[code] ?? []).map((id) => (id === viewerId ? "You" : (byId[id]?.displayName ?? "Someone")));

  useEffect(() => {
    const t = window.setTimeout(() => setIntroDone(true), INTRO_MS);
    return () => window.clearTimeout(t);
  }, []);

  function toSvgPoint(clientX: number, clientY: number) {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  function handleTap(code: string, pointer?: { clientX: number; clientY: number }) {
    const shape = geo.byCode[code];
    if (!shape) return;
    const origin =
      (pointer && toSvgPoint(pointer.clientX, pointer.clientY)) ?? {
        x: shape.centroid[0],
        y: shape.centroid[1],
      };
    const kind: FxKind = visited.has(code) ? "unclaim" : "claim";
    const id = ++fxSeq.current;

    setFx((prev) => [...prev, { id, code, kind, ...origin }]);
    window.setTimeout(() => setFx((prev) => prev.filter((f) => f.id !== id)), 1100);
    haptic(kind === "claim" ? [10, 40, 18] : 8);
    onStateTap(code);
  }

  function moveTooltip(e: React.PointerEvent) {
    const wrap = wrapRef.current;
    const tip = tooltipRef.current;
    if (!wrap || !tip || e.pointerType !== "mouse") return;
    const rect = wrap.getBoundingClientRect();
    tip.style.transform = `translate(${e.clientX - rect.left}px, ${e.clientY - rect.top}px)`;
  }

  const pathHandlers = (code: string) => ({
    onClick: (e: React.MouseEvent) =>
      handleTap(code, e.detail === 0 ? undefined : { clientX: e.clientX, clientY: e.clientY }),
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") setHovered(code);
    },
    onPointerLeave: () => setHovered((prev) => (prev === code ? null : prev)),
  });

  const landTransition = introDone
    ? SPRING_SNAPPY
    : undefined;

  const hoveredShape = hovered ? geo.byCode[hovered] : null;
  const selectedShape = selectedCode ? geo.byCode[selectedCode] : null;

  return (
    <div ref={wrapRef} className="relative" onPointerMove={moveTooltip} onPointerLeave={() => setHovered(null)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className="h-auto w-full touch-manipulation select-none overflow-visible"
        role="group"
        aria-label="Map of the United States. Activate a state to claim or unclaim it."
      >
        <defs>
          <linearGradient id="tm-visited" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={MAP_WIDTH} y2={MAP_HEIGHT}>
            <stop offset="0" style={{ stopColor: "var(--petrol)" }} />
            <stop offset="0.55" style={{ stopColor: "var(--aqua)" }} />
            <stop offset="1" style={{ stopColor: "var(--aqua-bright)" }} />
          </linearGradient>
          {/* Gold for states the whole family has been to: reflected bands that drift like light on metal. */}
          <linearGradient
            id="tm-gold"
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="0"
            x2="220"
            y2="140"
            spreadMethod="reflect"
          >
            <stop offset="0" stopColor="#9c6a05" />
            <stop offset="0.35" stopColor="#e9a818" />
            <stop offset="0.5" stopColor="#fff4c4" />
            <stop offset="0.65" stopColor="#f2b624" />
            <stop offset="1" stopColor="#a87306" />
            {!reduceMotion && (
              <animateTransform
                attributeName="gradientTransform"
                type="translate"
                from="0 0"
                to="440 280"
                dur="7s"
                repeatCount="indefinite"
              />
            )}
          </linearGradient>
          <filter id="tm-gold-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#f5a524" floodOpacity="0.55" />
          </filter>
        </defs>

        {/* Soft coastline emboss for depth. */}
        <motion.path
          d={geo.nation}
          fill="none"
          stroke="var(--line-strong)"
          strokeWidth={7}
          strokeLinejoin="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, ease: EASE_OUT_EXPO }}
        />

        <g>
          {geo.shapes.map((s) => (
            <motion.path
              key={s.code}
              d={s.d}
              className="state-path cursor-pointer outline-none"
              style={{ transition: "fill 220ms cubic-bezier(0.32,0.72,0,1)" }}
              fill={hovered === s.code ? "var(--land-hover)" : "var(--land)"}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={
                landTransition ?? { duration: 0.9, ease: EASE_OUT_EXPO, delay: sweepDelay(s.centroid[0]) }
              }
              whileTap={{ scale: 0.95, transition: { duration: 0.1 } }}
              role="button"
              tabIndex={0}
              aria-pressed={visited.has(s.code)}
              aria-label={`${s.info.name}, ${visited.has(s.code) ? "claimed" : "not claimed"}${
                isFamily && family[s.code]?.length ? `. Been here: ${visitorNames(s.code).join(", ")}` : ""
              }`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleTap(s.code);
                }
              }}
              {...pathHandlers(s.code)}
            />
          ))}
        </g>

        {/* Family-only: someone else has been here, you haven't (yet). */}
        <g>
          <AnimatePresence>
            {geo.shapes
              .filter((s) => familyOnly(s.code))
              .map((s) => (
                <motion.path
                  key={`f-${s.code}`}
                  d={s.d}
                  className="state-path cursor-pointer"
                  fill="var(--aqua-bright)"
                  aria-hidden
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.42 }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.6, ease: EASE_OUT_EXPO, delay: introDone ? 0 : sweepDelay(s.centroid[0]) + 0.45 }}
                  {...pathHandlers(s.code)}
                />
              ))}
          </AnimatePresence>
        </g>

        <g>
          <AnimatePresence>
            {geo.shapes
              .filter((s) => visited.has(s.code))
              .map((s) => (
                <motion.path
                  key={`v-${s.code}`}
                  d={s.d}
                  className="state-path cursor-pointer"
                  fill={everyone(s.code) ? "url(#tm-gold)" : "url(#tm-visited)"}
                  filter={everyone(s.code) ? "url(#tm-gold-glow)" : undefined}
                  aria-hidden
                  initial={{ opacity: 0, scale: introDone ? 1.35 : 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.32, ease: [0.5, 0, 0.75, 0] } }}
                  transition={
                    introDone
                      ? { scale: SPRING_STAMP, opacity: { duration: 0.15 } }
                      : { duration: 0.9, ease: EASE_OUT_EXPO, delay: sweepDelay(s.centroid[0]) + 0.45 }
                  }
                  whileTap={{ scale: 0.95, transition: { duration: 0.1 } }}
                  {...pathHandlers(s.code)}
                />
              ))}
          </AnimatePresence>
        </g>

        <motion.path
          d={geo.borders}
          fill="none"
          stroke="var(--land-edge)"
          strokeWidth={1.1}
          strokeLinejoin="round"
          pointerEvents="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
        />

        {isFamily && (
          <g pointerEvents="none" aria-hidden>
            {geo.shapes
              .filter((s) => (family[s.code]?.length ?? 0) > 0)
              .map((s) => (
                <MemberMarkers
                  key={`m-${s.code}`}
                  x={s.centroid[0]}
                  y={s.centroid[1]}
                  members={(family[s.code] ?? []).map((id) => byId[id]).filter(Boolean)}
                />
              ))}
          </g>
        )}

        <g pointerEvents="none">
          {hoveredShape && hovered !== selectedCode && (
            <path d={hoveredShape.d} fill="none" stroke="var(--ink)" strokeOpacity={0.35} strokeWidth={1.25} />
          )}
          {selectedShape && (
            <motion.path
              key={selectedShape.code}
              d={selectedShape.d}
              fill="none"
              stroke="var(--sun)"
              strokeWidth={2.6}
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
            />
          )}
        </g>

        <g pointerEvents="none">
          {fx.map((f) =>
            f.kind === "claim" ? (
              <ClaimFx key={f.id} fx={f} d={geo.byCode[f.code]?.d ?? ""} />
            ) : (
              <UnclaimFx key={f.id} fx={f} />
            ),
          )}
        </g>
      </svg>

      <div
        ref={tooltipRef}
        className="pointer-events-none absolute left-0 top-0 z-10 will-change-transform"
        aria-hidden
      >
        <AnimatePresence>
          {hoveredShape && (
            <motion.div
              key={hoveredShape.code}
              initial={{ opacity: 0, y: 4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
              className="-translate-x-1/2 -translate-y-[calc(100%+14px)] whitespace-nowrap rounded-xl bg-ink px-3 py-1.5 text-bg shadow-[var(--shadow-float)]"
            >
              <span className="text-[13px] font-medium">{hoveredShape.info.name}</span>
              <span className="ml-2 text-[12px] opacity-65">
                {isFamily && family[hoveredShape.code]?.length
                  ? visitorNames(hoveredShape.code).join(", ")
                  : visited.has(hoveredShape.code)
                    ? "Claimed"
                    : "Tap to claim"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
