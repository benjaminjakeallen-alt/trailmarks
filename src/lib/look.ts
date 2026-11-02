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
export const HEAD_SHAPES = ["oval", "round", "square", "long", "heart"] as const;
export type HeadShapeName = (typeof HEAD_SHAPES)[number];
export const HEAD_SHAPE_LABELS: Record<HeadShapeName, string> = { oval: "Oval", round: "Round", square: "Square", long: "Long", heart: "Heart" };
export const GLASSES = ["none", "round", "square", "sun"] as const;
export type Glasses = (typeof GLASSES)[number];
export const HEADWEAR = [
  "none", "safari", "fedora", "ranger", "bucket", "bandana", "headlamp", "captain", "cap", "beanie", "cowboy", "bow",
  "party", "propeller", "crown", "tophat", "pirate", "chef", "viking", "unicorn", "catears", "bunny", "flowers", "santa",
] as const;
/** The Hat tab's two groups (besides None and the outfit's own hat). */
export const ADVENTURE_HATS = ["safari", "fedora", "ranger", "bucket", "bandana", "headlamp", "captain", "cap", "beanie", "cowboy", "bow"] as const;
export const FUN_HATS = ["party", "propeller", "crown", "tophat", "pirate", "chef", "viking", "unicorn", "catears", "bunny", "flowers", "santa"] as const;
export type Headwear = (typeof HEADWEAR)[number];
export const GEAR = ["none", "backpack", "binoculars", "camera", "scarf", "canteen"] as const;
export type Gear = (typeof GEAR)[number];

// The wardrobe: tops, bottoms and shoes, built onto the body (stage3d/wardrobe.ts).
export const TOPS = ["tee", "longsleeve", "tank", "hoodie", "sweater", "striped", "buttonup", "polo", "jacket", "dress"] as const;
export type Top = (typeof TOPS)[number];
export const TOP_LABELS: Record<Top, string> = {
  tee: "T-shirt",
  longsleeve: "Long sleeve",
  tank: "Tank top",
  hoodie: "Hoodie",
  sweater: "Sweater",
  striped: "Striped tee",
  buttonup: "Button-up",
  polo: "Polo",
  jacket: "Jacket",
  dress: "Dress",
};

export const BOTTOMS = ["jeans", "chinos", "shorts", "skirt", "leggings", "cargo"] as const;
export type Bottom = (typeof BOTTOMS)[number];
export const BOTTOM_LABELS: Record<Bottom, string> = {
  jeans: "Jeans",
  chinos: "Chinos",
  shorts: "Shorts",
  skirt: "Skirt",
  leggings: "Leggings",
  cargo: "Cargo pants",
};

export const SHOES = ["sneakers", "boots", "hikers", "sandals", "rainboots", "slipons"] as const;
export type Shoe = (typeof SHOES)[number];
export const SHOE_LABELS: Record<Shoe, string> = {
  sneakers: "Sneakers",
  boots: "Boots",
  hikers: "Hiking boots",
  sandals: "Sandals",
  rainboots: "Rain boots",
  slipons: "Slip-ons",
};

export interface Look {
  gender: Gender;
  hairStyle: HairStyle;
  facialHair: FacialHair;
  /** Jewelry and finishing touches. */
  extra: Extra;
  /** What they wear: a top, bottoms and shoes (colored by outfit, pants and shoeColor). */
  top: Top;
  bottom: Bottom;
  shoes: Shoe;
  shoeColor: string;
  /** Older looks wore a whole costume; kept so old saves read, no longer drawn. */
  body: Body;
  legs: Body;
  cape: boolean;
  hat: boolean;
  skin: string;
  hair: string;
  outfit: string;
  pants: string;
  size: Size;
  build: Build;
  /** The shape of the head and jaw. */
  headShape: HeadShapeName;
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
  party: "Party hat",
  propeller: "Propeller cap",
  crown: "Crown",
  tophat: "Top hat",
  pirate: "Pirate hat",
  chef: "Chef's hat",
  viking: "Viking helmet",
  unicorn: "Unicorn horn",
  catears: "Cat ears",
  bunny: "Bunny ears",
  flowers: "Flower crown",
  santa: "Santa hat",
};
export const GEAR_LABELS: Record<Gear, string> = {
  none: "None",
  backpack: "Backpack",
  binoculars: "Binoculars",
  camera: "Camera",
  scarf: "Scarf",
  canteen: "Canteen",
};
// Natural, outdoor-gear colors (the app's own calm palette), not toy-box primaries.
export const SHOE_COLORS = ["#ebe8e1", "#2e3236", "#6b4b33", "#9a6a3f", "#46658a", "#a5483c", "#b09a72", "#6d7b48"];
/** What each old costume becomes in the wardrobe, so saved characters dress the same way. */
const COSTUME_CLOTHES: Record<Body, { top: Top; bottom: Bottom; shoes: Shoe }> = {
  rogue: { top: "longsleeve", bottom: "chinos", shoes: "boots" },
  barbarian: { top: "buttonup", bottom: "jeans", shoes: "hikers" },
  knight: { top: "jacket", bottom: "jeans", shoes: "boots" },
  mage: { top: "hoodie", bottom: "jeans", shoes: "sneakers" },
};
export const PANTS_COLORS = ["#3d4a63", "#2e3236", "#6b4b33", "#b09a72", "#56613d", "#858d91", "#7a3f30", "#d6cebc"];
/** The knight's legs are armor; there are no pants to color. */
export const HAS_PANTS: Record<Body, boolean> = { rogue: true, barbarian: true, knight: false, mage: true };

