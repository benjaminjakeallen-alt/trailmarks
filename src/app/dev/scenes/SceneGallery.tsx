"use client";

import StateScene, { STATE_SCENES } from "@/components/scenes/StateScene";
import type { Member } from "@/lib/types";

const COLORS = ["#e5483a", "#2f6fde", "#7c4ddb", "#138a4a", "#d6336c", "#c2610f", "#0e7490", "#5b6b12"];
const NAMES = ["Ben", "Mom", "Dad", "Ava", "Leo", "Gran", "Pop", "Ivy", "Max", "Zoe"];
const family = (n: number): Member[] =>
  NAMES.slice(0, n).map((displayName, i) => ({
    userId: `dev-${i}`,
    displayName,
    color: COLORS[i % COLORS.length],
    avatarUrl: null,
  }));

export default function SceneGallery() {
  const entries = Object.entries(STATE_SCENES).flatMap(([code, scenes]) => scenes.map((_, turn) => ({ code, turn })));
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map(({ code, turn }) => (
        <div key={`${code}-${turn}`} data-scene={`${code}-${turn}`}>
          <StateScene code={code} members={family(5)} turn={turn} />
        </div>
      ))}
      <div data-scene="rotation">
        <StateScene code="UT" members={family(8)} gold />
      </div>
      <div data-scene="solo">
        <StateScene code="NM" members={family(1)} />
      </div>
      <div data-scene="campfire">
        <StateScene code="OH" members={family(3)} />
      </div>
    </div>
  );
}
