"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { lookOf, type Look } from "@/lib/look";
import { sceneFor } from "@/components/stage3d/scenes";
import { Stage } from "@/components/stage3d/stage";
import { MAP_WIDTH, type StateShape } from "@/lib/usGeo";
import type { Member } from "@/lib/types";

/**
 * The tapped state rises out of the map as a solid 3D slab and the family acts
 * out the state's activity on it. Lives in the map's own box; `size` is that box.
 */
export default function StateStage({
  shape,
  size,
  members,
  gold,
  turn,
  sceneCode,
}: {
  shape: StateShape;
  size: { w: number; h: number };
  /** Who's been (up to 10 take turns on stage). */
  members: Member[];
  gold: boolean;
  turn: number;
  /** Development: play another state's scene on this shape. */
  sceneCode?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion() ?? false;
  // The stage is built once per open; later prop changes (a new size) only resize it.
  const stage = useRef<Stage | null>(null);
  const sizeRef = useRef(size);

  useEffect(() => {
    sizeRef.current = size;
    stage.current?.resize(size);
  }, [size]);

  useEffect(() => {
    if (!canvas.current) return;
    const s = sizeRef.current;
    const people: { member: Member; look: Look }[] = members.slice(0, 10).map((member) => ({
      member,
      look: lookOf(member),
    }));
    let instance: Stage;
    try {
      instance = new Stage({
        canvas: canvas.current,
        size: s,
        d: shape.d,
        bounds: shape.bounds,
        ppu: s.w / MAP_WIDTH,
        gold,
        dark: document.documentElement.dataset.theme === "dark",
        people,
        scene: sceneFor(sceneCode ?? shape.code, turn),
        reducedMotion: reduce,
      });
    } catch {
      // No WebGL (very old phones): the map simply stays as it is.
      return;
    }
    stage.current = instance;
    void instance.start();
    return () => {
      instance.dispose();
      stage.current = null;
    };
    // One stage per open: the parent remounts this with a new key for each double-tap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-[6]" aria-label={`${shape.info.name}, lifted`} role="img">
      <motion.div
        className="absolute inset-0 bg-canvas/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
      />
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
