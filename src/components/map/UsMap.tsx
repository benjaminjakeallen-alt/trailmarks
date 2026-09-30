"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MAP_HEIGHT, MAP_WIDTH, getUsGeometry } from "@/lib/usGeo";
import { EASE_OUT_EXPO, HAPTICS, SPRING_SNAPPY, SPRING_STAMP, haptic } from "@/lib/motion";
import Campfire from "@/components/family/Campfire";
import type { Member } from "@/lib/types";

type FxKind = "claim" | "unclaim";

interface Fx {
  id: number;
  code: string;
  x: number;
  y: number;
  kind: FxKind;
  /** This claim completes the family: gold bloom. */
  gold?: boolean;
}

interface UsMapProps {
  /** The viewer's own claims: what a tap toggles. */
  visited: Set<string>;
  /** Everyone in the family who has claimed each state, in family order. */
  family?: Record<string, string[]>;
  members?: Member[];
  viewerId?: string;
  selectedCode: string | null;
  /** Tap on a state you haven't claimed. */
  onClaim: (code: string) => void;
  /** Press and hold on a state you have claimed. */
  onUnclaim: (code: string) => void;
  /** Tap on a state you have claimed: show it, change nothing. */
  onSelect: (code: string) => void;
}

/** How long to hold before an unclaim fires. */
const LONG_PRESS_MS = 550;
/** Moving further than this (CSS px) turns a press into a scroll, and cancels it. */
const PRESS_SLOP_PX = 10;

const NO_FAMILY: Record<string, string[]> = {};
const NO_MEMBERS: Member[] = [];
const INTRO_MS = 1700;

/** Sunrise sweep: eastern states light up first. */
function sweepDelay(cx: number) {
  return ((MAP_WIDTH - cx) / MAP_WIDTH) * 0.85;
}

/** Farthest corner of the state's box from the tap, so the bloom always reaches every edge. */
function reach(fx: Fx, bounds: [[number, number], [number, number]]) {
  const [[x0, y0], [x1, y1]] = bounds;
  return Math.max(...[[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => Math.hypot(x - fx.x, y - fx.y)));
}

/**
 * The claim hero moment: the state's outline glows, and color blooms outward
 * from the exact point you tapped until it fills the state's edges. Gold when
 * the claim completes the family.
 */
function ClaimFx({ fx, d, bounds }: { fx: Fx; d: string; bounds: [[number, number], [number, number]] }) {
  const clipId = `tm-clip-${fx.id}`;
  const bloomId = `tm-bloom-${fx.id}`;
  const glowId = `tm-glow-${fx.id}`;
  const tint = fx.gold ? "#f5c542" : "var(--aqua-bright)";
  const deep = fx.gold ? "#c98a08" : "var(--aqua)";
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <path d={d} />
        </clipPath>
        <radialGradient id={bloomId}>
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.95} />
          <stop offset="0.3" style={{ stopColor: tint }} stopOpacity={0.9} />
          <stop offset="0.75" style={{ stopColor: deep }} stopOpacity={0.45} />
          <stop offset="1" style={{ stopColor: deep }} stopOpacity={0} />
        </radialGradient>
        <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* Glow: the state's edge lights up and fades. */}
      <motion.path
        d={d}
        fill="none"
        stroke={tint}
        strokeWidth={9}
        strokeLinejoin="round"
        filter={`url(#${glowId})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.95, 0] }}
        transition={{ duration: 1.25, times: [0, 0.3, 1], ease: "easeOut" }}
      />

      {/* Fill: a gradient that spreads from the tap point to the borders. */}
      <g clipPath={`url(#${clipId})`}>
        <motion.circle
          cx={fx.x}
          cy={fx.y}
          fill={`url(#${bloomId})`}
          initial={{ r: 0, opacity: 1 }}
          animate={{ r: reach(fx, bounds) * 1.25, opacity: [1, 1, 0] }}
          transition={{
            r: { duration: 0.85, ease: EASE_OUT_EXPO },
            opacity: { duration: 1.15, times: [0, 0.55, 1] },
          }}
        />
      </g>

      {!fx.gold && (
        <motion.text
          x={fx.x}
          y={fx.y - 14}
          textAnchor="middle"
          fontSize={16}
          fontWeight={700}
          fill="var(--petrol)"
          stroke="var(--bg-elevated)"
          strokeWidth={3}
          paintOrder="stroke"
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: [0, 1, 1, 0], y: -34 }}
          transition={{ duration: 1, ease: EASE_OUT_EXPO, times: [0, 0.15, 0.7, 1] }}
        >
          +1
        </motion.text>
      )}
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

/** The gold moment's label: a pill that rises from the tap, sized for screens rather than map units. */
function Cheer({ x, y }: { x: number; y: number }) {
  return (
    <motion.div
      className="pointer-events-none absolute z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-br from-[#fff1b8] via-[#f5b929] to-[#c98a08] px-4 py-2 text-[14px] font-semibold text-[#4a3000] shadow-[0_12px_28px_-10px_rgb(180_120_0/0.7)] ring-1 ring-white/60"
      style={{ left: x, top: y }}
      initial={{ opacity: 0, y: 0, scale: 0.7 }}
      animate={{ opacity: 1, y: -64, scale: 1 }}
      exit={{ opacity: 0, y: -84, transition: { duration: 0.4 } }}
      transition={SPRING_STAMP}
    >
      The whole family&apos;s been here
    </motion.div>
  );
}

/** The ring that fills under your finger while you hold to unclaim. Screen-sized, not map-sized. */
function HoldRing({ x, y }: { x: number; y: number }) {
  return (
    <motion.div
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ left: x, top: y }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.3, transition: { duration: 0.2 } }}
      transition={{ duration: 0.15 }}
    >
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90 drop-shadow-[0_4px_10px_rgb(0_0_0/0.25)]">
        <circle cx="32" cy="32" r="26" fill="rgb(255 255 255 / 0.55)" stroke="rgb(255 255 255 / 0.9)" strokeWidth="5" />
        <motion.circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke="var(--coral)"
          strokeWidth="5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: LONG_PRESS_MS / 1000, ease: "linear" }}
        />
      </svg>
    </motion.div>
  );
}

