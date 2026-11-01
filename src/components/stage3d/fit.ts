import * as THREE from "three";
import type { HeadShapeName } from "@/lib/look";

/**
 * Measuring a character's actual head, so everything worn on it fits: the
 * glasses on the eyes, earrings on the ears, a mustache on the lip and a hat
 * over whatever hair is there. All in the head bone's space, in the units the
 * accessories are made in (stage units for a 1.55-tall person).
 */

export interface Pt {
  x: number;
  y: number;
  z: number;
  /** The dark swatch: eyes, brows and mouth. */
  dark: boolean;
}

/** Every vertex of these meshes (as posed now, skinning included), in head-bone accessory units. */
export function pointsOf(objects: THREE.Object3D[], bone: THREE.Object3D, k: number): Pt[] {
  const inv = bone.matrixWorld.clone().invert();
  const out: Pt[] = [];
  const v = new THREE.Vector3();
  for (const root of objects) {
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      // Hanging hair (a ponytail, a braid) isn't something a hat goes over.
      for (let p: THREE.Object3D | null = o; p && p !== root.parent; p = p.parent) if (p.userData.tail) return;
      const pos = mesh.geometry.getAttribute("position");
      const uv = mesh.geometry.getAttribute("uv");
      const index = mesh.geometry.getIndex();
      // Split heads share one vertex buffer; only the indexed vertices belong to this piece.
      const ids = index ? new Set<number>(Array.from(index.array as ArrayLike<number>)) : null;
      const skinned = (mesh as THREE.SkinnedMesh).isSkinnedMesh ? (mesh as THREE.SkinnedMesh) : null;
      const each = (i: number) => {
        v.fromBufferAttribute(pos, i);
        if (skinned) skinned.applyBoneTransform(i, v);
        v.applyMatrix4(mesh.matrixWorld).applyMatrix4(inv).divideScalar(k);
        const dark = !!uv && Math.floor(uv.getX(i) * 8) === 2 && Math.floor(uv.getY(i) * 4) === 0;
        out.push({ x: v.x, y: v.y, z: v.z, dark });
      };
      if (ids) for (const i of ids) each(i);
      else for (let i = 0; i < pos.count; i++) each(i);
    });
  }
  return out;
}

export interface HeadFit {
  /** The eyes: center height, each eye's distance from the middle, and the face's front there. */
  eyeY: number;
  eyeX: number;
  eyeZ: number;
  /** Half the head's width at eye level, where glasses' arms go back. */
  faceX: number;
  /** The upper lip and the chin, on the face's front. */
  mouthY: number;
  mouthZ: number;
  chinY: number;
  /** Where an earlobe hangs (x is the side of the head). */
  earX: number;
  earY: number;
  earZ: number;
  /** Where a hat's band goes round: its height, center depth, half-width and half-depth over the hair. */
  bandY: number;
  bandZ: number;
  rx: number;
  rz: number;
  /** The top of the head or hair, over the middle. */
  top: number;
  /** How wide the head and hair are at each height from the top down (every 0.01), for hats to rest on. */
  profile: { y: number; w: number }[];
}

const max = (xs: number[], d = 0) => (xs.length ? Math.max(...xs) : d);
const min = (xs: number[], d = 0) => (xs.length ? Math.min(...xs) : d);

/**
 * Fit a head from its points: `face` is the bare face (it has the eyes), `cover`
 * everything a hat has to go over (skull, hair, the face itself).
 */
