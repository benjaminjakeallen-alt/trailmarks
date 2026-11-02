import * as THREE from "three";
import { BUILD_WIDTH, tone, type Look, type Shoe } from "@/lib/look";

/**
 * The wardrobe: instead of a sculpted costume, each character's body is built
 * here on the shared skeleton, dressed in their own top, bottoms and shoes.
 * It's a chunky toy body to match the big chibi heads: a rounded torso, limbs
 * with ball joints (so nothing creases when they bend), mitten hands, and
 * clothes with their details (collars, hoods, pockets, buttons, belts, soles).
 *
 * Everything is made in the skeleton's rest pose (a T-pose, model units: hips
 * at 0.41, neck at 1.24) and skinned to its bones, so every animation just works.
 */

type W = [string, number][];
type Paint = THREE.Color | ((p: THREE.Vector3, around: number) => THREE.Color);

/** Collects one skinned mesh: positions, vertex colors, bone weights. */
class Builder {
  pos: number[] = [];
  col: number[] = [];
  si: number[] = [];
  sw: number[] = [];
  idx: number[] = [];
  /** Each vertex's rest-pose world position, to orient faces outward. */
  world: THREE.Vector3[] = [];
  private local = new THREE.Vector3();
  private sum = new THREE.Matrix4();
  /**
   * Made in the rest pose's world space; stored as the raw position that the
   * mesh's skinning carries to that spot (inverting it per vertex, since the
   * bind pose isn't the identity at rest).
   */
  constructor(
    private bones: Map<string, number>,
    private on: THREE.SkinnedMesh,
    private rest: THREE.Matrix4[],
  ) {}

  vert(world: THREE.Vector3, c: THREE.Color, w: W) {
    const list = w.filter(([name, x]) => x > 0 && this.bones.has(name)).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const sum = list.reduce((a, [, x]) => a + x, 0) || 1;
    // skinned = bind⁻¹ · Σ wᵢ (boneᵢ · inverseᵢ) · bind · raw, then the mesh's own world matrix.
    const S = this.sum.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    for (const [name, x] of list) {
      const m = this.rest[this.bones.get(name)!].elements;
      for (let e = 0; e < 16; e++) S.elements[e] += (m[e] * x) / sum;
    }
    const p = this.local
      .copy(world)
      .applyMatrix4(this.on.matrixWorld.clone().invert())
      .applyMatrix4(this.on.bindMatrix)
      .applyMatrix4(S.clone().invert())
      .applyMatrix4(this.on.bindMatrixInverse);
    for (let i = 0; i < 4; i++) {
      this.si.push(list[i] ? this.bones.get(list[i][0])! : 0);
      this.sw.push(list[i] ? list[i][1] / sum : 0);
    }
    this.pos.push(p.x, p.y, p.z);
    this.col.push(c.r, c.g, c.b);
    this.world.push(world.clone());
    return this.pos.length / 3 - 1;
  }

  private e1 = new THREE.Vector3();
  private e2 = new THREE.Vector3();
  /** A triangle, wound so it faces `out` (a direction away from the surface). */
  tri(a: number, b: number, c: number, out: THREE.Vector3) {
    const [A, Bv, C] = [this.world[a], this.world[b], this.world[c]];
    const n = this.e1.subVectors(Bv, A).cross(this.e2.subVectors(C, A));
    if (n.dot(out) < 0) this.idx.push(a, c, b);
    else this.idx.push(a, b, c);
  }

  /** The middle of a triangle, minus a point: which way is out from that point. */
  away(a: number, b: number, c: number, from: THREE.Vector3) {
    return this.world[a].clone().add(this.world[b]).add(this.world[c]).divideScalar(3).sub(from);
  }

  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(this.si, 4));
    g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(this.sw, 4));
    g.setIndex(this.idx);
    g.computeVertexNormals();
    return g;
  }
}

interface Ring {
  /** Center, and the two directions the cross-section spans (with their radii). */
  c: THREE.Vector3;
  a: THREE.Vector3;
  b: THREE.Vector3;
  ra: number;
  rb: number;
  paint: Paint;
  w: W | ((p: THREE.Vector3) => W);
  /** Squarer (bigger) or rounder (2) cross-section. */
  n?: number;
}

