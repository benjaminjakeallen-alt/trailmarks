import * as THREE from "three";
import type { Gear, Glasses, Headwear } from "@/lib/look";
import { HAT_BAND, type HeadFit } from "@/components/stage3d/fit";
import { ball as hball, buildHat, knit, lathe as hlathe, mat as hm, mesh as hmesh, tube as htube } from "@/components/stage3d/hats";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/**
 * Glasses and headwear for the characters, sized in stage units for a 1.55-tall
 * person and placed in the head bone's space (its origin is at the neck; the
 * big chibi head sits above it). Glasses are built on the measured head; hats
 * are made on one standard head and fitted to the real one (fitHat).
 */


/** See-through lens glass, lightly tinted (or dark for shades). */
function glass(dark: boolean) {
  return new THREE.MeshStandardMaterial({
    color: dark ? "#141a22" : "#dfeef2",
    roughness: 0.05,
    metalness: dark ? 0.3 : 0,
    transparent: !dark,
    opacity: dark ? 1 : 0.22,
    depthWrite: dark,
  });
}

/** A rounded-rectangle frame outline (for square glasses), as a flat ring with a hole. */
function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}

/** Glasses on this head's eyes: real frames and lenses, a bridge, and arms back over the ears. */
export function glasses(kind: Glasses, fit: HeadFit): THREE.Object3D | null {
  if (kind === "none") return null;
  const g = new THREE.Group();
  const frameColor = kind === "sun" ? "#1d1d22" : kind === "round" ? "#8a6a3a" : "#2b2b30";
  const frame = kind === "round" ? hm(frameColor, 0.3, { metal: 0.7 }) : hm(frameColor, 0.35);
  const r = THREE.MathUtils.clamp(fit.eyeX * 0.62, 0.06, 0.1);
  const t = kind === "round" ? r * 0.1 : r * 0.17;
  for (const x of [-fit.eyeX, fit.eyeX]) {
    let rim: THREE.Mesh;
    let lens: THREE.Mesh;
    if (kind === "square") {
      const outer = roundedRect(r * 2.3, r * 1.75, r * 0.45);
      const inner = roundedRect(r * 2.3 - t * 2, r * 1.75 - t * 2, r * 0.35);
      outer.holes.push(new THREE.Path(inner.getPoints(24)));
      rim = hmesh(new THREE.ExtrudeGeometry(outer, { depth: t * 0.8, bevelEnabled: true, bevelSize: t * 0.3, bevelThickness: t * 0.3, curveSegments: 12 }), frame);
      lens = hmesh(new THREE.ShapeGeometry(inner, 12), glass(false));
    } else {
      const w = kind === "sun" ? 1.12 : 1;
      rim = hmesh(new THREE.TorusGeometry(r * w, t, 12, 48), frame);
      rim.scale.y = kind === "sun" ? 0.85 : 1;
      lens = hmesh(new THREE.CircleGeometry(r * w, 40), glass(kind === "sun"));
      lens.scale.y = rim.scale.y;
    }
    rim.position.x = x;
    lens.position.set(x, 0, kind === "square" ? t * 0.4 : 0);
    g.add(rim, lens);
  }
  // The bridge arches over the nose.
  const inner = fit.eyeX - r * (kind === "square" ? 1.15 : kind === "sun" ? 1.12 : 1);
  g.add(htube([new THREE.Vector3(-inner, r * 0.15, 0), new THREE.Vector3(0, r * 0.32, 0.005), new THREE.Vector3(inner, r * 0.15, 0)], t * 0.8, t * 0.8, frame));
  // Arms: from each lens's outer edge, back along the side of the head, hooking down behind the ear.
  const edge = fit.eyeX + r * (kind === "square" ? 1.15 : kind === "sun" ? 1.12 : 1);
  // At the temples (the widest point at eye level is the ears, further back).
  const armX = Math.max(edge, fit.faceX * 0.86);
  const depth = Math.max(0.12, fit.eyeZ + 0.035 - fit.earZ);
  for (const s of [-1, 1]) {
    g.add(
      htube(
        [
          new THREE.Vector3(s * edge, r * 0.3, 0),
          new THREE.Vector3(s * (armX - 0.012), r * 0.3, -0.006),
          new THREE.Vector3(s * armX, r * 0.3, -0.05),
          new THREE.Vector3(s * armX, r * 0.2, -depth * 0.85),
          new THREE.Vector3(s * (armX - 0.012), -r * 0.4, -depth - 0.03),
        ],
        t * 0.75,
        t * 0.6,
        frame,
      ),
    );
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
/** A soft rounded box (bags, camera bodies). */
const rbox = (w: number, h: number, d: number, r: number, m: THREE.Material) => hmesh(new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2, h / 2, d / 2) * 0.99), m);

