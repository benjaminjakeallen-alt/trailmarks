"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Look } from "@/lib/look";

const CharacterPreview = dynamic(() => import("@/components/stage3d/CharacterPreview"), { ssr: false });

const LOOKS: Look[] = [
  { body: "rogue", hat: false, skin: "#f1bf98", hair: "#e6c77f", outfit: "#2f7fd6", pants: "#3a4a6b", size: "adult", glasses: "round", headwear: "none" },
  { body: "barbarian", hat: false, skin: "#8e5a3a", hair: "#231a17", outfit: "#e2483d", pants: "#2b2b30", size: "adult", glasses: "sun", headwear: "cap" },
  { body: "knight", hat: false, skin: "#dca27a", hair: "#b0442a", outfit: "#3bb54a", pants: "#2b2b30", size: "teen", glasses: "square", headwear: "beanie" },
  { body: "mage", hat: false, skin: "#f8d9c0", hair: "#c58a4f", outfit: "#e45b8a", pants: "#c9a46a", size: "kid", glasses: "none", headwear: "bow" },
  { body: "rogue", hat: false, skin: "#5f3b27", hair: "#231a17", outfit: "#f5c542", pants: "#7a5232", size: "adult", glasses: "none", headwear: "cowboy" },
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