const SEG = 20;

/** A tube through rings (each ring a rounded cross-section), capped at both ends. */
function tube(B: Builder, rings: Ring[], { capStart = true, capEnd = true } = {}) {
  const ids: number[][] = [];
  const p = new THREE.Vector3();
  for (const r of rings) {
    const row: number[] = [];
    const e = 2 / (r.n ?? 2);
    for (let i = 0; i < SEG; i++) {
      const t = (i / SEG) * Math.PI * 2;
      const cos = Math.cos(t);
      const sin = Math.sin(t);
      const x = Math.sign(cos) * Math.abs(cos) ** e * r.ra;
      const y = Math.sign(sin) * Math.abs(sin) ** e * r.rb;
      p.copy(r.c).addScaledVector(r.a, x).addScaledVector(r.b, y);
      const c = typeof r.paint === "function" ? r.paint(p, t) : r.paint;
      row.push(B.vert(p, c, typeof r.w === "function" ? r.w(p) : r.w));
    }
    ids.push(row);
  }
  for (let k = 0; k + 1 < ids.length; k++) {
    for (let i = 0; i < SEG; i++) {
      const j = (i + 1) % SEG;
      const [a, b, c, d] = [ids[k][i], ids[k][j], ids[k + 1][i], ids[k + 1][j]];
      // Out from the tube's middle line, wherever it's built from.
      const mid = rings[k].c.clone().add(rings[k + 1].c).multiplyScalar(0.5);
      B.tri(a, c, b, B.away(a, c, b, mid));
      B.tri(b, c, d, B.away(b, c, d, mid));
    }
  }
  const cap = (k: number, toward: THREE.Vector3) => {
    const r = rings[k];
    const c = typeof r.paint === "function" ? r.paint(r.c, 0) : r.paint;
    const mid = B.vert(r.c.clone().add(toward), c, typeof r.w === "function" ? r.w(r.c) : r.w);
    for (let i = 0; i < SEG; i++) B.tri(mid, ids[k][i], ids[k][(i + 1) % SEG], toward);
  };
  const along = (k1: number, k2: number) => rings[k2].c.clone().sub(rings[k1].c).normalize();
  if (capStart && rings.length > 1) cap(0, along(1, 0).multiplyScalar(Math.min(rings[0].ra, rings[0].rb) * 0.5));
  if (capEnd && rings.length > 1) cap(rings.length - 1, along(rings.length - 2, rings.length - 1).multiplyScalar(Math.min(rings.at(-1)!.ra, rings.at(-1)!.rb) * 0.5));
}

/** An ellipsoid (a joint, a hand, a hood, a button). */
function blob(B: Builder, c: THREE.Vector3, r: THREE.Vector3, paint: Paint, w: W, { rows = 10, half = false, from = 0 } = {}) {
  const ids: number[][] = [];
  const p = new THREE.Vector3();
  const top = half ? rows / 2 : rows;
  for (let k = from; k <= top; k++) {
    const phi = (k / rows) * Math.PI;
    const row: number[] = [];
    for (let i = 0; i < SEG; i++) {
      const t = (i / SEG) * Math.PI * 2;
      p.set(Math.sin(phi) * Math.cos(t) * r.x, Math.cos(phi) * r.y, Math.sin(phi) * Math.sin(t) * r.z).add(c);
      row.push(B.vert(p, typeof paint === "function" ? paint(p, t) : paint, w));
    }
    ids.push(row);
  }
  for (let k = 0; k + 1 < ids.length; k++) {
    for (let i = 0; i < SEG; i++) {
      const j = (i + 1) % SEG;
      const [a, b, d, e] = [ids[k][i], ids[k][j], ids[k + 1][i], ids[k + 1][j]];
      B.tri(a, b, d, B.away(a, b, d, c));
      B.tri(b, e, d, B.away(b, e, d, c));
    }
  }
}

