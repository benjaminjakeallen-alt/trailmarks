"use client";

import { useSyncExternalStore } from "react";
import StateDiorama from "@/components/scenes/StateDiorama";
import { DIORAMAS } from "@/components/scenes/dioramaScenes";
import { getUsGeometry } from "@/lib/usGeo";
import type { Member } from "@/lib/types";

const COLORS = ["#e5483a", "#2f6fde", "#7c4ddb", "#138a4a", "#d6336c", "#c2610f", "#0e7490", "#5b6b12"];
const NAMES = ["Ben", "Mom", "Dad", "Ava", "Leo", "Gran", "Pop", "Ivy", "Max", "Zoe"];
const family = (n: number): Member[] =>
  NAMES.slice(0, n).map((displayName, i) => ({ userId: `dev-${i}`, displayName, color: COLORS[i % COLORS.length], avatarUrl: null }));

const SIZE = { w: 560, h: 350 };

/** Every state's 3D scene on its own patch of map, for tuning. */
const noSubscribe = () => () => {};

export default function SceneGallery() {
  // Client only: the scenes measure the state shapes in the browser.
  const ready = useSyncExternalStore(noSubscribe, () => true, () => false);
  const geo = getUsGeometry();
  if (!ready) return null;
  const entries = [
    ...Object.entries(DIORAMAS).flatMap(([code, scenes]) => scenes.map((_, turn) => ({ code, turn, n: 5 }))),
    { code: "UT", turn: 0, n: 8 },
    { code: "OH", turn: 0, n: 4 },
    { code: "RI", turn: 0, n: 3 },
  ];
  return (
    <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-4 p-4 lg:grid-cols-2">
      {entries.map(({ code, turn, n }) => (
        <div
          key={`${code}-${turn}-${n}`}
          data-scene={`${code}-${turn}-${n}`}
          className="relative overflow-hidden rounded-3xl bg-elevated ring-1 ring-line"
          style={{ width: SIZE.w, height: SIZE.h }}
        >
          <StateDiorama shape={geo.byCode[code]} size={SIZE} members={family(n)} gold={code === "TN"} turn={turn} />
        </div>
      ))}
    </div>
  );
}