export function fitHead(face: Pt[], cover: Pt[]): HeadFit {
  const dark = face.filter((p) => p.dark);
  const eyeY = (min(dark.map((p) => p.y)) + max(dark.map((p) => p.y))) / 2;
  const right = dark.filter((p) => p.x > 0);
  const eyeX = (min(right.map((p) => p.x)) + max(right.map((p) => p.x))) / 2;
  const eyeZ = max(dark.map((p) => p.z));
  const atEyes = face.filter((p) => Math.abs(p.y - eyeY) < 0.04);
  const faceX = max(atEyes.map((p) => Math.abs(p.x)), 0.36);
  // The chin: the lowest point of the front of the face.
  const front = face.filter((p) => p.z > eyeZ * 0.55 && Math.abs(p.x) < eyeX);
  const chinY = min(front.map((p) => p.y), eyeY - 0.25);
  const mouthY = chinY + (eyeY - chinY) * 0.42;
  const mouthZ = max(face.filter((p) => Math.abs(p.x) < 0.06 && Math.abs(p.y - mouthY) < 0.03).map((p) => p.z), eyeZ - 0.02);
  // Earlobes: the head's sides, a little below the eyes.
  const earY = eyeY - (eyeY - chinY) * 0.35;
  const side = face.filter((p) => Math.abs(p.y - earY) < 0.05 && p.z < eyeZ * 0.5);
  const earX = max(side.map((p) => Math.abs(p.x)), faceX);
  const earZ = side.length ? side.reduce((a, p) => a + p.z, 0) / side.length : 0;

  // A hat's band goes round the forehead, just over the brows, and the hat
  // has to go over everything above it: the skull or whatever hair is there.
  const bandY = eyeY + (eyeY - chinY) * 0.33;
  const ring = cover.filter((p) => p.y > bandY - 0.03);
  const rx = max(ring.map((p) => Math.abs(p.x)), faceX);
  const zMax = max(ring.map((p) => p.z), eyeZ);
  const zMin = min(ring.map((p) => p.z), -eyeZ);
  const bandZ = (zMax + zMin) / 2;
  const rz = (zMax - zMin) / 2;
  const top = max(cover.filter((p) => Math.abs(p.x) < rx * 0.5 && Math.abs(p.z - bandZ) < rz * 0.6).map((p) => p.y), bandY + 0.2);
  // The width at each height (the bigger of across and front-to-back), top down.
  const profile: { y: number; w: number }[] = [];
  for (let y = Math.ceil(top * 100) / 100; y > bandY; y -= 0.01) {
    const slab = cover.filter((p) => Math.abs(p.y - y) < 0.015);
    profile.push({ y, w: max(slab.map((p) => Math.max(Math.abs(p.x), Math.abs(p.z - bandZ)))) });
  }
  return { eyeY, eyeX, eyeZ, faceX, mouthY, mouthZ, chinY, earX, earY, earZ, bandY, bandZ, rx, rz, top, profile };
}

/**
 * The head the hats are made on: the band round it at y 0.46 and hair up to
 * 0.7. A hat is moved from that head onto this one and sized so its opening
 * goes round this head and hair; a party hat or a crown instead perches
 * wherever it comes to rest.
 */
const HAT_HEAD = { bandY: 0.46, top: 0.7 };
/** Where a hat's opening goes on the standard head. */
export const HAT_BAND = HAT_HEAD.bandY;
/** Hair wider than this (half-width, from the middle) is big hair: hats sit on it, not round it. */
const BIG_HAIR = 0.39;