/** A box (a pocket, a buckle, a sole), turned by `rot`. Flat faces: each face its own corners. */
function cube(B: Builder, c: THREE.Vector3, size: THREE.Vector3, color: THREE.Color, w: W, rot = new THREE.Euler()) {
  const q = new THREE.Quaternion().setFromEuler(rot);
  const h = size.clone().multiplyScalar(0.5);
  const faces: [number[], number[], number[]][] = [
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
    [[0, 1, 0], [0, 0, 1], [1, 0, 0]],
    [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]],
    [[0, 0, -1], [0, 1, 0], [1, 0, 0]],
  ];
  for (const [n, u, v] of faces) {
    const N = new THREE.Vector3(...n);
    const U = new THREE.Vector3(...u);
    const V = new THREE.Vector3(...v);
    const corner = (su: number, sv: number) =>
      B.vert(
        N.clone().multiply(h).add(U.clone().multiply(h).multiplyScalar(su)).add(V.clone().multiply(h).multiplyScalar(sv)).applyQuaternion(q).add(c),
        color,
        w,
      );
    const [a, b, d, e] = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
    const out = N.clone().applyQuaternion(q);
    B.tri(a, b, d, out);
    B.tri(a, d, e, out);
  }
}

const lerpW = (a: string, b: string, t: number): W => {
  const k = THREE.MathUtils.clamp(t, 0, 1);
  return [
    [a, 1 - k],
    [b, k],
  ];
};

/**
 * Dress a character: the body (skin where it shows, clothes where they're
 * worn) as one skinned mesh on `on`'s skeleton, in its rest pose.
 */
