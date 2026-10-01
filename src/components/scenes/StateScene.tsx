"use client";

import type { ComponentType } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Campfire from "@/components/family/Campfire";
import { useCast } from "@/components/scenes/stage";
import {
  Arizona,
  CaliforniaFireworks,
  CaliforniaSurf,
  Idaho,
  Nevada,
  NewMexico,
  Oregon,
  Utah,
  type SceneProps,
} from "@/components/scenes/westScenes";
import {
  Florida,
  Georgia,
  Louisiana,
  Michigan,
  NewYork,
  Tennessee,
  Texas,
  Wisconsin,
} from "@/components/scenes/eastScenes";
import { STATES_BY_CODE } from "@/lib/statesData";
import type { Member } from "@/lib/types";

type Scene = { title: string; Play: ComponentType<SceneProps> };

/** Each state's activity (some have more than one; they take turns on each tap). The rest keep the campfire. */
export const STATE_SCENES: Record<string, Scene[]> = {
  UT: [{ title: "44 oz sodas in the lawn chairs", Play: Utah }],
  CA: [
    { title: "Mouse ears and fireworks", Play: CaliforniaFireworks },
    { title: "Surf's up", Play: CaliforniaSurf },
  ],
  OR: [{ title: "Tillamook ice cream", Play: Oregon }],
  NV: [{ title: "Feeling lucky at the slots", Play: Nevada }],
  AZ: [{ title: "Climbing the cliff dwellings", Play: Arizona }],
  NM: [{ title: "Somebody's getting abducted", Play: NewMexico }],
  ID: [{ title: "Dig 'em up, bake 'em", Play: Idaho }],
  TX: [{ title: "Brisket on the smoker", Play: Texas }],
  FL: [{ title: "Tank tops on. Run!", Play: Florida }],
  NY: [{ title: "A real New York slice", Play: NewYork }],
  TN: [{ title: "Front row for the country queen", Play: Tennessee }],
  WI: [{ title: "Game day in green and gold", Play: Wisconsin }],
  MI: [{ title: "Everybody in the pickup", Play: Michigan }],
  LA: [{ title: "Jazz on the corner", Play: Louisiana }],
  GA: [{ title: "Picking peaches", Play: Georgia }],
};

function Stage({ scene, members }: { scene: Scene; members: Member[] }) {
  const cast = useCast(members);
  const { Play } = scene;
  return <Play cast={cast} />;
}

/**
 * The state's little activity, played by the people who've been there (five
 * at a time; bigger families rotate). `turn` picks between a state's scenes.
 * States without one get the campfire.
 */
export default function StateScene({
  code,
  members,
  gold = false,
  turn = 0,
  className = "",
}: {
  code: string;
  members: Member[];
  gold?: boolean;
  turn?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const scenes = STATE_SCENES[code];
  const info = STATES_BY_CODE[code];
  if (!members.length) return null;

  if (!scenes) {
    return (
      <div className={`flex flex-col items-center rounded-[1.25rem] bg-gradient-to-b from-[#12343a] to-[#0b2327] px-3 pb-2 pt-2 ${className}`}>
        <Campfire members={members} gold={gold} />
        <p className="-mt-1 text-center text-[12.5px] font-medium text-white/75">{info?.name} · round the campfire</p>
      </div>
    );
  }

  const scene = scenes[turn % scenes.length];
  return (
    <figure className={`overflow-hidden rounded-[1.25rem] bg-ink shadow-[var(--shadow-card)] ${className}`}>
      <div className="relative aspect-[15/8] w-full overflow-hidden [container-type:inline-size]">
        {/* Keyed by the line-up, so a different family (or more people) starts the scene fresh. */}
        <Stage key={`${code}-${turn}-${members.map((m) => m.userId).join(",")}`} scene={scene} members={members} />
        {gold && !reduce && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-[400] rounded-[1.25rem] ring-2 ring-inset ring-[#f5b929]"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </div>
      <figcaption className="flex items-center justify-between gap-2 bg-elevated px-3 py-1.5 text-[12.5px]">
        <span className="truncate font-semibold text-ink">{scene.title}</span>
        <span className="shrink-0 text-ink-3">
          {members.length > 5 ? `${members.length} taking turns` : info?.name}
        </span>
      </figcaption>
    </figure>
  );
}