export default function UsMap({
  visited,
  family = NO_FAMILY,
  members = NO_MEMBERS,
  viewerId,
  selectedCode,
  onClaim,
  onUnclaim,
  onSelect,
}: UsMapProps) {
  const geo = useMemo(() => getUsGeometry(), []);
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const fxSeq = useRef(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const [fx, setFx] = useState<Fx[]>([]);
  const [hold, setHold] = useState<{ code: string; x: number; y: number } | null>(null);
  const [cheer, setCheer] = useState<{ id: number; x: number; y: number } | null>(null);
  const press = useRef<{
    code: string;
    clientX: number;
    clientY: number;
    timer: number | null;
    fired: boolean;
  } | null>(null);
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

  function pointFor(code: string, pointer?: { clientX: number; clientY: number }) {
    const shape = geo.byCode[code];
    return (pointer && toSvgPoint(pointer.clientX, pointer.clientY)) ?? { x: shape.centroid[0], y: shape.centroid[1] };
  }

  function addFx(next: Omit<Fx, "id">) {
    const id = ++fxSeq.current;
    setFx((prev) => [...prev, { ...next, id }]);
    window.setTimeout(() => setFx((prev) => prev.filter((f) => f.id !== id)), 1700);
  }

  /** A quick tap: claim a state you haven't claimed; just select one you have. */
  function tap(code: string, pointer?: { clientX: number; clientY: number }) {
    if (!geo.byCode[code]) return;
    if (visited.has(code)) {
      haptic(HAPTICS.select);
      onSelect(code);
      return;
    }
    const gold = isFamily && members.every((m) => m.userId === viewerId || family[code]?.includes(m.userId));
    const at = pointFor(code, pointer);
    addFx({ code, kind: "claim", gold, ...at });
    if (gold) {
      const svg = svgRef.current;
      const ctm = svg?.getScreenCTM();
      if (ctm) {
        const screen = new DOMPoint(at.x, at.y).matrixTransform(ctm);
        const id = fxSeq.current;
        setCheer({ id, ...wrapPoint(screen.x, screen.y) });
        window.setTimeout(() => setCheer((c) => (c?.id === id ? null : c)), 2000);
      }
    }
    haptic(gold ? HAPTICS.everyone : HAPTICS.claim);
    onClaim(code);
  }

  function unclaim(code: string, pointer?: { clientX: number; clientY: number }) {
    if (!visited.has(code)) return;
    addFx({ code, kind: "unclaim", ...pointFor(code, pointer) });
    haptic(HAPTICS.unclaim);
    onUnclaim(code);
  }

  function cancelPress() {
    if (press.current?.timer) window.clearTimeout(press.current.timer);
    press.current = null;
    setHold(null);
  }

  function wrapPoint(clientX: number, clientY: number) {
    const rect = wrapRef.current?.getBoundingClientRect();
    return rect ? { x: clientX - rect.left, y: clientY - rect.top } : { x: 0, y: 0 };
  }

  const pathHandlers = (code: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      cancelPress();
      const p = { code, clientX: e.clientX, clientY: e.clientY, timer: null as number | null, fired: false };
      press.current = p;
      // Only a claimed state can be held; holding it unclaims.
      if (visited.has(code)) {
        setHold({ code, ...wrapPoint(e.clientX, e.clientY) });
        p.timer = window.setTimeout(() => {
          p.fired = true;
          setHold(null);
          haptic(HAPTICS.holdThreshold);
          unclaim(code, p);
        }, LONG_PRESS_MS);
      }
    },
    onPointerUp: (e: React.PointerEvent) => {
      const p = press.current;
      if (p && p.code === code && !p.fired) tap(code, e);
      cancelPress();
    },
    onPointerCancel: cancelPress,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") setHovered(code);
    },
    onPointerLeave: () => setHovered((prev) => (prev === code ? null : prev)),
  });

  /** Dragging past the slop is a scroll or pan, not a press. */
  function trackPress(e: React.PointerEvent) {
    const p = press.current;
    if (p && Math.hypot(e.clientX - p.clientX, e.clientY - p.clientY) > PRESS_SLOP_PX) cancelPress();
  }

  function moveTooltip(e: React.PointerEvent) {
    const wrap = wrapRef.current;
    const tip = tooltipRef.current;
    if (!wrap || !tip || e.pointerType !== "mouse") return;
    const rect = wrap.getBoundingClientRect();
    tip.style.transform = `translate(${e.clientX - rect.left}px, ${e.clientY - rect.top}px)`;
  }


  const landTransition = introDone
    ? SPRING_SNAPPY
    : undefined;

  // Hide the tooltip while that state's claim animation plays, so it doesn't cover the moment.
  const hoveredShape = hovered && !fx.some((f) => f.code === hovered) ? geo.byCode[hovered] : null;
  const selectedShape = selectedCode ? geo.byCode[selectedCode] : null;
  const campers = selectedCode ? (family[selectedCode] ?? []).map((id) => byId[id]).filter(Boolean) : [];

  return (
    <div
      ref={wrapRef}
      className="relative [-webkit-touch-callout:none]"
      onPointerMove={(e) => {
        moveTooltip(e);
        trackPress(e);
      }}
      onPointerLeave={() => {
        setHovered(null);
        cancelPress();
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className="h-auto w-full touch-manipulation select-none overflow-visible"
        role="group"
        aria-label="Map of the United States. Tap a state to claim it; press and hold a claimed state to unclaim it. With the keyboard, Enter claims and Delete unclaims."
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
                  tap(s.code);
                } else if (e.key === "Delete" || e.key === "Backspace") {
                  e.preventDefault();
                  unclaim(s.code);
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
                  initial={{ opacity: 0, scale: introDone ? 1 : 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.32, ease: [0.5, 0, 0.75, 0] } }}
                  transition={
                    introDone
                      ? // After the intro the bloom paints the claim; the solid fill settles in beneath it.
                        { opacity: { duration: 0.6, ease: EASE_OUT_EXPO, delay: 0.18 } }
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
              <ClaimFx key={f.id} fx={f} d={geo.byCode[f.code]?.d ?? ""} bounds={geo.byCode[f.code].bounds} />
            ) : (
              <UnclaimFx key={f.id} fx={f} />
            ),
          )}
        </g>
      </svg>

      {/* Who's been to the selected state: their adventurers round a campfire, right on the map. */}
      <AnimatePresence>
        {selectedShape && campers.length > 0 && (
          <motion.div
            key={`camp-${selectedShape.code}`}
            className="pointer-events-none absolute z-[5]"
            style={{
              left: `${(selectedShape.centroid[0] / MAP_WIDTH) * 100}%`,
              top: `${(selectedShape.centroid[1] / MAP_HEIGHT) * 100}%`,
            }}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.18 } }}
            transition={SPRING_STAMP}
          >
            <div className="-translate-x-1/2 -translate-y-[64%] max-sm:scale-[0.82]">
              <div className="absolute left-1/2 top-[62%] h-9 w-28 -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(8_40_44/0.35),transparent)]" />
              <Campfire members={campers} variant="map" gold={everyone(selectedShape.code)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{hold && <HoldRing key={`${hold.code}-${hold.x}`} x={hold.x} y={hold.y} />}</AnimatePresence>
      <AnimatePresence>{cheer && <Cheer key={cheer.id} x={cheer.x} y={cheer.y} />}</AnimatePresence>

      <div
        ref={tooltipRef}
        className="pointer-events-none absolute left-0 top-0 z-10 will-change-transform"
        aria-hidden
      >
        <AnimatePresence>
          {hoveredShape && !(hoveredShape.code === selectedCode && campers.length > 0) && (
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
                    ? "Hold to unclaim"
                    : "Tap to claim"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