export function dress(on: THREE.SkinnedMesh, look: Look, skinHex: string): THREE.SkinnedMesh {
  const bones = new Map(on.skeleton.bones.map((b, i) => [b.name, i] as const));
  let root: THREE.Object3D = on;
  while (root.parent) root = root.parent;
  root.updateMatrixWorld(true);
  const rest = on.skeleton.bones.map((b, i) => new THREE.Matrix4().multiplyMatrices(b.matrixWorld, on.skeleton.boneInverses[i]));
  const B = new Builder(bones, on, rest);
  const at = (name: string) => {
    const bone = on.skeleton.bones[bones.get(name) ?? 0];
    return bone.getWorldPosition(new THREE.Vector3());
  };
  const build = BUILD_WIDTH[look.build];
  const T = build.torso;
  const L = build.limbs;

  const skin = new THREE.Color(skinHex);
  const top = new THREE.Color(tone(look.outfit));
  const topDark = top.clone().multiplyScalar(0.8);
  const bottom = new THREE.Color(tone(look.pants));
  const shoe = new THREE.Color(tone(look.shoeColor));
  const white = new THREE.Color("#ebe8e1");
  const dark = new THREE.Color("#2b2621");
  const belt = new THREE.Color("#4a3426");
  const gold = new THREE.Color("#c9a24a");

  const kind = look.top;
  const wearing = look.top === "dress" ? "skirt" : look.bottom;
  const skirtColor = look.top === "dress" ? top : bottom;
  const longSleeves = ["longsleeve", "hoodie", "sweater", "buttonup", "jacket"].includes(kind);
  const sleeveless = kind === "tank";
  const tucked = kind === "buttonup" || kind === "polo";
  const legsCovered = wearing === "jeans" || wearing === "chinos" || wearing === "leggings" || wearing === "cargo";

  // Heights on the torso: the waistband, the shirt's hem, the neck.
  const waist = 0.55;
  const hem = tucked ? waist : kind === "dress" ? waist + 0.02 : 0.5;
  const neckY = at("head").y;

  // The shirt's color at a point: stripes, an open jacket's front, a tank's bare shoulders.
  const front = (p: THREE.Vector3, around: number) => Math.cos(around - Math.PI / 2) > 0.9 && p.z > 0;
  const shirt = (p: THREE.Vector3, around: number): THREE.Color => {
    if (kind === "striped" && Math.floor((p.y - 0.4) / 0.07) % 2 === 1) return white;
    if (kind === "jacket" && front(p, around)) return white;
    if ((kind === "buttonup" || kind === "polo") && Math.abs(p.x) < 0.012 && p.z > 0 && p.y > 0.75) return topDark;
    return top;
  };

  // --- Torso: hips to neck, a rounded box, wider at the chest. ---
  const torsoW = (y: number): W =>
    y < 0.5 ? [["hips", 1]] : y < 0.66 ? lerpW("hips", "spine", (y - 0.5) / 0.16) : y < 0.9 ? [["spine", 1]] : y < 1.0 ? lerpW("spine", "chest", (y - 0.9) / 0.1) : [["chest", 1]];
  const X = new THREE.Vector3(1, 0, 0);
  const Z = new THREE.Vector3(0, 0, 1);
  const Y = new THREE.Vector3(0, 1, 0);
  const profile: [number, number, number][] = [
    // y, half-width, half-depth
    [0.34, 0.2, 0.15],
    [0.38, 0.26, 0.19],
    [0.45, 0.275, 0.2],
    [0.55, 0.27, 0.2],
    [0.7, 0.262, 0.2],
    [0.85, 0.28, 0.212],
    [0.98, 0.3, 0.222],
    [1.1, 0.3, 0.218],
    [1.17, 0.265, 0.19],
    [1.21, 0.19, 0.145],
    [1.235, 0.11, 0.095],
  ];
  // Hard color edges where the clothes change: a ring on each side of the hem and the waistband.
  const cuts = [hem, waist];
  const ys = new Set<number>(profile.map(([y]) => y));
  for (const y of cuts) {
    ys.add(y - 0.0005);
    ys.add(y + 0.0005);
  }
  for (let y = 0.4; y < 1.2; y += 0.035) ys.add(Math.round(y * 1000) / 1000);
  const sizeAt = (y: number) => {
    for (let i = 0; i + 1 < profile.length; i++) {
      const [y0, w0, d0] = profile[i];
      const [y1, w1, d1] = profile[i + 1];
      if (y >= y0 && y <= y1) {
        const t = (y - y0) / (y1 - y0);
        return [w0 + (w1 - w0) * t, d0 + (d1 - d0) * t];
      }
    }
    return [profile.at(-1)![1], profile.at(-1)![2]];
  };
  const torsoPaint = (p: THREE.Vector3, around: number): THREE.Color => {
    if (p.y < waist && wearing !== "skirt" && p.y < hem) return bottom;
    if (p.y < hem && wearing === "skirt") return skirtColor;
    return shirt(p, around);
  };
  const torsoRings: Ring[] = [...ys]
    .sort((a, b) => a - b)
    .map((y) => {
      const [w, d] = sizeAt(y);
      // The shirt's hem sits a little proud of what's under it.
      const lip = y >= hem && y < hem + 0.03 && hem < waist ? 0.012 : 0;
      return { c: new THREE.Vector3(0, y, 0.005), a: X, b: Z, ra: w * T + lip, rb: d * T + lip, n: 2.6, paint: torsoPaint, w: torsoW(y) };
    });
  tube(B, torsoRings, { capEnd: false });
  // Neck.
  tube(B, [
    { c: new THREE.Vector3(0, 1.2, 0), a: X, b: Z, ra: 0.095, rb: 0.09, paint: skin, w: [["chest", 1]] },
    { c: new THREE.Vector3(0, neckY + 0.08, 0), a: X, b: Z, ra: 0.09, rb: 0.085, paint: skin, w: [["head", 1]] },
  ]);

  // --- Arms: shoulder ball, upper arm, elbow ball, forearm, mitten hand. ---
  for (const s of [1, -1] as const) {
    const side = s > 0 ? "l" : "r";
    const sh = at(`upperarm${side}`);
    const el = at(`lowerarm${side}`);
    const wr = at(`wrist${side}`);
    const sleeveEnd = sleeveless ? 0 : longSleeves ? 0.69 : 0.36;
    const armPaint = (x: number) => (x <= sleeveEnd ? shirt(new THREE.Vector3(0, 0, -1), 0) : skin);
    const armW = (x: number): W =>
      x < 0.4 ? [[`upperarm${side}`, 1]] : x < 0.5 ? lerpW(`upperarm${side}`, `lowerarm${side}`, (x - 0.4) / 0.1) : x < 0.66 ? [[`lowerarm${side}`, 1]] : lerpW(`lowerarm${side}`, `wrist${side}`, (x - 0.66) / 0.06);
    const radius = (x: number) => (x < 0.25 ? 0.122 : x < 0.454 ? 0.122 - ((x - 0.25) / 0.204) * 0.016 : 0.106 - ((x - 0.454) / 0.26) * 0.014) * L;
    const xs = new Set([0.17, 0.25, 0.32, 0.4, 0.454, 0.52, 0.6, 0.66, 0.705]);
    if (sleeveEnd > 0) {
      xs.add(sleeveEnd - 0.0005);
      xs.add(sleeveEnd + 0.0005);
      xs.add(sleeveEnd - 0.02);
    }
    const rings: Ring[] = [...xs]
      .sort((a, b) => a - b)
      .map((x) => {
        // A sleeve's cuff: a touch wider at its end.
        const cuff = x <= sleeveEnd && x > sleeveEnd - 0.022 ? 0.012 : 0;
        const y = sh.y + (wr.y - sh.y) * ((x - 0.17) / 0.54);
        return {
          c: new THREE.Vector3(s * x, y, x > 0.454 ? el.z : 0),
          a: Y,
          b: Z,
          ra: radius(x) + (x <= sleeveEnd ? 0.008 : 0) + cuff,
          rb: radius(x) + (x <= sleeveEnd ? 0.008 : 0) + cuff,
          paint: armPaint(x),
          w: armW(x),
        };
      });
    tube(B, rings, { capStart: false });
    // Ball joints, so a bent arm stays round.
    const shoulderColor = sleeveless ? skin : shirt(new THREE.Vector3(0, 1.1, -1), 0);
    blob(B, sh.clone().add(new THREE.Vector3(-s * 0.01, 0, 0)), new THREE.Vector3(0.13 * L, 0.13 * L, 0.13 * L), shoulderColor, [[`upperarm${side}`, 1]]);
    blob(B, el, new THREE.Vector3(0.108 * L, 0.108 * L, 0.108 * L), longSleeves ? shirt(new THREE.Vector3(0, 0, -1), 0) : skin, [
      [`upperarm${side}`, 0.5],
      [`lowerarm${side}`, 0.5],
    ]);
    // A mitten hand and a thumb.
    const hand = at(`hand${side}`);
    blob(B, hand.clone().add(new THREE.Vector3(s * 0.03, -0.012, 0)), new THREE.Vector3(0.1 * L, 0.095 * L, 0.1 * L), skin, [[`hand${side}`, 1]]);
    blob(B, hand.clone().add(new THREE.Vector3(-s * 0.005, 0.02, 0.088 * L)), new THREE.Vector3(0.042, 0.036, 0.042), skin, [[`hand${side}`, 1]]);
  }

  // --- Legs: thigh, knee ball, shin; then the shoes. ---
  // Chibi thighs are mostly inside the torso: shorts reach just past the knee.
  const shortsEnd = 0.245;
  for (const s of [1, -1] as const) {
    const side = s > 0 ? "l" : "r";
    const hip = at(`upperleg${side}`);
    const knee = at(`lowerleg${side}`);
    const ankle = at(`foot${side}`);
    const legW = (y: number): W => (y > 0.36 ? [[`upperleg${side}`, 1]] : y > 0.25 ? lerpW(`upperleg${side}`, `lowerleg${side}`, (0.36 - y) / 0.11) : [[`lowerleg${side}`, 1]]);
    const covered = (y: number) => legsCovered || (wearing === "shorts" && y >= shortsEnd);
    const legPaint = (y: number) => (covered(y) ? bottom : skin);
    const r = (y: number) => (y > 0.32 ? 0.105 + ((y - 0.32) / 0.24) * 0.015 : 0.09 + ((y - 0.15) / 0.17) * 0.015) * L;
    const ysLeg = new Set([0.56, 0.48, 0.4, 0.32, 0.292, 0.24, 0.19, 0.15, 0.12]);
    if (wearing === "shorts") {
      ysLeg.add(shortsEnd - 0.0005);
      ysLeg.add(shortsEnd + 0.0005);
      ysLeg.add(shortsEnd + 0.02);
    }
    const cuffY = 0.17;
    const rings: Ring[] = [...ysLeg]
      .sort((a, b) => b - a)
      .map((y) => {
        const pants = covered(y) && wearing !== "leggings" ? 0.01 : 0;
        const flare = wearing === "shorts" && y >= shortsEnd && y < shortsEnd + 0.03 ? 0.02 : wearing === "shorts" && y >= shortsEnd ? 0.008 : 0;
        const cuff = legsCovered && wearing !== "leggings" && Math.abs(y - cuffY) < 0.03 ? 0.008 : 0;
        const t = (hip.y - y) / (hip.y - ankle.y);
        return {
          c: new THREE.Vector3(hip.x + s * 0.005, y, knee.z * Math.min(1, t * 1.6)),
          a: X,
          b: Z,
          ra: r(y) + pants + flare + cuff,
          rb: r(y) + pants + flare + cuff,
          paint: legPaint(y),
          w: legW(y),
        };
      });
    tube(B, rings, { capStart: false });
    blob(B, knee, new THREE.Vector3(0.1 * L, 0.1 * L, 0.1 * L), legPaint(0.3), [
      [`upperleg${side}`, 0.5],
      [`lowerleg${side}`, 0.5],
    ]);
    if (wearing === "cargo") {
      // A pocket on the outside of each thigh.
      cube(B, new THREE.Vector3(hip.x + s * 0.12 * L, 0.43, 0.01), new THREE.Vector3(0.03, 0.09, 0.1), bottom.clone().multiplyScalar(0.85), [[`upperleg${side}`, 1]]);
    }
    shoes(B, look.shoes, { x: hip.x, side, s, ankle, shoe, skin, white, dark, L });
  }

  // --- Clothes that stand out from the body ---
  const chestFront = sizeAt(0.98)[1] * T;
  const neckFront = (y: number) => sizeAt(y)[1] * T;
  if (wearing === "skirt") {
    // A flared skirt; each side follows its leg a little as they walk.
    const skirtW = (p: THREE.Vector3): W => {
      const k = THREE.MathUtils.clamp(p.x / 0.25, -1, 1);
      return [
        ["hips", 0.94],
        ["upperlegl", 0.03 + 0.03 * k],
        ["upperlegr", 0.03 - 0.03 * k],
      ];
    };
    const top0 = look.top === "dress" ? hem : waist;
    tube(
      B,
      [
        { c: new THREE.Vector3(0, top0 + 0.01, 0.005), a: X, b: Z, ra: 0.283 * T, rb: 0.21 * T, n: 2.4, paint: skirtColor, w: skirtW },
        { c: new THREE.Vector3(0, 0.42, 0.005), a: X, b: Z, ra: 0.33 * T, rb: 0.25 * T, n: 2.2, paint: skirtColor, w: skirtW },
        { c: new THREE.Vector3(0, 0.29, 0.01), a: X, b: Z, ra: 0.38 * T, rb: 0.31 * T, n: 2.2, paint: skirtColor, w: skirtW },
        { c: new THREE.Vector3(0, 0.272, 0.01), a: X, b: Z, ra: 0.382 * T, rb: 0.312 * T, n: 2.2, paint: skirtColor.clone().multiplyScalar(0.85), w: skirtW },
      ],
      { capStart: false, capEnd: false },
    );
  }
  if (tucked || (wearing !== "skirt" && kind === "tank")) {
    // A belt with a buckle at the waistband.
    const [bw, bd] = sizeAt(waist);
    tube(
      B,
      [
        { c: new THREE.Vector3(0, waist - 0.02, 0.005), a: X, b: Z, ra: bw * T + 0.012, rb: bd * T + 0.012, n: 2.6, paint: belt, w: torsoW(waist) },
        { c: new THREE.Vector3(0, waist + 0.015, 0.005), a: X, b: Z, ra: bw * T + 0.012, rb: bd * T + 0.012, n: 2.6, paint: belt, w: torsoW(waist) },
      ],
      { capStart: false, capEnd: false },
    );
    cube(B, new THREE.Vector3(0, waist - 0.002, bd * T + 0.018), new THREE.Vector3(0.06, 0.045, 0.015), gold, torsoW(waist));
  }
  if (kind === "hoodie") {
    // The hood lying on the back, a front pocket, and drawstrings.
    blob(B, new THREE.Vector3(0, 1.17, -0.15 * T), new THREE.Vector3(0.21 * T, 0.13, 0.13), topDark, [["chest", 1]], { rows: 12 });
    cube(B, new THREE.Vector3(0, 0.66, sizeAt(0.66)[1] * T + 0.016), new THREE.Vector3(0.32 * T, 0.14, 0.03), topDark, torsoW(0.66));
    for (const x of [-0.05, 0.05]) {
      cube(B, new THREE.Vector3(x, 1.06, neckFront(1.06) + 0.02), new THREE.Vector3(0.014, 0.13, 0.014), white, [["chest", 1]]);
    }
  }
  if (kind === "sweater" || kind === "hoodie") {
    // Ribbed bands at the hem.
    const [hw, hd] = sizeAt(hem + 0.02);
    tube(
      B,
      [
        { c: new THREE.Vector3(0, hem - 0.005, 0.005), a: X, b: Z, ra: hw * T + 0.016, rb: hd * T + 0.016, n: 2.6, paint: topDark, w: torsoW(hem) },
        { c: new THREE.Vector3(0, hem + 0.045, 0.005), a: X, b: Z, ra: hw * T + 0.016, rb: hd * T + 0.016, n: 2.6, paint: topDark, w: torsoW(hem + 0.045) },
      ],
      { capStart: false, capEnd: false },
    );
  }
  if (kind === "buttonup" || kind === "polo" || kind === "jacket") {
    // A collar: two flaps folded down at the front of the neck.
    const color = kind === "jacket" ? topDark : top;
    for (const s of [1, -1]) {
      cube(B, new THREE.Vector3(s * 0.06, 1.2, neckFront(1.2) + 0.02), new THREE.Vector3(0.1, 0.05, 0.02), color, [["chest", 1]], new THREE.Euler(0.35, 0, s * -0.5));
    }
    const buttons = kind === "buttonup" ? [1.08, 0.97, 0.86, 0.75] : kind === "polo" ? [1.12, 1.05] : [];
    for (const y of buttons) blob(B, new THREE.Vector3(0, y, sizeAt(y)[1] * T + 0.006), new THREE.Vector3(0.014, 0.014, 0.008), white, torsoW(y), { rows: 4 });
    if (kind === "jacket") {
      // Zipper edges down the open front.
      for (const x of [-0.07, 0.07]) {
        for (let y = 0.52; y < 1.15; y += 0.07) cube(B, new THREE.Vector3(x, y, sizeAt(y)[1] * T + 0.004), new THREE.Vector3(0.012, 0.05, 0.01), dark, torsoW(y));
      }
    }
  }
  if (kind === "tee" || kind === "striped" || kind === "longsleeve" || kind === "dress") {
    // A crew neck band.
    tube(
      B,
      [
        { c: new THREE.Vector3(0, 1.205, 0.005), a: X, b: Z, ra: 0.15, rb: 0.115, paint: topDark, w: [["chest", 1]] },
        { c: new THREE.Vector3(0, 1.225, 0.005), a: X, b: Z, ra: 0.12, rb: 0.1, paint: topDark, w: [["chest", 1]] },
      ],
      { capStart: false, capEnd: false },
    );
  }
  void chestFront;

  const mesh = new THREE.SkinnedMesh(B.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 }));
  mesh.name = "Outfit";
  // It goes beside `on`, in the same place within their parent.
  mesh.position.copy(on.position);
  mesh.quaternion.copy(on.quaternion);
  mesh.scale.copy(on.scale);
  mesh.bind(on.skeleton, on.bindMatrix);
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  mesh.userData.exact = true;
  mesh.userData.reshaped = true;
  return mesh;
}

