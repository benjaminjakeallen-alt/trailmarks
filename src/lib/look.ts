import type { Member } from "@/lib/types";

/**
 * A person's 3D character: which body, hat on or off, and the colors that make
 * it theirs. Saved per person (profiles.character) and safe to import anywhere;
 * the three.js side lives in components/stage3d.
 */

export const BODIES = ["rogue", "barbarian", "knight", "mage"] as const;
export type Body = (typeof BODIES)[number];

export const GENDERS = ["male", "female"] as const;
export type Gender = (typeof GENDERS)[number];
export const GENDER_LABELS: Record<Gender, string> = { male: "Male", female: "Female" };

/**
 * Hairstyles. "long", "tousled", "neat" and "rugged" are KayKit's own sculpted
 * hair (moved onto any body); the rest are built to match.
 */
export const HAIR_STYLES = [
  "long", "ponytail", "bun", "pigtails", "bob", "braid", "curly", "pixie",
  "bald", "buzz", "tousled", "neat", "rugged", "spiky", "mohawk", "afro", "manbun",
] as const;
export type HairStyle = (typeof HAIR_STYLES)[number];
export const HAIR_FOR: Record<Gender, HairStyle[]> = {
  female: ["long", "ponytail", "bun", "pigtails", "bob", "braid", "curly", "pixie", "tousled", "afro"],
  male: ["bald", "buzz", "tousled", "neat", "rugged", "spiky", "mohawk", "afro", "manbun", "curly"],
};
export const HAIR_LABELS: Record<HairStyle, string> = {
  long: "Long",
  ponytail: "Ponytail",
  bun: "Bun",
  pigtails: "Pigtails",
  bob: "Bob",
  braid: "Braid",
  curly: "Curly",
  pixie: "Pixie",
  bald: "Bald",
  buzz: "Buzz cut",
  tousled: "Tousled",
  neat: "Side part",
  rugged: "Receding",
  spiky: "Spiky",
  mohawk: "Mohawk",
  afro: "Afro",
  manbun: "Man bun",
};
export const FACIAL_HAIR = ["none", "stubble", "mustache", "goatee", "beard"] as const;
export type FacialHair = (typeof FACIAL_HAIR)[number];
export const FACIAL_HAIR_LABELS: Record<FacialHair, string> = {
  none: "None",
  stubble: "Stubble",
  mustache: "Mustache",
  goatee: "Goatee",
  beard: "Full beard",
};
export const EXTRAS = ["none", "studs", "hoops", "flower", "headband", "pearls", "bowtie", "chain", "watch"] as const;
export type Extra = (typeof EXTRAS)[number];
export const EXTRAS_FOR: Record<Gender, Extra[]> = {
  female: ["none", "studs", "hoops", "flower", "headband", "pearls", "watch"],
  male: ["none", "studs", "bowtie", "chain", "watch"],
};
export const EXTRA_LABELS: Record<Extra, string> = {
  none: "None",
  studs: "Earrings",
  hoops: "Hoops",
  flower: "Flower",
  headband: "Headband",
  pearls: "Pearls",
  bowtie: "Bow tie",
  chain: "Chain",
  watch: "Watch",
};
/** The hair each outfit style came with, for looks saved before hairstyles existed. */
export const BODY_HAIR: Record<Body, { gender: Gender; hair: HairStyle; facial: FacialHair }> = {
  rogue: { gender: "female", hair: "long", facial: "none" },
  barbarian: { gender: "male", hair: "rugged", facial: "beard" },
  knight: { gender: "male", hair: "tousled", facial: "none" },
  mage: { gender: "male", hair: "neat", facial: "none" },
};

