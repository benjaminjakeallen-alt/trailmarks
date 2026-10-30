"use client";

import dynamic from "next/dynamic";
import type { Look } from "@/lib/look";

const CharacterPreview = dynamic(() => import("@/components/stage3d/CharacterPreview"), { ssr: false });

const LOOKS: Look[] = [
  { body: "rogue", hat: false, skin: "#f1bf98", hair: "#e6c77f", outfit: "#2f7fd6" },
  { body: "barbarian", hat: true, skin: "#8e5a3a", hair: "#231a17", outfit: "#e2483d" },
  { body: "knight", hat: false, skin: "#dca27a", hair: "#b0442a", outfit: "#3bb54a" },
  { body: "mage", hat: true, skin: "#f8d9c0", hair: "#8d8d8d", outfit: "#7c4ddb" },
];

export default function CharacterLab() {
  return (
    <div className="flex flex-wrap gap-4 p-6" data-lab>
      {LOOKS.map((look, i) => (
        <div key={i} className="rounded-3xl bg-surface ring-1 ring-line">
          <CharacterPreview member={{ userId: `lab-${i}`, displayName: "Lab", color: look.outfit, avatarUrl: null }} look={look} />
        </div>
      ))}
    </div>
  );
}
