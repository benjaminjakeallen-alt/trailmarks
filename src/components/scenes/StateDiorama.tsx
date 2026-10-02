"use client";

import { motion } from "framer-motion";
import { Slab, TILT } from "@/components/scenes/diorama";
import { CAMPFIRE, DIORAMAS, type Diorama } from "@/components/scenes/dioramaScenes";
import { MAP_WIDTH, type StateShape } from "@/lib/usGeo";
import type { Member } from "@/lib/types";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The same fills as the map: aqua for claimed, gold when the whole family has been. */
const CLAIMED_GROUND = (
  <>
    <defs>
      <linearGradient id="slab-claimed" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" style={{ stopColor: "var(--accent)" }} />
        <stop offset="0.55" style={{ stopColor: "var(--success)" }} />
        <stop offset="1" style={{ stopColor: "var(--success-bright)" }} />
      </linearGradient>
    </defs>
    <rect x="-10" y="-10" width="120" height="120" fill="url(#slab-claimed)" />
  </>
);
const GOLD_GROUND = (
  <>
    <defs>
      <linearGradient id="slab-gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#9c6a05" />
        <stop offset="0.35" stopColor="#e9a818" />
        <stop offset="0.5" stopColor="#fff4c4" />
        <stop offset="0.65" stopColor="#f2b624" />
        <stop offset="1" stopColor="#a87306" />
      </linearGradient>
    </defs>
    <rect x="-10" y="-10" width="120" height="120" fill="url(#slab-gold)" />
  </>
);

/** Which scene a state plays (states with two take turns per tap); the rest get the campfire. */
export function sceneFor(code: string, turn: number): Diorama {
  const scenes = DIORAMAS[code] ?? [CAMPFIRE];
  return scenes[turn % scenes.length];
}

/**
 * The tapped state rises off the map, grows to a readable size, tips back into
 * a 3D slab, and the family acts out its activity on top. Lives in the map's
 * own box (px); `size` is that box.
 */
export default function StateDiorama({
  shape,
  size,
  gold,
}: {
  shape: StateShape;
  size: { w: number; h: number };
  /** Who's been (their 3D characters will stand on it). */
  members: Member[];
  gold: boolean;
  turn: number;
}) {
  const ppu = size.w / MAP_WIDTH;
  const [[x0, y0], [x1, y1]] = shape.bounds;
  const bw = (x1 - x0) * ppu;
  const bh = (y1 - y0) * ppu;
  const phone = size.w < 640;
  const maxW = phone ? Math.min(size.w * 0.74, 270) : 400;
  const maxH = phone ? 190 : 320;
  // Tiny states (Rhode Island, Delaware) grow a lot; big ones barely.
  const k = clamp(Math.min(maxW / bw, maxH / bh), 1, 18);
  const w = bw * k;
  const h = bh * k;
  // From the state's own spot to a spot that keeps the whole slab on the map.
  const cx0 = ((x0 + x1) / 2) * ppu;
  const cy0 = ((y0 + y1) / 2) * ppu;
  const tx = clamp(cx0, w / 2 + 8, size.w - w / 2 - 8);
  // (The tilt shortens it by about 40%, and the figures stand up above it.)
  const ty = clamp(cy0 - h * 0.1, h * 0.6, size.h - h * 0.5);

  return (
    <div className="pointer-events-none absolute inset-0 z-[6]" aria-label={`${shape.info.name}, lifted`} role="img">
      <motion.div
        className="absolute inset-0 bg-canvas/45"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
      />
      <div className="absolute" style={{ left: tx - w / 2, top: ty - h / 2, width: w, height: h, perspective: Math.max(700, w * 2.6) }}>
        <motion.div
          className="absolute inset-0"
          style={{ transformStyle: "preserve-3d" }}
          initial={{ x: cx0 - tx, y: cy0 - ty, scale: 1 / k, rotateX: 0, z: 0 }}
          animate={{ x: 0, y: 0, scale: 1, rotateX: TILT, z: 14 }}
          exit={{ x: cx0 - tx, y: cy0 - ty, scale: 1 / k, rotateX: 0, z: 0, opacity: 0, transition: { duration: 0.35 } }}
          transition={{ type: "spring", stiffness: 130, damping: 18 }}
        >
          {/* Solid, in the map's own colors. (The family's 3D characters will stand on it.) */}
          <Slab
            d={shape.d}
            bounds={shape.bounds}
            centroid={shape.centroid}
            w={w}
            h={h}
            ground={gold ? GOLD_GROUND : CLAIMED_GROUND}
            edge={gold ? "#a87306" : "#0b5c63"}
          >
            {null}
          </Slab>
        </motion.div>
      </div>
    </div>
  );
}