export const SIZES = ["kid", "teen", "adult"] as const;
export type Size = (typeof SIZES)[number];
export const BUILDS = ["thin", "normal", "thick"] as const;
export type Build = (typeof BUILDS)[number];
export const GLASSES = ["none", "round", "square", "sun"] as const;
export type Glasses = (typeof GLASSES)[number];
export const HEADWEAR = [
  "none", "safari", "fedora", "ranger", "bucket", "bandana", "headlamp", "captain", "cap", "beanie", "cowboy", "bow",
] as const;
export type Headwear = (typeof HEADWEAR)[number];
export const GEAR = ["none", "backpack", "binoculars", "camera", "scarf", "canteen"] as const;
export type Gear = (typeof GEAR)[number];

export interface Look {
  gender: Gender;
  hairStyle: HairStyle;
  facialHair: FacialHair;
  /** Jewelry and finishing touches. */
  extra: Extra;
  body: Body;
  /** The body's own hat (bear hat, helmet, wizard hat); the explorer has none. */
  hat: boolean;
  skin: string;
  hair: string;
  outfit: string;
  pants: string;
  size: Size;
  build: Build;
  glasses: Glasses;
  /** Extra headwear; replaces the body's own hat. */
  headwear: Headwear;
  /** Adventure gear on the back, chest or hip. */
  gear: Gear;
}

/** How tall each size stands, relative to an adult. */
export const SIZE_SCALE: Record<Size, number> = { kid: 0.76, teen: 0.88, adult: 1 };
export const SIZE_LABELS: Record<Size, string> = { kid: "Kid", teen: "Teen", adult: "Grown-up" };
export const BUILD_LABELS: Record<Build, string> = { thin: "Thin", normal: "Normal", thick: "Thick" };
/** How wide the torso and the limbs get for each build. */
export const BUILD_WIDTH: Record<Build, { torso: number; limbs: number }> = {
  thin: { torso: 0.7, limbs: 0.74 },
  normal: { torso: 1, limbs: 1 },
  thick: { torso: 1.42, limbs: 1.3 },
};
export const GLASSES_LABELS: Record<Glasses, string> = { none: "None", round: "Round", square: "Square", sun: "Shades" };
export const HEADWEAR_LABELS: Record<Headwear, string> = {
  none: "None",
  safari: "Safari helmet",
  fedora: "Explorer fedora",
  ranger: "Ranger hat",
  bucket: "Bucket hat",
  bandana: "Bandana",
  headlamp: "Headlamp",
  captain: "Captain's hat",
  cap: "Cap",
  beanie: "Beanie",
  cowboy: "Cowboy hat",
  bow: "Bow",
};
export const GEAR_LABELS: Record<Gear, string> = {
  none: "None",
  backpack: "Backpack",
  binoculars: "Binoculars",
  camera: "Camera",
  scarf: "Scarf",
  canteen: "Canteen",
};
export const PANTS_COLORS = ["#3a4a6b", "#2b2b30", "#7a5232", "#c9a46a", "#5b6b3a", "#9aa4a8", "#b0442a", "#f2ece0"];
/** The knight's legs are armor; there are no pants to color. */
export const HAS_PANTS: Record<Body, boolean> = { rogue: true, barbarian: true, knight: false, mage: true };

export const SKIN_TONES = ["#f8d9c0", "#f1bf98", "#dca27a", "#bb7f57", "#8e5a3a", "#5f3b27"];
export const HAIR_COLORS = ["#231a17", "#4f3324", "#8a5532", "#c58a4f", "#e6c77f", "#b0442a", "#8d8d8d", "#ececec"];
export const OUTFIT_COLORS = ["#e2483d", "#f39a2b", "#f5c542", "#3bb54a", "#2fb59a", "#2f7fd6", "#7c4ddb", "#e45b8a", "#3a3f45", "#f2ece0"];
export const BODY_LABELS: Record<Body, string> = { rogue: "Explorer", barbarian: "Woodsman", knight: "Knight", mage: "Wizard" };
export const HAT_LABELS: Record<Body, string | null> = { rogue: null, barbarian: "Bear hat", knight: "Helmet", mage: "Wizard hat" };

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A starting look for someone who hasn't made one: steady per person, outfit in their map color. */
export function defaultLook(member: Pick<Member, "userId" | "color">): Look {
  const h = hash(member.userId);
  const body = BODIES[h % BODIES.length];
  return {
    gender: BODY_HAIR[body].gender,
    hairStyle: BODY_HAIR[body].hair,
    facialHair: BODY_HAIR[body].facial,
    extra: "none",
    body,
    hat: false,
    skin: SKIN_TONES[(h >>> 3) % SKIN_TONES.length],
    hair: HAIR_COLORS[(h >>> 7) % 6],
    outfit: member.color,
    pants: PANTS_COLORS[(h >>> 11) % 3],
    size: "adult",
    build: "normal",
    glasses: "none",
    headwear: "none",
    gear: "none",
  };
}