/** A strap round the back of the neck down to the chest, for things hung there (in the chest bone's space). */
function neckStrap(body: Torso, low: number, spread: number, m: THREE.Material) {
  const n = CHEST.neckY;
  return htube(
    [
      new THREE.Vector3(-spread, low, body.front + 0.03),
      new THREE.Vector3(-0.13, n - 0.02, body.front * 0.55),
      new THREE.Vector3(-0.1, n + 0.03, -0.02),
      new THREE.Vector3(0, n + 0.04, -0.1),
      new THREE.Vector3(0.1, n + 0.03, -0.02),
      new THREE.Vector3(0.13, n - 0.02, body.front * 0.55),
      new THREE.Vector3(spread, low, body.front + 0.03),
    ],
    0.011,
    0.011,
    m,
  );
}

/** Adventure gear, placed on the torso as measured (so a backpack sits on a thick back, not inside it). */
export function gear(kind: Gear, color: string, body: Torso): { object: THREE.Object3D; bone: "chest" | "hips" } | null {
  if (kind === "none") return null;
  const g = new THREE.Group();
  const width = body.side / 0.21;
  const leather = hm("#6b4a30", 0.7);
  const buckle = hm("#b8b2a4", 0.3, { metal: 0.8 });
  if (kind === "backpack") {
    // A rucksack: soft body, a buckled top flap, a front pocket, a bedroll on top, padded shoulder straps.
    const w = 0.34 * Math.min(1.2, width);
    const pack = new THREE.Group();
    const cloth = hm(color, 0.85);
    const bag = rbox(w, 0.38, 0.17, 0.06, cloth);
    bag.position.y = -0.18;
    pack.add(bag);
    const flap = rbox(w + 0.01, 0.16, 0.18, 0.05, cloth);
    flap.position.set(0, -0.02, -0.004);
    flap.scale.z = 1.03;
    pack.add(flap);
    const pocket = rbox(w * 0.62, 0.13, 0.05, 0.03, hm(new THREE.Color(color).multiplyScalar(0.82).getStyle(), 0.85));
    pocket.position.set(0, -0.24, -0.1);
    pack.add(pocket);
    for (const x of [-w * 0.26, w * 0.26]) {
      const strap = rbox(0.035, 0.16, 0.01, 0.004, leather);
      strap.position.set(x, -0.08, -0.095);
      const b = rbox(0.045, 0.03, 0.012, 0.005, buckle);
      b.position.set(x, -0.15, -0.1);
      pack.add(strap, b);
    }
    const roll = hmesh(new THREE.CapsuleGeometry(0.065, w - 0.08, 8, 20), hm("#5d6b48", 0.9));
    roll.rotation.z = Math.PI / 2;
    roll.position.set(0, 0.11, 0);
    pack.add(roll);
    for (const x of [-w * 0.3, w * 0.3]) {
      const tie = hmesh(new THREE.TorusGeometry(0.068, 0.009, 6, 24), leather);
      tie.rotation.y = Math.PI / 2;
      tie.position.set(x, 0.11, 0);
      pack.add(tie);
    }
    pack.position.z = -body.back - 0.085;
    g.add(pack);
    // Shoulder straps: down the front, over the shoulder, into the top of the pack.
    for (const s of [-1, 1]) {
      const x = s * 0.11;
      g.add(
        htube(
          [
            new THREE.Vector3(x * 1.1, -0.16, body.front + 0.01),
            new THREE.Vector3(x, 0.0, body.front + 0.015),
            new THREE.Vector3(x, body.shoulder - 0.01, body.front * 0.6),
            new THREE.Vector3(x, body.shoulder + 0.012, 0),
            new THREE.Vector3(x, body.shoulder - 0.02, -body.back - 0.02),
            new THREE.Vector3(x, body.shoulder - 0.08, -body.back - 0.06),
          ],
          0.02,
          0.02,
          leather,
        ),
      );
    }
    return { object: g, bone: "chest" };
  }
  if (kind === "binoculars") {
    // Two barrels with eyepieces and big front lenses, joined at a hinge, on a neck strap.
    const rubber = hm("#2b2e31", 0.75);
    const lensGlass = hm("#1b2a33", 0.08, { metal: 0.4 });
    const pair = new THREE.Group();
    for (const x of [-0.055, 0.055]) {
      const barrel = hmesh(hlathe([[0.028, -0.08], [0.034, -0.07], [0.036, -0.035], [0.05, -0.0], [0.052, 0.07], [0.048, 0.075]], 32), rubber);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.x = x;
      const front = hmesh(new THREE.CircleGeometry(0.045, 32), lensGlass);
      front.position.set(x, 0, 0.074);
      pair.add(barrel, front);
    }
    const hinge = hmesh(new THREE.CylinderGeometry(0.018, 0.018, 0.1, 16), hm("#5b6066", 0.4, { metal: 0.6 }));
    hinge.rotation.x = Math.PI / 2;
    pair.add(hinge);
    pair.position.set(0, CHEST.neckY - 0.13, body.front + 0.06);
    pair.rotation.x = -0.15;
    g.add(pair, neckStrap(body, CHEST.neckY - 0.1, 0.1, leather));
    return { object: g, bone: "chest" };
  }
  if (kind === "camera") {
    // A camera body with a grip, a lens barrel and glass, a viewfinder hump and shutter, on a strap.
    const cam = new THREE.Group();
    const black = hm("#25272b", 0.55);
    const silver = hm("#c7cbcf", 0.3, { metal: 0.8 });
    cam.add(rbox(0.2, 0.12, 0.07, 0.02, black));
    const top = rbox(0.2, 0.025, 0.07, 0.01, silver);
    top.position.y = 0.06;
    const hump = rbox(0.07, 0.04, 0.055, 0.012, black);
    hump.position.y = 0.085;
    const shutter = hmesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 16), silver);
    shutter.position.set(0.065, 0.078, 0);
    const lens = hmesh(hlathe([[0.045, 0], [0.045, 0.04], [0.042, 0.042], [0.042, 0.07], [0.038, 0.075]], 32), black);
    lens.rotation.x = Math.PI / 2;
    lens.position.z = 0.035;
    const ring = hmesh(new THREE.TorusGeometry(0.044, 0.004, 6, 32), silver);
    ring.position.z = 0.075;
    const glassFront = hmesh(new THREE.CircleGeometry(0.036, 32), hm("#1d3340", 0.05, { metal: 0.5 }));
    glassFront.position.z = 0.111;
    const glint = hball(0.008, hm("#ffffff", 0.1), 8);
    glint.position.set(0.012, 0.012, 0.112);
    glint.scale.z = 0.2;
    cam.add(top, hump, shutter, lens, ring, glassFront, glint);
    cam.position.set(0, CHEST.neckY - 0.17, body.front + 0.05);
    g.add(cam, neckStrap(body, CHEST.neckY - 0.13, 0.1, hm("#a5483c", 0.8)));
    return { object: g, bone: "chest" };
  }
  if (kind === "scarf") {
    // A chunky knit scarf wrapped round the neck, both ends hanging down the front with fringe.
    const knitMat = hm(color, 0.95, { map: knit(30) });
    const wrap = hmesh(new THREE.TorusGeometry(0.17 * Math.max(1, width * 0.9), 0.065, 16, 48), knitMat);
    wrap.rotation.x = Math.PI / 2;
    wrap.scale.z = 1.25;
    g.add(wrap);
    const fringe = hm(new THREE.Color(color).multiplyScalar(0.85).getStyle(), 0.95);
    for (const [x, len, tilt] of [[0.06, 0.28, 0.12], [0.14, 0.2, 0.22]] as const) {
      const end = rbox(0.1, len, 0.035, 0.015, knitMat);
      end.position.set(x, -len / 2 - 0.02, body.front * 0.9 + 0.03);
      end.rotation.z = tilt;
      for (let i = 0; i < 5; i++) {
        const f = hmesh(new THREE.CylinderGeometry(0.006, 0.006, 0.04, 6), fringe);
        f.position.set(-0.04 + i * 0.02, -len / 2 - 0.02, 0);
        end.add(f);
      }
      g.add(end);
    }
    g.position.y = CHEST.neckY + 0.02;
    return { object: g, bone: "chest" };
  }
  // Canteen: a round flask in a canvas cover, a screw cap, hung from the belt.
  const flask = hball(0.1, hm("#6b7d55", 0.9), 32);
  flask.scale.set(0.42, 1, 1);
  const seam = hmesh(new THREE.TorusGeometry(0.1, 0.008, 6, 40), hm("#4f5d3f", 0.9));
  seam.rotation.y = Math.PI / 2;
  const neck = hmesh(new THREE.CylinderGeometry(0.022, 0.026, 0.035, 16), buckle);
  neck.position.y = 0.105;
  const cap = hmesh(new THREE.CylinderGeometry(0.026, 0.026, 0.025, 16), hm("#2b2b30", 0.5));
  cap.position.y = 0.13;
  const loop = hmesh(new THREE.TorusGeometry(0.03, 0.008, 6, 16, Math.PI), leather);
  loop.position.y = 0.14;
  loop.rotation.y = Math.PI / 2;
  g.add(flask, seam, neck, cap, loop);
  g.position.set(body.hip + 0.05, 0.02, 0.03);
  return { object: g, bone: "hips" };
}
