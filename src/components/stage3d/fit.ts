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
  // An egg: a touch narrow, tapering gently to the chin.
  oval: { scale: [0.97, 1.03, 1], jaw: (t) => -0.14 * t * t },
  // Full cheeks all the way down, short and wide.
  round: { scale: [1.12, 0.91, 1.06], jaw: (t) => 0.2 * Math.sin(Math.PI * Math.min(1, t * 0.85)) },
  // A wide, straight jaw that keeps its width to the corners of the chin.
  square: { scale: [1.08, 0.96, 1.02], jaw: (t) => 0.3 * Math.min(1, t * 1.8) - 0.08 * Math.max(0, t - 0.85) / 0.15 },
  // Tall and narrow.
  long: { scale: [0.88, 1.18, 0.96], jaw: (t) => -0.08 * t },
  // Wide at the temples, coming to a neat pointed chin.
  heart: { scale: [1.12, 1.0, 1.0], jaw: (t) => -0.5 * Math.pow(t, 1.4) },
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
    skull: skullOf(face, from, fit.eyeY, fit.chinY) ?? { x: (min(xs) + max(xs)) / 2, y: (min(ys) + max(ys)) / 2, z: zc - d * 0.03 - d * 0.42 * 0.12, rx: w * 0.4, ry: h * 0.47, rz: d * 0.42 },
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
      // No sculpted hair over it: round the crown onto the skull, so a bald
      // head or a buzz cut is a smooth dome rather than a flat-topped block.
      const t = THREE.MathUtils.smoothstep(v.y, crown, crown + (top - crown) * 0.6);
      const e = marks.skull;
      const out = Math.hypot((v.x - e.x) / e.rx, (v.y - e.y) / e.ry, (v.z - e.z) / e.rz);
      if (out > 1e-6) {
        const k = 1 - t + t / out;
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
  // Moved vertices need their shading redone, or the crown and jaw light up wrong.
  if (g.getAttribute("normal")) g.computeVertexNormals();
  g.computeBoundingBox();
  g.computeBoundingSphere();
  shaped.set(key, g);
  return g;
}

// ---------------------------------------------------------------------------
// The skull behind the face

export interface Ellipsoid {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
}

/** Solve a small linear system (Gaussian elimination with pivoting). */
function solve(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (Math.abs(m[p][c]) < 1e-12) return null;
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = m[r][c] / m[c][c];
      for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
    }
  }
  return m.map((row, i) => row[n] / row[i]);
}

/**
 * A face's vertices in head-bone space (divided by k) and the edge of its
 * openings: where the hair was taken off, not the neck.
 */
function openings(face: THREE.BufferGeometry, from: THREE.SkinnedMesh, k: number, eyeY: number, chinY: number) {
  const i = from.skeleton.bones.findIndex((b) => b.name === "head");
  const index = face.getIndex();
  if (i < 0 || !index) return null;
  const toBone = from.bindMatrix.clone().premultiply(from.skeleton.boneInverses[i]);
  const pos = face.getAttribute("position");
  const verts = new Map<number, THREE.Vector3>();
  for (let t = 0; t < index.count; t++) {
    const n = index.getX(t);
    if (!verts.has(n)) verts.set(n, new THREE.Vector3().fromBufferAttribute(pos, n).applyMatrix4(toBone).divideScalar(k));
  }
  // Open edges, welded by position: texture seams split vertices but aren't holes.
  const weld = (n: number) => {
    const v = verts.get(n)!;
    return `${Math.round(v.x * 2000)},${Math.round(v.y * 2000)},${Math.round(v.z * 2000)}`;
  };
  const edges = new Map<string, { n: number; a: number; b: number }>();
  for (let t = 0; t < index.count; t += 3) {
    const tri = [index.getX(t), index.getX(t + 1), index.getX(t + 2)];
    for (let e = 0; e < 3; e++) {
      const [a, b] = [tri[e], tri[(e + 1) % 3]];
      const [ka, kb] = [weld(a), weld(b)];
      const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      const edge = edges.get(key);
      if (edge) edge.n++;
      else edges.set(key, { n: 1, a, b });
    }
  }
  const rim: THREE.Vector3[] = [];
  const onRim = new Set<string>();
  for (const e of edges.values()) {
    if (e.n !== 1) continue;
    for (const n of [e.a, e.b]) {
      const v = verts.get(n)!;
      // Not the neck: that's the opening low down at the front and sides.
      const neck = v.y < chinY + (eyeY - chinY) * 0.45 && (v.z > 0 || v.y < chinY + (eyeY - chinY) * 0.12);
      if (!neck && !onRim.has(weld(n))) {
        onRim.add(weld(n));
        rim.push(v);
      }
    }
  }
  return { verts, rim, onRim, weld };
}

