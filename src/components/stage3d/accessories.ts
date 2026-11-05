import * as THREE from "three";
import { box, cyl, mat } from "@/components/stage3d/props";
import type { Gear, Glasses, Headwear } from "@/lib/look";
import { HAT_BAND, type HeadFit } from "@/components/stage3d/fit";
import { buildHat } from "@/components/stage3d/hats";

/**
 * Glasses and headwear for the characters, sized in stage units for a 1.55-tall
 * person and placed in the head bone's space (its origin is at the neck; the
 * big chibi head sits above it). Glasses are built on the measured head; hats
 * are made on one standard head and fitted to the real one (fitHat).
 */


/** Glasses on this head's eyes, the arms running back to its ears. */
export function glasses(kind: Glasses, fit: HeadFit): THREE.Object3D | null {
  if (kind === "none") return null;
  const g = new THREE.Group();
  const frame = kind === "sun" ? "#1d1d22" : kind === "round" ? "#6b4a2a" : "#2b2b30";
  // Each lens rings its eye; the two meet over the nose.
  const r = THREE.MathUtils.clamp(fit.eyeX * 0.6, 0.06, 0.1);
  const t = r * 0.2;
  const lens = (x: number) => {
    const shape =
      kind === "square"
        ? new THREE.Mesh(new THREE.TorusGeometry(r * 1.06, t, 4, 4), mat(frame))
        : new THREE.Mesh(new THREE.TorusGeometry(r, t, 6, 16), mat(frame));
    if (kind === "square") shape.rotation.z = Math.PI / 4;
    shape.position.set(x, 0, 0);
    g.add(shape);
    if (kind === "sun") {
      const dark = new THREE.Mesh(new THREE.CircleGeometry(r, 16), mat("#1d2733", { rough: 0.2 }));
      dark.position.set(x, 0, 0.002);
      g.add(dark);
    }
  };
  lens(-fit.eyeX);
  lens(fit.eyeX);
  const bridge = box(Math.max(0.02, fit.eyeX * 2 - r * 2 + t), t, t, frame);
  bridge.position.set(0, r * 0.1, 0);
  g.add(bridge);
  // Arms from the lenses' outer edges back along the sides of the head to the ears.
  const armX = Math.max(fit.eyeX + r, fit.faceX * 0.98);
  const depth = Math.max(0.12, fit.eyeZ + 0.03 - fit.earZ);
  for (const side of [-1, 1]) {
    const hinge = box(armX - fit.eyeX - r + t, t, t, frame);
    hinge.position.set(side * (fit.eyeX + r + (armX - fit.eyeX - r) / 2), 0, 0);
    const arm = box(t, t, depth, frame);
    arm.position.set(side * armX, 0, -depth / 2);
    g.add(hinge, arm);
  }
  g.position.set(0, fit.eyeY, fit.eyeZ + 0.035);
  return g;
}

/** A hat by name (built in hats.ts), ready for fitHat to put on the real head. */
export function headwear(kind: Headwear, color: string): THREE.Object3D | null {
  return buildHat(kind, color, HAT_BAND);
}

/** Where gear sits relative to the chest bone (stage units, a 1.55-tall person). */
export const CHEST = { frontZ: 0.17, backZ: -0.17, neckY: 0.17 } as const;

/** The torso it's worn on, in the chest bone's space: how far its front, back and sides are, and its shoulders' top. */
export interface Torso {
  front: number;
  back: number;
  side: number;
  /** The hips' half-width, for things hung at the hip. */
  hip: number;
  shoulder: number;
}

/** Adventure gear, placed on the torso as measured (so a backpack sits on a thick back, not inside it). */
export function gear(kind: Gear, color: string, body: Torso): { object: THREE.Object3D; bone: "chest" | "hips" } | null {
  if (kind === "none") return null;
  const g = new THREE.Group();
  const width = body.side / 0.21;
  if (kind === "backpack") {
    // The pack against the back, its straps over the shoulders and down the front.
    const pack = new THREE.Group();
    const bag = box(0.34 * Math.min(1.2, width), 0.36, 0.16, color);
    bag.position.y = -0.2;
    const flap = box(0.35 * Math.min(1.2, width), 0.1, 0.17, "#7a5232");
    flap.position.y = 0.02;
    const pocket = box(0.22, 0.12, 0.06, "#7a5232");
    pocket.position.set(0, -0.22, -0.1);
    const roll = cyl(0.065, 0.065, 0.36, "#4f6b3a", 10);
    roll.rotation.z = Math.PI / 2;
    roll.position.set(0, 0.1, 0.0);
    pack.add(bag, flap, pocket, roll);
    pack.position.z = -body.back - 0.085;
    g.add(pack);
    const leather = "#5b3a22";
    for (const x of [-0.11, 0.11]) {
      const down = box(0.045, 0.24, 0.018, leather);
      down.position.set(x, -0.02, body.front + 0.012);
      const over = box(0.045, 0.02, body.front + body.back + 0.03, leather);
      over.position.set(x, body.shoulder + 0.008, (body.front - body.back) / 2);
      g.add(down, over);
    }
    return { object: g, bone: "chest" };
  }
  if (kind === "binoculars") {
    for (const x of [-0.06, 0.06]) {
      const tube = cyl(0.045, 0.05, 0.14, "#2b2b30", 10);
      tube.rotation.x = Math.PI / 2;
      tube.position.set(x, 0, 0);
      g.add(tube);
    }
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 4, 20, Math.PI), mat("#5b3a22"));
    strap.position.set(0, 0.0, -0.06);
    strap.rotation.x = -0.3;
    g.add(strap);
    g.position.set(0, CHEST.neckY - 0.12, body.front + 0.05);
    return { object: g, bone: "chest" };
  }
  if (kind === "camera") {
    const shell = box(0.2, 0.12, 0.08, "#2b2b30");
    shell.position.y = -0.06;
    const lens = cyl(0.045, 0.045, 0.07, "#9aa4a8", 12);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 0, 0.06);
    const flash = box(0.05, 0.03, 0.02, "#fbf7f0");
    flash.position.set(0.06, 0.02, 0.04);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 4, 20, Math.PI), mat("#e2483d"));
    strap.position.set(0, 0.02, -0.05);
    strap.rotation.x = -0.3;
    g.add(shell, lens, flash, strap);
    g.position.set(0, CHEST.neckY - 0.1, body.front + 0.04);
    return { object: g, bone: "chest" };
  }
  if (kind === "scarf") {
    const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.17 * Math.max(1, width * 0.9), 0.06, 8, 20), mat(color));
    wrap.rotation.x = Math.PI / 2;
    const tail = box(0.09, 0.26, 0.04, color);
    tail.position.set(0.08, -0.12, 0.15 * width);
    tail.rotation.z = 0.15;
    g.add(wrap, tail);
    g.position.y = CHEST.neckY + 0.02;
    return { object: g, bone: "chest" };
  }
  // Canteen: on the hip, slung on a strap.
  const flask = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16), mat("#6b7d55"));
  flask.rotation.z = Math.PI / 2;
  flask.rotation.y = Math.PI / 2;
  const cap = cyl(0.025, 0.025, 0.04, "#2b2b30", 8);
  cap.position.y = 0.09;
  g.add(flask, cap);
  g.position.set(body.hip + 0.03, 0.09, 0.02);
  return { object: g, bone: "hips" };
}