export function fitHat(hat: THREE.Object3D | null, fit: HeadFit): THREE.Object3D | null {
  if (!hat) return null;
  const { r = 0.38, perch = false, cover = true, crown: inside } = (hat.userData.fit ?? {}) as { r?: number; perch?: boolean; cover?: boolean; crown?: number };
  // Where the hat's opening is, above the standard band.
  const opening = hat.position.y - HAT_HEAD.bandY;
  // How tall its crown is, from the opening up (measured before it's parented).
  hat.updateMatrixWorld(true);
  const crown = inside ?? Math.max(0.1, new THREE.Box3().setFromObject(hat).max.y - hat.position.y);
  const inner = new THREE.Group();
  inner.position.y = -HAT_HEAD.bandY;
  inner.add(hat);
  const outer = new THREE.Group();
  outer.add(inner);
  let sx = (fit.rx * 1.12) / r;
  let sz = (fit.rz * 1.12) / r;
  // Big hair (an afro) doesn't make a giant hat: a hat for a usual head perches on top of it.
  if (perch || Math.max(fit.rx, fit.rz) > BIG_HAIR) {
    const s = perch ? 1 : (0.36 * 1.12) / r;
    // Slide it down from above until the head is as wide as it is.
    const rest = fit.profile.find((p) => p.w > r * s * 0.92)?.y ?? fit.bandY;
    outer.position.set(0, Math.max(fit.bandY, rest) - opening * s, fit.bandZ);
    outer.scale.setScalar(s);
    return outer;
  }
  const across = (sx + sz) / 2;
  // Round heads, not lopsided hats: keep the two within 15% of each other.
  sx = Math.max(sx, across * 0.92);
  sz = Math.max(sz, across * 0.92);
  // Keep its own proportions; over tall hair it rides up a little instead of
  // stretching into a stovepipe. Bands, bows and lamps don't cover the crown.
  let sy = across;
  let lift = 0;
  if (cover) {
    const need = fit.top + 0.04 - fit.bandY;
    sy = THREE.MathUtils.clamp(need / crown, across * 0.85, across * 1.1);
    lift = Math.max(0, need - crown * sy) * 0.9;
  }
  outer.position.set(0, fit.bandY + lift - opening * sy, fit.bandZ);
  outer.scale.set(sx, sy, sz);
  return outer;
}

/**
 * A piece of a body's head (its bald face, say), measured where it sits in its
 * own bind pose: in that body's head-bone space, before any animation.
 */
export function restPoints(geo: THREE.BufferGeometry, from: THREE.SkinnedMesh, k = 1): Pt[] {
  const i = from.skeleton.bones.findIndex((b) => b.name === "head");
  if (i < 0) return [];
  const toBone = from.bindMatrix.clone().premultiply(from.skeleton.boneInverses[i]);
  const pos = geo.getAttribute("position");
  const uv = geo.getAttribute("uv");
  const index = geo.getIndex();
  const ids = index ? new Set<number>(Array.from(index.array as ArrayLike<number>)) : null;
  const out: Pt[] = [];
  const v = new THREE.Vector3();
  const each = (n: number) => {
    v.fromBufferAttribute(pos, n).applyMatrix4(toBone).divideScalar(k);
    const dark = !!uv && Math.floor(uv.getX(n) * 8) === 2 && Math.floor(uv.getY(n) * 4) === 0;
    out.push({ x: v.x, y: v.y, z: v.z, dark });
  };
  if (ids) for (const n of ids) each(n);
  else for (let n = 0; n < pos.count; n++) each(n);
  return out;
}

// ---------------------------------------------------------------------------
// Head shapes

/**
 * Each head shape: an overall stretch of the head (on the head bone, so hair,
 * hats and glasses all follow), and how much wider or narrower the jaw gets
 * from the eyes (t 0) down to the chin (t 1).
 */
export const HEAD_FORMS: Record<HeadShapeName, { scale: [number, number, number]; jaw: (t: number) => number }> = {
  oval: { scale: [1, 1, 1], jaw: () => 0 },
  round: { scale: [1.1, 0.93, 1.06], jaw: (t) => 0.16 * Math.sin(Math.PI * Math.min(1, t * 0.95)) },
  square: { scale: [1.08, 0.97, 1.02], jaw: (t) => 0.24 * Math.min(1, t * 1.4) },
  long: { scale: [0.9, 1.15, 0.96], jaw: (t) => -0.1 * t },
  heart: { scale: [1.08, 1.01, 1.0], jaw: (t) => -0.36 * t * t },
};

