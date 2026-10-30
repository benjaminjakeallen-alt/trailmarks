import type { Member } from "@/lib/types";

/**
 * A person's 3D character: which body, hat on or off, and the colors that make
 * it theirs. Saved per person (profiles.character) and safe to import anywhere;
 * the three.js side lives in components/stage3d.
 */

export const BODIES = ["rogue", "barbarian", "knight", "mage"] as const;
export type Body = (typeof BODIES)[number];

export interface Look {
  body: Body;
  /** Bear hat, knight's helmet, wizard hat; the explorer has none. */
  hat: boolean;
  skin: string;
  hair: string;
  outfit: string;
}

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
  };
}

const HEX = /^#[0-9a-f]{6}$/i;

/** A saved look, checked field by field; anything missing or odd falls back. */
export function parseLook(value: unknown, fallback: Look): Look {
  if (!value || typeof value !== "object") return fallback;
  const v = value as Partial<Look>;
  const hex = (c: unknown, d: string) => (typeof c === "string" && HEX.test(c) ? c.toLowerCase() : d);
  return {
    body: BODIES.includes(v.body as Body) ? (v.body as Body) : fallback.body,
    hat: typeof v.hat === "boolean" ? v.hat : fallback.hat,
    skin: hex(v.skin, fallback.skin),
    hair: hex(v.hair, fallback.hair),
    outfit: hex(v.outfit, fallback.outfit),
  };
}

/** A member's look: what they saved, or their default. */
export const lookOf = (member: Member) => parseLook(member.character, defaultLook(member));
