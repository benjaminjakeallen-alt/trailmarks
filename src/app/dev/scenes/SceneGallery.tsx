"use client";

import { useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import StateStage from "@/components/stage3d/StateStage";
import { SCENE_CODES } from "@/components/stage3d/scenes";
import { getUsGeometry } from "@/lib/usGeo";
import type { Member } from "@/lib/types";

const COLORS = ["#e5483a", "#2f6fde", "#7c4ddb", "#138a4a", "#d6336c", "#c2610f", "#0e7490", "#5b6b12"];
const NAMES = ["Ben", "Mom", "Dad", "Ava", "Leo", "Gran", "Pop", "Ivy", "Max", "Zoe"];
const family = (n: number): Member[] =>
  NAMES.slice(0, n).map((displayName, i) => ({ userId: `dev-${i}`, displayName, color: COLORS[i % COLORS.length], avatarUrl: null }));

const noSubscribe = () => () => {};

/** Every state's 3D scene on its own patch of map, for tuning. ?only=UT shows one. */
export default function SceneGallery() {
  // Client only: WebGL and the state shapes live in the browser.
  const ready = useSyncExternalStore(noSubscribe, () => true, () => false);
  const params = useSearchParams();
  const geo = getUsGeometry();
  if (!ready) return null;
  const only = params.get("only")?.toUpperCase();
  const n = Number(params.get("n") ?? 5);
  const turn = Number(params.get("turn") ?? 0);
  const SIZE = { w: Number(params.get("w") ?? 720), h: Number(params.get("h") ?? 450) };
  const codes = only ? [only] : [...SCENE_CODES, "OH"];
  return (
    <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-4 p-4 xl:grid-cols-2">
      {codes.map((code) => (
        <div
          key={code}
          data-scene={code}
          className="relative overflow-hidden rounded-3xl bg-surface ring-1 ring-line"
          style={{ width: SIZE.w, height: SIZE.h }}
        >
          <StateStage
            shape={geo.byCode[code === "LAB" ? "CO" : code]}
            sceneCode={code}
            size={SIZE}
            members={family(n)}
            gold={code === "TN"}
            turn={turn}
          />
        </div>
      ))}
    </div>
  );
}