/**
 * The skull a face belongs to: the ellipsoid through the edge of its openings
 * that carries on the curve of the forehead and temples. The rounded crown
 * and the skull behind the face are both this one shape, so they meet.
 */
function skullOf(face: THREE.BufferGeometry, from: THREE.SkinnedMesh, eyeY: number, chinY: number): Ellipsoid | null {
  const o = openings(face, from, 1, eyeY, chinY);
  if (!o || o.rim.length < 8) return null;
  // The edge alone is one loop, which doesn't pin an ellipsoid down; the face above the eyes does.
  // (Above the ears: they stick out, and would make the skull too wide.)
  const upper = [...o.verts.values()].filter((v) => v.y > eyeY + (eyeY - chinY) * 0.08);
  // Nor does a face that stops at the hairline say how tall the skull is: a
  // head is about as tall above the eyes as it is below them, and about as
  // deep behind the ears as in front of them.
  const zs = upper.map((v) => v.z);
  const mid = (max(zs) + min(zs)) / 2;
  const crown = new THREE.Vector3(0, eyeY + (eyeY - chinY) * 1.02, mid);
  const back = new THREE.Vector3(0, eyeY + (eyeY - chinY) * 0.2, mid - (max(zs) - mid));
  const anchors = Array.from({ length: Math.max(8, o.rim.length) }, (_, i) => (i % 2 ? crown : back));
  // Leave out the middle of the face (brows, nose): it isn't skull-shaped.
  const xs = upper.map((v) => Math.abs(v.x));
  const sides = upper.filter((v) => !(v.z > mid + (max(zs) - mid) * 0.4 && Math.abs(v.x) < max(xs) * 0.6));
  return fitAround([...o.rim, ...o.rim, ...o.rim, ...sides, ...anchors], eyeY, eyeY - chinY, mid);
}

/**
 * The best ellipsoid through these points with its center on the head's
 * middle line: search the center's height and depth, fitting the radii at each.
 */
function fitAround(pts: THREE.Vector3[], eyeY: number, h: number, mid: number): Ellipsoid | null {
  let best: Ellipsoid | null = null;
  let bestErr = Infinity;
  for (let i = 0; i <= 16; i++) {
    const y = eyeY - h * 0.2 + (h * 0.6 * i) / 16;
    for (let j = 0; j <= 12; j++) {
      const z = mid - h * 0.25 + (h * 0.5 * j) / 12;
      // A x² + B (y - cy)² + C (z - cz)² = 1, least squares in A, B, C.
      const ata = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      const atb = [0, 0, 0];
      for (const p of pts) {
        const row = [p.x * p.x, (p.y - y) ** 2, (p.z - z) ** 2];
        for (let a = 0; a < 3; a++) {
          atb[a] += row[a];
          for (let b = 0; b < 3; b++) ata[a][b] += row[a] * row[b];
        }
      }
      const s = solve(ata, atb);
      if (!s || s.some((c) => c <= 0)) continue;
      let err = 0;
      for (const p of pts) {
        // Distance-like error: how far off the surface, in radii.
        const r = Math.sqrt(s[0] * p.x * p.x + s[1] * (p.y - y) ** 2 + s[2] * (p.z - z) ** 2);
        err += (r - 1) ** 2;
      }
      if (err < bestErr) {
        bestErr = err;
        best = { x: 0, y, z, rx: 1 / Math.sqrt(s[0]), ry: 1 / Math.sqrt(s[1]), rz: 1 / Math.sqrt(s[2]) };
      }
    }
  }
  return best;
}

