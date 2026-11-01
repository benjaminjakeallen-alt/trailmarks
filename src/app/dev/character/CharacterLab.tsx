"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Look } from "@/lib/look";

const CharacterPreview = dynamic(() => import("@/components/stage3d/CharacterPreview"), { ssr: false });

const BASE: Look = { gender: "female", hairStyle: "long", facialHair: "none", extra: "none", body: "rogue", legs: "rogue", cape: true, hat: false, skin: "#f1bf98", hair: "#8a5532", outfit: "#2f7fd6", pants: "#3a4a6b", size: "adult", build: "normal", glasses: "none", headwear: "none", gear: "none" };
const M: Partial<Look> = { gender: "male", body: "knight", outfit: "#3bb54a" };
const SETS: Record<string, Look[]> = {
  f1: [
    { ...BASE, hairStyle: "long", extra: "studs" },
    { ...BASE, hairStyle: "ponytail", extra: "hoops" },
    { ...BASE, hairStyle: "bun", extra: "pearls", hair: "#231a17", skin: "#8e5a3a" },
    { ...BASE, hairStyle: "pigtails", extra: "flower", hair: "#e6c77f" },
    { ...BASE, hairStyle: "bob", extra: "headband", hair: "#b0442a" },
    { ...BASE, hairStyle: "braid", hair: "#c58a4f" },
    { ...BASE, hairStyle: "curly", hair: "#231a17", skin: "#5f3b27" },
    { ...BASE, hairStyle: "pixie", extra: "watch" },
  ],
  bald: [
    { ...BASE, ...M, body: "rogue", hairStyle: "bald" },
    { ...BASE, ...M, body: "barbarian", hairStyle: "bald" },
    { ...BASE, ...M, body: "knight", hairStyle: "bald" },
    { ...BASE, ...M, body: "mage", hairStyle: "bald" },
  ],
  fun: [
    { ...BASE, headwear: "party", outfit: "#e45b8a" },
    { ...BASE, ...M, headwear: "propeller" },
    { ...BASE, headwear: "crown", hairStyle: "bun" },
    { ...BASE, ...M, headwear: "tophat", facialHair: "mustache" },
    { ...BASE, ...M, headwear: "pirate", facialHair: "beard", hairStyle: "bald" },
    { ...BASE, ...M, headwear: "chef", facialHair: "mustache" },
    { ...BASE, ...M, headwear: "viking", facialHair: "beard", hair: "#b0442a" },
    { ...BASE, headwear: "unicorn", hair: "#e6c77f" },
    { ...BASE, headwear: "catears", outfit: "#3a3f45", hairStyle: "bob" },
    { ...BASE, size: "kid", headwear: "bunny", hairStyle: "pigtails" },
    { ...BASE, headwear: "flowers", hairStyle: "braid", hair: "#c58a4f" },
    { ...BASE, ...M, headwear: "santa", facialHair: "beard", hair: "#ececec" },
  ],
  m1: [
    { ...BASE, ...M, hairStyle: "bald", facialHair: "beard" },
    { ...BASE, ...M, hairStyle: "buzz", facialHair: "stubble", skin: "#8e5a3a", hair: "#231a17" },
    { ...BASE, ...M, hairStyle: "tousled", facialHair: "mustache", extra: "bowtie" },
    { ...BASE, ...M, hairStyle: "neat", facialHair: "goatee", hair: "#231a17", extra: "chain" },
    { ...BASE, ...M, hairStyle: "rugged", facialHair: "beard", hair: "#8a5532" },
    { ...BASE, ...M, hairStyle: "spiky", hair: "#e6c77f" },
    { ...BASE, ...M, hairStyle: "mohawk", hair: "#b0442a", extra: "studs" },
    { ...BASE, ...M, hairStyle: "afro", hair: "#231a17", skin: "#5f3b27" },
    { ...BASE, ...M, hairStyle: "manbun", facialHair: "beard", hair: "#4f3324" },
  ],
};
SETS.mix = [
  { ...BASE, gender: "male", hairStyle: "bald", body: "rogue", legs: "rogue" },
  { ...BASE, gender: "male", hairStyle: "bald", body: "barbarian", legs: "barbarian" },
  { ...BASE, gender: "female", hairStyle: "bald" as Look["hairStyle"], body: "mage", legs: "mage" },
  { ...BASE, gender: "male", hairStyle: "neat", body: "knight", legs: "rogue", cape: false },
  { ...BASE, gender: "female", hairStyle: "ponytail", body: "mage", legs: "barbarian", cape: false },
  { ...BASE, gender: "male", hairStyle: "tousled", body: "barbarian", legs: "knight" },
];
const pick = (SETS[(typeof window !== "undefined" && new URLSearchParams(window.location.search).get("set")) || "f1"] ?? SETS.f1);
// Every set but "mix" wears full costumes.
const LOOKS: Look[] = pick === SETS.mix ? pick : pick.map((l) => ({ ...l, legs: l.body }));

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
