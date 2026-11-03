"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Look } from "@/lib/look";

const CharacterPreview = dynamic(() => import("@/components/stage3d/CharacterPreview"), { ssr: false });

const BASE: Look = { gender: "female", hairStyle: "long", facialHair: "none", extra: "none", top: "tee", bottom: "jeans", shoes: "sneakers", shoeColor: "#ebe8e1", body: "rogue", legs: "rogue", cape: false, hat: false, skin: "#e0b597", hair: "#7c5236", outfit: "#46658a", pants: "#3d4a63", size: "adult", build: "normal", headShape: "oval", glasses: "none", headwear: "none", gear: "none" };
const M: Partial<Look> = { gender: "male", body: "knight", outfit: "#3f6a52" };
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
  audit: (["rogue", "barbarian", "knight", "mage"] as const).flatMap((body) =>
    (["kid", "adult"] as const).map((size, i) => ({
      ...BASE,
      body,
      legs: body,
      size,
      build: (i ? "thick" : "thin") as Look["build"],
      headShape: (["round", "square", "heart", "long"] as const)[["rogue", "barbarian", "knight", "mage"].indexOf(body)],
      gender: (i ? "male" : "female") as Look["gender"],
      hairStyle: (i ? "tousled" : "ponytail") as Look["hairStyle"],
      headwear: (i ? "cowboy" : "party") as Look["headwear"],
      glasses: "round" as Look["glasses"],
      gear: "backpack" as Look["gear"],
    })),
  ),
  heights: (["rogue", "barbarian", "knight", "mage"] as const).flatMap((body) =>
    (["female", "male"] as const).flatMap((gender) =>
      (gender === "female" ? (["long", "ponytail", "bald"] as const) : (["bald", "tousled", "rugged"] as const)).map((hairStyle) => ({
        ...BASE,
        body,
        legs: body,
        gender,
        hairStyle: hairStyle as Look["hairStyle"],
        facialHair: (gender === "male" && hairStyle === "rugged" ? "beard" : "none") as Look["facialHair"],
      })),
    ),
  ),
  bald2: (["#f0d4c1", "#c79474", "#4c3226"] as const).flatMap((skin, i) => [
    { ...BASE, skin, hairStyle: "bald" as Look["hairStyle"], headShape: (["oval", "round", "heart"] as const)[i] },
    { ...BASE, ...M, skin, hairStyle: "bald" as Look["hairStyle"], headShape: (["oval", "square", "long"] as const)[i] },
  ]),
  kit: [
    { ...BASE, gear: "backpack", build: "thin" as Look["build"] },
    { ...BASE, ...M, gear: "backpack", build: "thick" as Look["build"], top: "hoodie", hairStyle: "buzz" },
    { ...BASE, gear: "scarf", top: "sweater", outfit: "#2f6b6e" },
    { ...BASE, ...M, gear: "camera", top: "polo", hairStyle: "neat", extra: "chain" },
    { ...BASE, ...M, gear: "binoculars", build: "thick" as Look["build"], top: "buttonup", extra: "bowtie", hairStyle: "bald" },
    { ...BASE, gear: "canteen", extra: "pearls", top: "dress", outfit: "#46658a" },
    { ...BASE, extra: "watch", top: "tank", bottom: "shorts", build: "thin" as Look["build"] },
    { ...BASE, ...M, top: "jacket", build: "thick" as Look["build"], size: "teen" as Look["size"], hairStyle: "spiky" },
  ],
  wear2: [
    { ...BASE, top: "dress", outfit: "#a5483c", shoes: "sandals", shoeColor: "#6b4b33", hairStyle: "ponytail" },
    { ...BASE, top: "tank", outfit: "#c2a052", bottom: "shorts", pants: "#3d4a63", shoes: "sandals", shoeColor: "#a5483c", hairStyle: "bun" },
    { ...BASE, ...M, top: "tee", outfit: "#a5483c", bottom: "shorts", pants: "#b09a72", shoes: "sneakers", hairStyle: "tousled" },
    { ...BASE, top: "longsleeve", outfit: "#d6cdb8", bottom: "skirt", pants: "#46658a", shoes: "boots", shoeColor: "#6b4b33", hairStyle: "long" },
  ],
  wear: [
    { ...BASE, top: "tee", bottom: "jeans", shoes: "sneakers" },
    { ...BASE, ...M, top: "hoodie", bottom: "cargo", shoes: "hikers", shoeColor: "#6b4b33", hairStyle: "tousled" },
    { ...BASE, top: "dress", outfit: "#a5483c", shoes: "sandals", shoeColor: "#6b4b33", hairStyle: "ponytail" },
    { ...BASE, ...M, top: "buttonup", outfit: "#46658a", bottom: "chinos", pants: "#b09a72", shoes: "boots", shoeColor: "#6b4b33", hairStyle: "neat" },
    { ...BASE, top: "striped", outfit: "#2f3f5a", bottom: "skirt", pants: "#454c52", shoes: "slipons", shoeColor: "#2e3236", hairStyle: "bob" },
    { ...BASE, ...M, top: "jacket", outfit: "#6d7b48", bottom: "jeans", shoes: "sneakers", hairStyle: "buzz" },
    { ...BASE, top: "tank", outfit: "#c2a052", bottom: "shorts", pants: "#3d4a63", shoes: "sandals", shoeColor: "#a5483c", hairStyle: "bun" },
    { ...BASE, ...M, top: "sweater", outfit: "#8b4a5c", bottom: "leggings", pants: "#2e3236", shoes: "rainboots", shoeColor: "#c2a052", hairStyle: "bald", build: "thick" as Look["build"] },
    { ...BASE, ...M, top: "polo", outfit: "#2f6b6e", bottom: "shorts", pants: "#b09a72", shoes: "sneakers", hairStyle: "spiky", size: "kid" as Look["size"] },
  ],
  afro: [
    { ...BASE, ...M, hairStyle: "afro", hair: "#231a17", skin: "#4c3226" },
    { ...BASE, ...M, hairStyle: "afro", headwear: "safari" },
    { ...BASE, hairStyle: "afro", hair: "#8c4128" },
    { ...BASE, ...M, hairStyle: "afro", headwear: "pirate", headShape: "long" },
  ],
  shapes: (["oval", "round", "square", "long", "heart"] as const).flatMap((headShape) => [
    { ...BASE, headShape, hairStyle: "bob" as Look["hairStyle"], glasses: "round" as Look["glasses"] },
    { ...BASE, ...M, headShape, hairStyle: "buzz" as Look["hairStyle"], facialHair: "goatee" as Look["facialHair"], headwear: (headShape === "long" ? "cowboy" : "none") as Look["headwear"] },
  ]),
  fit: [
    { ...BASE, hairStyle: "long", glasses: "round", headwear: "cap", extra: "hoops" },
    { ...BASE, hairStyle: "bald", glasses: "square", headwear: "cowboy", extra: "studs" },
    { ...BASE, hairStyle: "ponytail", glasses: "sun", headwear: "beanie", extra: "flower", body: "mage" },
    { ...BASE, hairStyle: "bob", extra: "headband", body: "knight", glasses: "round" },
    { ...BASE, ...M, hairStyle: "bald", glasses: "round", facialHair: "mustache", headwear: "fedora" },
    { ...BASE, ...M, hairStyle: "tousled", glasses: "square", facialHair: "goatee", headwear: "safari", body: "mage" },
    { ...BASE, ...M, hairStyle: "afro", glasses: "sun", headwear: "tophat", skin: "#5f3b27", hair: "#231a17", body: "rogue" },
    { ...BASE, ...M, hairStyle: "rugged", facialHair: "beard", headwear: "viking", body: "barbarian", glasses: "round" },
    { ...BASE, ...M, hairStyle: "neat", facialHair: "stubble", headwear: "ranger" },
    { ...BASE, ...M, hairStyle: "spiky", headwear: "party", glasses: "square", hair: "#e6c77f" },
  ],
  hats2: (["cap", "propeller", "safari", "beanie", "pirate", "tophat", "viking", "cowboy"] as const).map((headwear, i) => ({
    ...BASE,
    ...(i % 2 || i === 4 ? M : {}),
    hairStyle: (["long", "tousled", "ponytail", "bald", "afro", "afro", "long", "spiky"] as const)[i] as Look["hairStyle"],
    headwear: headwear as Look["headwear"],
  })),
  hats: (["cap", "beanie", "bow", "safari", "fedora", "ranger", "bucket", "bandana", "headlamp", "captain", "cowboy", "party", "propeller", "crown", "tophat", "pirate", "chef", "viking", "unicorn", "catears", "bunny", "flowers", "santa"] as const).map((headwear, i) => ({
    ...BASE,
    ...(i % 2 ? M : {}),
    hairStyle: (["long", "bald", "ponytail", "afro", "bob", "tousled", "curly", "neat", "pixie", "spiky", "bun", "buzz"] as const)[i % 12] as Look["hairStyle"],
    headwear: headwear as Look["headwear"],
  })),
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
const LOOKS: Look[] = pick === SETS.mix || pick === SETS.audit ? pick : pick.map((l) => ({ ...l, legs: l.body }));