export const SKIN_TONES = ["#f0d4c1", "#e0b597", "#c79474", "#9f6d50", "#774e38", "#4c3226"];
export const HAIR_COLORS = ["#231a17", "#4a3326", "#7c5236", "#a97a4f", "#d2b47e", "#8c4128", "#8d8d8d", "#e2e0dc"];
export const OUTFIT_COLORS = ["#a5483c", "#b5713f", "#c2a052", "#6d7b48", "#3f6a52", "#2f6b6e", "#46658a", "#2f3f5a", "#6a5076", "#454c52", "#d6cdb8"];

/** Colors from before the natural palette, mapped to their new shades so old picks still match a swatch. */
const LEGACY: Record<string, string> = Object.fromEntries([
  ...zip(["#f8d9c0", "#f1bf98", "#dca27a", "#bb7f57", "#8e5a3a", "#5f3b27"], SKIN_TONES),
  ...zip(["#4f3324", "#8a5532", "#c58a4f", "#e6c77f", "#b0442a", "#ececec"], ["#4a3326", "#7c5236", "#a97a4f", "#d2b47e", "#8c4128", "#e2e0dc"]),
  ...zip(["#3a4a6b", "#2b2b30", "#7a5232", "#c9a46a", "#5b6b3a", "#9aa4a8", "#b0442a", "#f2ece0"], PANTS_COLORS),
]);
function zip(a: string[], b: string[]) {
  return a.map((x, i) => [x, b[i]] as const);
}

/**
 * Calm a color down to the app's natural look: no more saturated than a dyed
 * jacket, no darker than charcoal or lighter than canvas. Idempotent, so any
 * color (a vivid map color, an old saved pick) comes out in the same family.
 */
export function tone(hex: string, { maxS = 0.36, minL = 0.18, maxL = 0.78 } = {}): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const hi = Math.max(r, g, b);
  const lo = Math.min(r, g, b);
  let l = (hi + lo) / 2;
  const d = hi - lo;
  let s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = hi === r ? ((g - b) / d) % 6 : hi === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  s = Math.min(s, maxS);
  l = Math.min(maxL, Math.max(minL, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return `#${[r1, g1, b1].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("")}`;
}

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
    ...COSTUME_CLOTHES[body],
    shoeColor: SHOE_COLORS[(h >>> 15) % 4],
    body,
    legs: body,
    cape: false,
    hat: false,
    skin: SKIN_TONES[(h >>> 3) % SKIN_TONES.length],
    hair: HAIR_COLORS[(h >>> 7) % 6],
    outfit: tone(member.color),
    pants: PANTS_COLORS[(h >>> 11) % 3],
    size: "adult",
    build: "normal",
    headShape: "oval",
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
    top: any(TOPS),
    bottom: gender === "female" ? any(BOTTOMS) : any(BOTTOMS.filter((b) => b !== "skirt")),
    shoes: any(SHOES),
    shoeColor: any(SHOE_COLORS),
    body: "rogue",
    legs: "rogue",
    cape: false,
    hat: false,
    skin: any(SKIN_TONES),
    hair: any(HAIR_COLORS),
    outfit: any(OUTFIT_COLORS),
    pants: any(PANTS_COLORS),
    size: any(SIZES),
    build: any(BUILDS),
    headShape: any(HEAD_SHAPES),
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
  const hex = (c: unknown, d: string) => (typeof c === "string" && HEX.test(c) ? (LEGACY[c.toLowerCase()] ?? c.toLowerCase()) : d);
  const one = <T extends string>(xs: readonly T[], x: unknown, d: T) => (xs.includes(x as T) ? (x as T) : d);
  const headwear = one(HEADWEAR, v.headwear, fallback.headwear);
  const body = one(BODIES, v.body, fallback.body);
  // Looks saved before hairstyles keep the hair their outfit style came with.
  const legacy = v.hairStyle === undefined ? BODY_HAIR[body] : null;
  const gender = legacy ? legacy.gender : one(GENDERS, v.gender, fallback.gender);
  const hairStyle = legacy ? legacy.hair : one(HAIR_STYLES, v.hairStyle, fallback.hairStyle);
  const facialHair = legacy ? legacy.facial : one(FACIAL_HAIR, v.facialHair, fallback.facialHair);
  // Looks saved before the wardrobe wear what their costume becomes.
  const clothes = v.top === undefined && v.body !== undefined ? COSTUME_CLOTHES[body] : null;
  return {
    gender,
    hairStyle,
    facialHair: gender === "male" ? facialHair : "none",
    top: clothes ? clothes.top : one(TOPS, v.top, fallback.top),
    bottom: clothes ? clothes.bottom : one(BOTTOMS, v.bottom, fallback.bottom),
    shoes: clothes ? clothes.shoes : one(SHOES, v.shoes, fallback.shoes),
    shoeColor: hex(v.shoeColor, fallback.shoeColor),
    extra: one(EXTRAS, v.extra, fallback.extra),
    body,
    legs: one(BODIES, v.legs, body),
    cape: false,
    hat: false,
    skin: hex(v.skin, fallback.skin),
    hair: hex(v.hair, fallback.hair),
    outfit: hex(v.outfit, fallback.outfit),
    pants: hex(v.pants, fallback.pants),
    size: one(SIZES, v.size, fallback.size),
    build: one(BUILDS, v.build, fallback.build),
    headShape: one(HEAD_SHAPES, v.headShape, fallback.headShape),
    glasses: one(GLASSES, v.glasses, fallback.glasses),
    headwear,
    gear: one(GEAR, v.gear, fallback.gear),
  };
}

/** A member's look: what they saved, or their default. */
export const lookOf = (member: Member) => parseLook(member.character, defaultLook(member));