/** Where a face's eyes, chin and top are (bone space, model units), to shape it from. */
export interface FaceMarks {
  eyeY: number;
  chinY: number;
  top: number;
  zc: number;
  /** The skull as an ellipsoid (as fullSkull draws it): center and radii. */
  skull: { x: number; y: number; z: number; rx: number; ry: number; rz: number };
}

const marked = new WeakMap<THREE.BufferGeometry, FaceMarks>();

export function faceMarks(face: THREE.BufferGeometry, from: THREE.SkinnedMesh): FaceMarks {
  const hit = marked.get(face);
  if (hit) return hit;
  const pts = restPoints(face, from);
  const fit = fitHead(pts, pts);
  const zs = pts.map((p) => p.z);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const [w, h, d] = [max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs)];
  const zc = (min(zs) + max(zs)) / 2;
  const marks = {
    eyeY: fit.eyeY,
    chinY: fit.chinY,
    top: max(ys),
    zc,
    // Matches headShape and fullSkull (in cast.ts and hair.ts).
    skull: { x: (min(xs) + max(xs)) / 2, y: (min(ys) + max(ys)) / 2, z: zc - d * 0.03 - d * 0.42 * 0.12, rx: w * 0.4, ry: h * 0.47, rz: d * 0.42 },
  };
  marked.set(face, marks);
  return marks;
}

const shaped = new Map<string, THREE.BufferGeometry>();

/**
 * A copy of a piece of head (the face, or a beard on it) reshaped in the head
 * bone's space: the jaw for the head shape, and the crown rounded off (the
 * men's face is a flat-topped block meant to sit under the knight's hair, which
 * looked like a box on a bald head or under a buzz cut). Cached: pieces are shared.
 */
export function shapeHead(geo: THREE.BufferGeometry, from: THREE.SkinnedMesh, marks: FaceMarks, shape: HeadShapeName, roundCrown = false): THREE.BufferGeometry {
  const key = `${geo.uuid}|${from.uuid}|${shape}|${roundCrown}`;
  const hit = shaped.get(key);
  if (hit) return hit;
  const i = from.skeleton.bones.findIndex((b) => b.name === "head");
  if (i < 0) return geo;
  const toBone = from.bindMatrix.clone().premultiply(from.skeleton.boneInverses[i]);
  const back = toBone.clone().invert();
  const pos = geo.getAttribute("position");
  const out = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  const jaw = HEAD_FORMS[shape].jaw;
  const { eyeY, chinY, top } = marks;
  const crown = eyeY + (eyeY - chinY) * 0.36;
  for (let n = 0; n < pos.count; n++) {
    v.fromBufferAttribute(pos, n).applyMatrix4(toBone);
    if (v.y < eyeY) {
      const t = THREE.MathUtils.clamp((eyeY - v.y) / (eyeY - chinY), 0, 1);
      v.x *= 1 + jaw(t);
    } else if (roundCrown && v.y > crown && top > crown) {
      // No sculpted hair over it: tuck the crown inside the smooth skull, so a
      // bald head or a buzz cut is round on top rather than a flat-topped block.
      const t = THREE.MathUtils.smoothstep(v.y, crown, crown + (top - crown) * 0.6);
      const e = marks.skull;
      const dx = (v.x - e.x) / e.rx;
      const dy = (v.y - e.y) / e.ry;
      const dz = (v.z - e.z) / e.rz;
      const out = Math.hypot(dx, dy, dz);
      if (out > 0.97) {
        const k = 1 - t + (t * 0.97) / out;
        v.set(e.x + (v.x - e.x) * k, e.y + (v.y - e.y) * k, e.z + (v.z - e.z) * k);
      }
    }
    v.applyMatrix4(back);
    out[n * 3] = v.x;
    out[n * 3 + 1] = v.y;
    out[n * 3 + 2] = v.z;
  }
  const g = geo.clone();
  g.setAttribute("position", new THREE.BufferAttribute(out, 3));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  shaped.set(key, g);
  return g;
}