const big = typeof window !== "undefined" && window.location.search.includes("big");

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
    <div className="flex flex-wrap gap-4 p-6" data-portraits>
      {urls.map((u) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={u} src={u} alt="" className={big ? "h-56 w-56 rounded-full" : "h-24 w-24 rounded-full"} />
      ))}
    </div>
  );
}

/** ?measure: each look's model height and head metrics, as JSON (for tuning fit). */
function Measure() {
  const [out, setOut] = useState("");
  useEffect(() => {
    void import("@/components/stage3d/cast").then(async ({ makeActor }) => {
      const rows: unknown[] = [];
      for (const [i, look] of LOOKS.entries()) {
        const a = await makeActor({ userId: `m-${i}`, displayName: "M", color: look.outfit, avatarUrl: null }, look);
        rows.push({ i, body: look.body, gender: look.gender, hair: look.hairStyle, size: look.size, build: look.build, height: +a.height.toFixed(4), head: a.fit && { ...a.fit, profile: undefined } });
        a.dispose();
      }
      setOut(JSON.stringify(rows));
    });
  }, []);
  return <pre data-measure>{out}</pre>;
}

/** ?look: an idling character glancing up and to the side; the head's turn over time. */
function Look() {
  const [out, setOut] = useState("");
  useEffect(() => {
    void import("@/components/stage3d/cast").then(async ({ makeActor }) => {
      const THREE = await import("three");
      const rows: string[] = [];
      for (const clip of ["Idle", "Cheer", "Sit_Chair_Idle"] as const) {
        const a = await makeActor({ userId: "look", displayName: "L", color: "#46658a", avatarUrl: null }, LOOKS[0]);
        a.play(clip, { fade: 0 });
        a.lookAt(new THREE.Vector3(2, 3, 1));
        const ys: number[] = [];
        for (let f = 0; f < 240; f++) {
          a.update(1 / 60);
          if (f % 30 === 29) ys.push(Math.round(new THREE.Euler().setFromQuaternion(a.head!.quaternion).y * 100) / 100);
        }
        rows.push(`${clip}: ${ys.join(" ")}`);
        a.dispose();
      }
      setOut(rows.join("\n"));
    });
  }, []);
  return <pre data-measure>{out}</pre>;
}

export default function CharacterLab() {
  if (typeof window !== "undefined" && window.location.search.includes("look")) return <Look />;
  if (typeof window !== "undefined" && window.location.search.includes("measure")) return <Measure />;
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