/** A pair of shoes, one foot at a time. */
function shoes(
  B: Builder,
  kind: Shoe,
  o: { x: number; side: string; s: number; ankle: THREE.Vector3; shoe: THREE.Color; skin: THREE.Color; white: THREE.Color; dark: THREE.Color; L: number },
) {
  const { x, side, ankle, shoe, skin, white, dark } = o;
  const footW = (z: number): W => (z < 0.06 ? [[`foot${side}`, 1]] : lerpW(`foot${side}`, `toes${side}`, (z - 0.06) / 0.1));
  const X = new THREE.Vector3(1, 0, 0);
  const Y = new THREE.Vector3(0, 1, 0);
  const Z = new THREE.Vector3(0, 0, 1);
  // The foot's outline from heel to toe: [z, half-width, height].
  const outline: [number, number, number][] = [
    [-0.12, 0.07, 0.11],
    [-0.1, 0.092, 0.15],
    [-0.02, 0.1, 0.165],
    [0.08, 0.104, 0.13],
    [0.18, 0.1, 0.105],
    [0.235, 0.085, 0.085],
    [0.255, 0.06, 0.06],
  ];
  const sandal = kind === "sandals";
  const soleColor = kind === "sneakers" || kind === "slipons" ? white : kind === "rainboots" ? shoe.clone().multiplyScalar(0.7) : dark;
  const sole = 0.03;
  const upper = sandal ? skin : shoe;
  // The upper: a rounded shape over the foot, flat underneath.
  const rings: Ring[] = outline.map(([z, w, h]) => ({
    c: new THREE.Vector3(x, sole + (h - sole) / 2, z),
    a: X,
    b: Y,
    ra: w * (sandal ? 0.85 : 1),
    rb: (h - sole) / 2 + 0.002,
    n: 3,
    paint: (p: THREE.Vector3) => (kind === "hikers" && p.y > 0.09 && Math.abs(p.x - x) < 0.025 && p.z > 0 && p.z < 0.12 ? new THREE.Color("#b5483a") : upper),
    w: footW(z),
  }));
  tube(B, rings);
  // The sole, a little wider than the shoe.
  const soleRings: Ring[] = outline.map(([z, w]) => ({
    c: new THREE.Vector3(x, sole / 2, z),
    a: X,
    b: Y,
    ra: w + 0.008,
    rb: sole / 2,
    n: 5,
    paint: soleColor,
    w: footW(z),
  }));
  tube(B, soleRings);
  if (sandal) {
    // Two straps over the foot.
    for (const z of [0.0, 0.14]) {
      tube(B, [
        { c: new THREE.Vector3(x, 0.07, z - 0.012), a: X, b: Y, ra: 0.1, rb: 0.07, n: 3, paint: shoe, w: footW(z) },
        { c: new THREE.Vector3(x, 0.07, z + 0.012), a: X, b: Y, ra: 0.1, rb: 0.07, n: 3, paint: shoe, w: footW(z) },
      ]);
    }
  }
  if (kind === "sneakers") {
    // A tongue and laces.
    for (const z of [0.02, 0.06, 0.1]) cube(B, new THREE.Vector3(x, 0.155 - z * 0.25, z), new THREE.Vector3(0.09, 0.012, 0.012), white, footW(z));
  }
  if (kind === "boots" || kind === "hikers" || kind === "rainboots") {
    // A shaft up the ankle.
    const top = kind === "rainboots" ? 0.3 : kind === "boots" ? 0.25 : 0.22;
    const legW = (y: number): W => (y < 0.15 ? [[`foot${side}`, 1]] : [[`lowerleg${side}`, 1]]);
    const ys = [0.1, 0.15, (0.15 + top) / 2, top - 0.02, top];
    tube(
      B,
      ys.map((y) => ({
        c: new THREE.Vector3(x, y, ankle.z * 0.5),
        a: X,
        b: Z,
        ra: (y === top ? 0.112 : 0.104) * o.L,
        rb: (y === top ? 0.112 : 0.104) * o.L,
        paint: kind === "hikers" && y === top ? new THREE.Color("#6b4b33") : shoe,
        w: legW(y),
      })),
      { capStart: false },
    );
  }
}

/**
 * The dressed torso's size (model units, from its middle line): front and back
 * at the chest, half-width at the chest and hips, and the top of the shoulders.
 * Gear is placed against these.
 */
export function torsoOf(look: Look) {
  const T = BUILD_WIDTH[look.build].torso;
  return { front: 0.222 * T + 0.005, back: 0.222 * T - 0.005, side: 0.3 * T, hip: 0.275 * T, shoulderY: 1.215 };
}
