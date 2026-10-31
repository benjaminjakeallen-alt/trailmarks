"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Look } from "@/lib/look";

const CharacterPreview = dynamic(() => import("@/components/stage3d/CharacterPreview"), { ssr: false });

const BASE: Look = { body: "rogue", hat: false, skin: "#f1bf98", hair: "#e6c77f", outfit: "#2f7fd6", pants: "#3a4a6b", size: "adult", build: "normal", glasses: "none", headwear: "none", gear: "none" };
const LOOKS: Look[] = [
  { ...BASE, headwear: "safari", gear: "backpack" },
  { ...BASE, body: "barbarian", skin: "#8e5a3a", hair: "#231a17", outfit: "#e2483d", build: "thick", headwear: "fedora", gear: "binoculars" },
  { ...BASE, body: "knight", skin: "#dca27a", hair: "#b0442a", outfit: "#3bb54a", headwear: "ranger", gear: "camera" },
  { ...BASE, body: "mage", skin: "#f8d9c0", hair: "#c58a4f", outfit: "#e45b8a", size: "kid", headwear: "bucket", gear: "scarf" },
  { ...BASE, skin: "#5f3b27", hair: "#231a17", outfit: "#f5c542", headwear: "bandana", gear: "canteen" },
  { ...BASE, body: "barbarian", skin: "#bb7f57", hair: "#8d8d8d", outfit: "#2fb59a", headwear: "headlamp", gear: "backpack" },
  { ...BASE, body: "mage", skin: "#f1bf98", hair: "#ececec", outfit: "#2f7fd6", build: "thin", headwear: "captain", gear: "binoculars" },
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
          <CharacterPreview
            member={{ userId: `lab-${i}`, displayName: "Lab", color: look.outfit, avatarUrl: null }}
            look={look}
            facing={typeof window !== "undefined" && window.location.search.includes("back") ? Math.PI : 0}
          />
        </div>
      ))}
    </div>
    </>
  );
}