const skulls = new Map<string, THREE.BufferGeometry>();

/**
 * The back and top of a head whose hair was taken off: the skull (in accessory
 * units) where the face has openings, tucked just behind the face everywhere
 * else, each point textured from the nearest bit of the face's skin so color
 * and shading carry straight on. Drawn with the face's own material.
 */
export function skullFor(face: THREE.BufferGeometry, from: THREE.SkinnedMesh, k: number, marks: FaceMarks): THREE.BufferGeometry | null {
  const key = `${face.uuid}|${from.uuid}|${k.toFixed(4)}`;
  const hit = skulls.get(key);
  if (hit) return hit;
  const o = openings(face, from, k, marks.eyeY / k, marks.chinY / k);
  if (!o) return null;
  const e = marks.skull;
  const shape = { x: e.x / k, y: e.y / k, z: e.z / k, rx: e.rx / k, ry: e.ry / k, rz: e.rz / k };
  const uv = face.getAttribute("uv");
  // The face in these units, to cast rays at.
  const pos = face.getAttribute("position");
  const flat = new Float32Array(pos.count * 3);
  for (const [n, v] of o.verts) flat.set([v.x, v.y, v.z], n * 3);
  const probe = new THREE.BufferGeometry();
  probe.setAttribute("position", new THREE.BufferAttribute(flat, 3));
  probe.setIndex(face.getIndex());
  const target = new THREE.Mesh(probe, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  target.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  // Its skin vertices, by direction from the skull's center, for texturing.
  const center = new THREE.Vector3(shape.x, shape.y, shape.z);
  const skin: { d: THREE.Vector3; u: number; v: number }[] = [];
  for (const [n, v] of o.verts) {
    const [u, w] = [uv.getX(n), uv.getY(n)];
    if (Math.floor(u * 8) !== 0 || Math.floor(w * 4) !== 0) continue;
    const q = new THREE.Vector3((v.x - shape.x) / shape.rx, (v.y - shape.y) / shape.ry, (v.z - shape.z) / shape.rz);
    if (q.lengthSq() > 1e-9) skin.push({ d: q.normalize(), u, v: w });
  }
  const sphere = new THREE.SphereGeometry(1, 40, 24);
  const sp = sphere.getAttribute("position");
  const suv = sphere.getAttribute("uv");
  const d = new THREE.Vector3();
  const p = new THREE.Vector3();
  for (let n = 0; n < sp.count; n++) {
    d.fromBufferAttribute(sp, n).normalize();
    p.set(shape.x + d.x * shape.rx, shape.y + d.y * shape.ry, shape.z + d.z * shape.rz);
    const dist = p.distanceTo(center);
    ray.set(center, p.clone().sub(center).normalize());
    ray.far = dist * 1.6;
    const hit = ray.intersectObject(target, false)[0];
    // The face is in front of this point: tuck the skull just behind it.
    let r = 1;
    if (hit && hit.distance < dist * 1.04) r = (hit.distance * 0.95) / dist;
    // Down the front into the neck there's no face to meet: keep it inside.
    else if (!hit && d.y < -0.35 && d.z > -0.2) r = 0.8;
    p.sub(center).multiplyScalar(r).add(center);
    sp.setXYZ(n, p.x, p.y, p.z);
    // Its color: the nearest skin of the face.
    let best = -2;
    for (const t of skin) {
      const c = t.d.dot(d);
      if (c > best) {
        best = c;
        suv.setXY(n, t.u, t.v);
      }
    }
  }
  probe.dispose();
  sphere.computeVertexNormals();
  skulls.set(key, sphere);
  return sphere;
}

/**
 * Stubble: the face's own lower jaw and chin (below the nose, the front half),
 * lifted a hair off the skin, to be drawn in a shadowy shade. Model units, the
 * face's own bind, so it's skinned exactly like the face.
 */
export function jawOf(face: THREE.BufferGeometry, from: THREE.SkinnedMesh, marks: FaceMarks): THREE.BufferGeometry | null {
  const i = from.skeleton.bones.findIndex((b) => b.name === "head");
  const index = face.getIndex();
  const normal = face.getAttribute("normal");
  if (i < 0 || !index || !normal) return null;
  const toBone = from.bindMatrix.clone().premultiply(from.skeleton.boneInverses[i]);
  const pos = face.getAttribute("position");
  const below = marks.eyeY - (marks.eyeY - marks.chinY) * 0.5;
  const v = new THREE.Vector3();
  const ids: number[] = [];
  for (let t = 0; t < index.count; t += 3) {
    let y = 0;
    let z = 0;
    for (let c = 0; c < 3; c++) {
      v.fromBufferAttribute(pos, index.getX(t + c)).applyMatrix4(toBone);
      y += v.y / 3;
      z += v.z / 3;
    }
    if (y < below && z > marks.zc) ids.push(index.getX(t), index.getX(t + 1), index.getX(t + 2));
  }
  if (!ids.length) return null;
  const g = face.clone();
  const out = g.getAttribute("position") as THREE.BufferAttribute;
  // Lift along the surface normal, a fraction of the face's size.
  const lift = (marks.eyeY - marks.chinY) * 0.03;
  for (let n = 0; n < out.count; n++) {
    out.setXYZ(n, out.getX(n) + normal.getX(n) * lift, out.getY(n) + normal.getY(n) * lift, out.getZ(n) + normal.getZ(n) * lift);
  }
  g.setIndex(ids);
  return g;
}

// ---------------------------------------------------------------------------
// Smoothing: the source heads are low-poly, so round them off

const smoothed = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();

/** Position keys, so vertices split along UV seams count as one point. */
function welds(pos: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) {
  const ids = new Int32Array(pos.count);
  const seen = new Map<string, number>();
  for (let i = 0; i < pos.count; i++) {
    const k = `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
    const id = seen.get(k);
    if (id === undefined) seen.set(k, (ids[i] = i));
    else ids[i] = id;
  }
  return ids;
}

/**
 * Normals shared across seams: each vertex averages the normals of every copy
 * of its point that bends less than `crease` from its own (so ears and the
 * neck rim keep their edge, while cheeks and the skull turn smooth).
 */
function seamlessNormals(geo: THREE.BufferGeometry, crease = 70) {
  geo.computeVertexNormals();
  const pos = geo.getAttribute("position");
  const nor = geo.getAttribute("normal") as THREE.BufferAttribute;
  const ids = welds(pos);
  const groups = new Map<number, number[]>();
  for (let i = 0; i < pos.count; i++) {
    const g = groups.get(ids[i]);
    if (g) g.push(i);
    else groups.set(ids[i], [i]);
  }
  const cos = Math.cos((crease * Math.PI) / 180);
  const out = new Float32Array(pos.count * 3);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const sum = new THREE.Vector3();
  for (const g of groups.values()) {
    for (const i of g) {
      a.fromBufferAttribute(nor, i);
      sum.set(0, 0, 0);
      for (const j of g) {
        b.fromBufferAttribute(nor, j);
        if (a.dot(b) >= cos) sum.add(b);
      }
      sum.normalize();
      out.set([sum.x, sum.y, sum.z], i * 3);
    }
  }
  geo.setAttribute("normal", new THREE.BufferAttribute(out, 3));
  return { ids, groups };
}

/**
 * Round off a low-poly skinned mesh: split every triangle into four, twice,
 * placing each new point on the curve the corner normals describe (a
 * point-normal triangle), so silhouettes bulge smoothly instead of showing
 * flat facets. UVs and skin weights are carried over, so the face texture and
 * the skinning still line up.
 */
export function smoothSurface(source: THREE.BufferGeometry, rounds = 2): THREE.BufferGeometry {
  const hit = smoothed.get(source);
  if (hit) return hit;
  let geo = source.index ? source.clone() : source.clone();
  if (!geo.index) {
    const idx = new Uint32Array(geo.getAttribute("position").count);
    for (let i = 0; i < idx.length; i++) idx[i] = i;
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
  }
  const keep = ["position", "uv", "skinIndex", "skinWeight"].filter((n) => geo.getAttribute(n));
  for (const name of Object.keys(geo.attributes)) if (!keep.includes(name)) geo.deleteAttribute(name);
  geo.morphAttributes = {};
  geo.clearGroups();

  for (let r = 0; r < rounds; r++) {
    // The normals that shape the surface are fully shared at each point (no
    // creases), so both triangles along an edge put its midpoint in the same place.
    const pos = geo.getAttribute("position");
    geo.computeVertexNormals();
    const raw = geo.getAttribute("normal");
    const ids = welds(pos);
    const shared = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const w = ids[i] * 3;
      shared[w] += raw.getX(i);
      shared[w + 1] += raw.getY(i);
      shared[w + 2] += raw.getZ(i);
    }
    const normalAt = (i: number, v: THREE.Vector3) => v.fromArray(shared, ids[i] * 3).normalize();

    const index = geo.index!;
    const uv = geo.getAttribute("uv");
    const si = geo.getAttribute("skinIndex");
    const sw = geo.getAttribute("skinWeight");
    const P: number[] = [];
    const UV: number[] = [];
    const SI: number[] = [];
    const SW: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      P.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      if (uv) UV.push(uv.getX(i), uv.getY(i));
      if (si && sw) {
        SI.push(si.getX(i), si.getY(i), si.getZ(i), si.getW(i));
        SW.push(sw.getX(i), sw.getY(i), sw.getZ(i), sw.getW(i));
      }
    }
    const mids = new Map<number, number>();
    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();
    const n1 = new THREE.Vector3();
    const n2 = new THREE.Vector3();
    const d = new THREE.Vector3();
    const mid = (a: number, b: number) => {
      const key = a < b ? a * 1e7 + b : b * 1e7 + a;
      const have = mids.get(key);
      if (have !== undefined) return have;
      p1.fromBufferAttribute(pos, a);
      p2.fromBufferAttribute(pos, b);
      normalAt(a, n1);
      normalAt(b, n2);
      // The cubic edge of a PN triangle, at its middle.
      d.subVectors(p2, p1);
      const m = p1.clone().add(p2).multiplyScalar(0.5);
      m.addScaledVector(n1, -d.dot(n1) / 8).addScaledVector(n2, d.dot(n2) / 8);
      const id = P.length / 3;
      P.push(m.x, m.y, m.z);
      if (uv) UV.push((uv.getX(a) + uv.getX(b)) / 2, (uv.getY(a) + uv.getY(b)) / 2);
      if (si && sw) {
        // Blend the two corners' bone weights, keep the strongest four.
        const w = new Map<number, number>();
        for (const v of [a, b])
          for (let c = 0; c < 4; c++) {
            const bone = si.getComponent(v, c);
            const wt = sw.getComponent(v, c) / 2;
            if (wt > 0) w.set(bone, (w.get(bone) ?? 0) + wt);
          }
        const top = [...w.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4);
        const total = top.reduce((s, [, x]) => s + x, 0) || 1;
        for (let c = 0; c < 4; c++) {
          SI.push(top[c]?.[0] ?? 0);
          SW.push((top[c]?.[1] ?? 0) / total);
        }
      }
      mids.set(key, id);
      return id;
    };
    const tris: number[] = [];
    for (let t = 0; t < index.count; t += 3) {
      const a = index.getX(t);
      const b = index.getX(t + 1);
      const c = index.getX(t + 2);
      const ab = mid(a, b);
      const bc = mid(b, c);
      const ca = mid(c, a);
      tris.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
    }
    const next = new THREE.BufferGeometry();
    next.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
    if (uv) next.setAttribute("uv", new THREE.Float32BufferAttribute(UV, 2));
    if (si && sw) {
      next.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(SI, 4));
      next.setAttribute("skinWeight", new THREE.Float32BufferAttribute(SW, 4));
    }
    next.setIndex(tris);
    geo = next;
  }
  seamlessNormals(geo);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  smoothed.set(source, geo);
  return geo;
}