/** Something fun and random, for the dice button. */
export function randomLook(): Look {
  const any = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];
  const headwear = Math.random() < 0.5 ? "none" : any(HEADWEAR);
  const gender = any(GENDERS);
  return {
    gender,
    hairStyle: any(HAIR_FOR[gender]),
    facialHair: gender === "male" && Math.random() < 0.5 ? any(FACIAL_HAIR) : "none",
    extra: Math.random() < 0.5 ? "none" : any(EXTRAS_FOR[gender]),
    body: any(BODIES),
    hat: headwear === "none" && Math.random() < 0.3,
    skin: any(SKIN_TONES),
    hair: any(HAIR_COLORS),
    outfit: any(OUTFIT_COLORS),
    pants: any(PANTS_COLORS),
    size: any(SIZES),
    build: any(BUILDS),
    glasses: Math.random() < 0.6 ? "none" : any(GLASSES),
    headwear,
    gear: Math.random() < 0.4 ? "none" : any(GEAR),
  };
}

const HEX = /^#[0-9a-f]{6}$/i;

/** A saved look, checked field by field; anything missing or odd falls back. */
export function parseLook(value: unknown, fallback: Look): Look {
  if (!value || typeof value !== "object") return fallback;
  const v = value as Partial<Look>;
  const hex = (c: unknown, d: string) => (typeof c === "string" && HEX.test(c) ? c.toLowerCase() : d);
  const one = <T extends string>(xs: readonly T[], x: unknown, d: T) => (xs.includes(x as T) ? (x as T) : d);
  const headwear = one(HEADWEAR, v.headwear, fallback.headwear);
  const body = one(BODIES, v.body, fallback.body);
  // Looks saved before hairstyles keep the hair their outfit style came with.
  const legacy = v.hairStyle === undefined ? BODY_HAIR[body] : null;
  const gender = legacy ? legacy.gender : one(GENDERS, v.gender, fallback.gender);
  const hairStyle = legacy ? legacy.hair : one(HAIR_STYLES, v.hairStyle, fallback.hairStyle);
  const facialHair = legacy ? legacy.facial : one(FACIAL_HAIR, v.facialHair, fallback.facialHair);
  return {
    gender,
    hairStyle,
    facialHair: gender === "male" ? facialHair : "none",
    extra: one(EXTRAS, v.extra, fallback.extra),
    body,
    hat: headwear === "none" && (typeof v.hat === "boolean" ? v.hat : fallback.hat),
    skin: hex(v.skin, fallback.skin),
    hair: hex(v.hair, fallback.hair),
    outfit: hex(v.outfit, fallback.outfit),
    pants: hex(v.pants, fallback.pants),
    size: one(SIZES, v.size, fallback.size),
    build: one(BUILDS, v.build, fallback.build),
    glasses: one(GLASSES, v.glasses, fallback.glasses),
    headwear,
    gear: one(GEAR, v.gear, fallback.gear),
  };
}

/** A member's look: what they saved, or their default. */
export const lookOf = (member: Member) => parseLook(member.character, defaultLook(member));
