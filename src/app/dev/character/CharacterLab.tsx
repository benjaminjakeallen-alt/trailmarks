"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Look } from "@/lib/look";

const CharacterPreview = dynamic(() => import("@/components/stage3d/CharacterPreview"), { ssr: false });

const BASE: Look = { body: "rogue", hat: false, skin: "#f1bf98", hair: "#e6c77f", outfit: "#2f7fd6", pants: "#3a4a6b", size: "adult", build: "normal", glasses: "none", headwear: "none" };
const LOOKS: Look[] = [
  { ...BASE, build: "thin" },
  BASE,
  { ...BASE, build: "thick" },
  { ...BASE, body: "barbarian", skin: "#8e5a3a", hair: "#231a17", outfit: "#e2483d", build: "thin", headwear: "cap" },
  { ...BASE, body: "barbarian", skin: "#8e5a3a", hair: "#231a17", outfit: "#e2483d", build: "thick", headwear: "cap", glasses: "sun" },
];

function Portraits() {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    let live = true;
    void import("@/components/stage3d/portrait").then(async ({ renderPortrait }) => {
      const out: string[] = [];
      for (const [i, look] of LOOKS.entries()) {
        const blob = await renderPortrait({ userId: `lab-${i}`, displayName: "Lab", color: look.outfit, avatarUrl: null }, look);
        out.push(URL.createObjectURL(blob));
      }
      if (live) setUrls(out);
    });
    return () => {
      live = false;
    };
  }, []);
  return (
    <div className="flex gap-4 p-6" data-portraits>
      {urls.map((u) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={u} src={u} alt="" className="h-24 w-24 rounded-full" />
      ))}
    </div>
  );
}

export default function CharacterLab() {
  return (
    <>
    <Portraits />
    <div className="flex flex-wrap gap-4 p-6" data-lab>
      {LOOKS.map((look, i) => (
        <div key={i} className="rounded-3xl bg-surface ring-1 ring-line">
          <CharacterPreview member={{ userId: `lab-${i}`, displayName: "Lab", color: look.outfit, avatarUrl: null }} look={look} />
        </div>
      ))}
    </div>
    </>
  );
}
