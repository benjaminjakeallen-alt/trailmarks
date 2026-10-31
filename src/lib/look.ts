import type { Member } from "@/lib/types";

/**
 * A person's 3D character: which body, hat on or off, and the colors that make
 * it theirs. Saved per person (profiles.character) and safe to import anywhere;
 * the three.js side lives in components/stage3d.
 */

export const BODIES = ["rogue", "barbarian", "knight", "mage"] as const;
export type Body = (typeof BODIES)[number];

export const SIZES = ["kid", "teen", "adult"] as const;
export type Size = (typeof SIZES)[number];
export const GLASSES = ["none", "round", "square", "sun"] as const;
export type Glasses = (typeof GLASSES)[number];
export const HEADWEAR = ["none", "cap", "beanie", "bow", "cowboy"] as const;
export type Headwear = (typeof HEADWEAR)[number];

export interface Look {
  body: Body;
  /** The body's own hat (bear hat, helmet, wizard hat); the explorer has none. */
  hat: boolean;
  skin: string;
  hair: string;
  outfit: string;
  pants: string;
  size: Size;
  glasses: Glasses;
  /** Extra headwear; replaces the body's own hat. */
  headwear: Headwear;
}

/** How tall each size stands, relative to an adult. */
export const SIZE_SCALE: Record<Size, number> = { kid: 0.76, teen: 0.88, adult: 1 };
export const SIZE_LABELS: Record<Size, string> = { kid: "Kid", teen: "Teen", adult: "Grown-up" };
export const GLASSES_LABELS: Record<Glasses, string> = { none: "None", round: "Round", square: "Square", sun: "Shades" };
export const HEADWEAR_LABELS: Record<Headwear, string> = { none: "None", cap: "Cap", beanie: "Beanie", bow: "Bow", cowboy: "Cowboy hat" };
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
  return {
    body: BODIES[h % BODIES.length],
    hat: false,
    skin: SKIN_TONES[(h >>> 3) % SKIN_TONES.length],
    hair: HAIR_COLORS[(h >>> 7) % 6],
    outfit: member.color,
    pants: PANTS_COLORS[(h >>> 11) % 3],
    size: "adult",
    glasses: "none",
    headwear: "none",
  };
}

/** Something fun and random, for the dice button. */
export function randomLook(): Look {
  const any = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];
  const headwear = Math.random() < 0.5 ? "none" : any(HEADWEAR);
  return {
    body: any(BODIES),
    hat: headwear === "none" && Math.random() < 0.3,
    skin: any(SKIN_TONES),
    hair: any(HAIR_COLORS),
    outfit: any(OUTFIT_COLORS),
    pants: any(PANTS_COLORS),
    size: any(SIZES),
    glasses: Math.random() < 0.6 ? "none" : any(GLASSES),
    headwear,
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
  return {
    body: one(BODIES, v.body, fallback.body),
    hat: headwear === "none" && (typeof v.hat === "boolean" ? v.hat : fallback.hat),
    skin: hex(v.skin, fallback.skin),
    hair: hex(v.hair, fallback.hair),
    outfit: hex(v.outfit, fallback.outfit),
    pants: hex(v.pants, fallback.pants),
    size: one(SIZES, v.size, fallback.size),
    glasses: one(GLASSES, v.glasses, fallback.glasses),
    headwear,
  };
}

/** A member's look: what they saved, or their default. */
export const lookOf = (member: Member) => parseLook(member.character, defaultLook(member));
