"use client";

import { motion } from "framer-motion";
import { Slab, TILT, useCast } from "@/components/scenes/diorama";
import { CAMPFIRE, DIORAMAS, type Diorama } from "@/components/scenes/dioramaScenes";
import { MAP_WIDTH, type StateShape } from "@/lib/usGeo";
import type { Member } from "@/lib/types";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function Cast({ scene, members }: { scene: Diorama; members: Member[] }) {
  const cast = useCast(members);
  const { Play } = scene;
  return <Play cast={cast} />;
}

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
  members,
  gold,
  turn,
}: {
  shape: StateShape;
  size: { w: number; h: number };
  members: Member[];
  gold: boolean;
  turn: number;
}) {
  const scene = sceneFor(shape.code, turn);
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
    <div className="pointer-events-none absolute inset-0 z-[6]" aria-label={`${shape.info.name}: ${scene.title}`} role="img">
      <motion.div
        className="absolute inset-0 bg-bg/45"
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
          <Slab d={shape.d} bounds={shape.bounds} centroid={shape.centroid} w={w} h={h} ground={scene.ground} edge={gold ? "#b47a06" : scene.edge}>
            <Cast key={`${shape.code}-${turn}-${members.map((m) => m.userId).join(",")}`} scene={scene} members={members} />
          </Slab>
        </motion.div>
        <motion.p
          className="absolute left-1/2 top-[88%] -translate-x-1/2 whitespace-nowrap rounded-full bg-elevated/95 px-3 py-1 text-[12.5px] font-semibold text-ink shadow-[var(--shadow-card)] ring-1 ring-line"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.5 }}
        >
          {gold && <span className="mr-1">✨</span>}
          {scene.title}
        </motion.p>
      </div>
    </div>
  );
}
