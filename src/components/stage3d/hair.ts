import * as THREE from "three";
import { ball, box, mat } from "@/components/stage3d/props";
import type { HeadFit } from "@/components/stage3d/fit";
import { ball as hball, mat as hm, mesh as hmesh, tube as htube } from "@/components/stage3d/hats";
import type { Body, Extra, FacialHair, Gender, HairStyle } from "@/lib/look";

/**
 * Hair, beards and finishing touches.
 *
 * KayKit sculpts each adventurer's hair into the head mesh, painted from the
 * atlas's hair swatch (cell 1,0). We split every head by that swatch into a
 * bald head, its hair and (for the woodsman) its beard. The bald head is what
 * everyone wears; the sculpted hair and beard can then go on any body, since
 * all four share one skeleton. The rest of the styles are built here to match.
 */

type Parts = {
  bald: THREE.BufferGeometry;
  hair: THREE.BufferGeometry;
  beard: THREE.BufferGeometry;
  /** Height of the top of the brows (the dark swatch) in the head's own space. */
  browTop: number;
};
const split = new WeakMap<THREE.BufferGeometry, Parts>();

const cellOf = (u: number, v: number) => [Math.floor(u * 8), Math.floor(v * 4)] as const;

/** A head's geometry in three: everything but hair, the hair, and the beard (hair below the eyes, in front). */
export function splitHead(geo: THREE.BufferGeometry): Parts {
  const cached = split.get(geo);
  if (cached) return cached;
  const uv = geo.getAttribute("uv");
  const pos = geo.getAttribute("position");
  const index = geo.getIndex();
  const n = index ? index.count : pos.count;
  const at = (i: number) => (index ? index.getX(i) : i);

  // The eyes (the dark swatch, cell 2,0) set the line between hair and beard.
  let eyeY = 0;
  let eyes = 0;
  let browTop = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    minZ = Math.min(minZ, pos.getZ(i));
    maxZ = Math.max(maxZ, pos.getZ(i));
  }
  const tris: { a: number; b: number; c: number; hair: boolean; y: number; z: number }[] = [];
  for (let t = 0; t < n; t += 3) {
    const a = at(t), b = at(t + 1), c = at(t + 2);
    const u = (uv.getX(a) + uv.getX(b) + uv.getX(c)) / 3;
    const v = (uv.getY(a) + uv.getY(b) + uv.getY(c)) / 3;
    const [cx, cy] = cellOf(u, v);
    const y = (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3;
    const z = (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3;
    if (cx === 2 && cy === 0) {
      eyeY += y;
      eyes++;
      browTop = Math.max(browTop, pos.getY(a), pos.getY(b), pos.getY(c));
    }
    tris.push({ a, b, c, hair: cx === 1 && cy === 0, y, z });
  }
  eyeY = eyes ? eyeY / eyes : 0;
  const midZ = (minZ + maxZ) / 2;
  const bald: number[] = [];
  const hair: number[] = [];
  const beard: number[] = [];
  for (const t of tris) {
    const list = !t.hair ? bald : t.y < eyeY - 0.02 && t.z > midZ ? beard : hair;
    list.push(t.a, t.b, t.c);
  }
  const make = (ids: number[]) => {
    const g = geo.clone();
    g.setIndex(ids);
    return g;
  };
  const parts = { bald: make(bald), hair: make(hair), beard: make(beard), browTop };
  split.set(geo, parts);
  return parts;
}

/**
 * Which body's sculpted hair each style starts from (the built pieces go on
 * top). Styles without one sit on a hair-colored skull (buzz, curly, afro,
 * spiky) or a bare one (bald, mohawk).
 */
export const SCULPTED: Partial<Record<HairStyle, Body>> = {
  long: "rogue",
  tousled: "knight",
  neat: "mage",
  ponytail: "mage",
  bun: "mage",
  pigtails: "mage",
  braid: "mage",
  bob: "mage",
  pixie: "mage",
  manbun: "mage",
};

/** The head's shape in the head bone's space, in stage units: where to put a skull and things on it. */
export interface HeadShape {
  x: number;
  y: number;
  z: number;
  r: number;
  /** The whole head as an ellipsoid (center and radii), for the skull underneath. */
  cy: number;
  rx: number;
  ry: number;
  rz: number;
  /** The skull's center depth, when fitted to the face (else z - rz × 0.12). */
  sz?: number;
  /** The skull behind the face (skullFor), when there is one: hair that hugs the head is built from it. */
  fill?: THREE.BufferGeometry;
}

/**
 * A copy of the skull pushed out a little, kept where `keep` says (by direction
 * from the skull's center): hair that hugs the head exactly where the hair was,
 * tucked under the face everywhere the face is.
 */
function shellOf(head: HeadShape, scale: number, keep: (d: THREE.Vector3) => boolean = () => true): THREE.BufferGeometry | null {
  if (!head.fill) return null;
  const g = head.fill.clone();
  const pos = g.getAttribute("position");
  const c = new THREE.Vector3(head.x, head.cy, head.sz ?? head.z - head.rz * 0.12);
  const v = new THREE.Vector3();
  const kept: boolean[] = [];
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).sub(c);
    kept.push(keep(new THREE.Vector3(v.x / head.rx, v.y / head.ry, v.z / head.rz).normalize()));
    v.multiplyScalar(scale).add(c);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  const index = g.getIndex();
  if (index) {
    const ids: number[] = [];
    for (let t = 0; t < index.count; t += 3) {
      const [a, b, d] = [index.getX(t), index.getX(t + 1), index.getX(t + 2)];
      if (kept[a] && kept[b] && kept[d]) ids.push(a, b, d);
    }
    g.setIndex(ids);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * The head's sculpted hair also formed the back and sides of the skull, so a
 * bald head has holes there. A smooth skin-colored head underneath fills them;
 * the face sits just in front of it.
 */
export function fullSkull(head: HeadShape, skin: string) {
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 18), new THREE.MeshStandardMaterial({ color: skin, roughness: 0.85, metalness: 0 }));
  ball.scale.set(head.rx, head.ry, head.rz);
  // Its color is the face's own: leave it exactly as is.
  ball.userData.exact = true;
  ball.position.set(head.x, head.cy, (head.sz ?? head.z - head.rz * 0.12));
  ball.castShadow = true;
  return ball;
}

/**
 * Fill the top of the bald head (hair was sculpted there, so there's no skull
 * under it): a dome in skin color, or in hair color under a buzz cut or hair.
 */
export function skull(head: HeadShape, color: string, whole = false) {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 });
  const shell = whole ? shellOf(head, 1.025) : null;
  if (shell) {
    // No sculpted hair on top: short hair over the skull, just where the hair was.
    const cap = new THREE.Mesh(shell, material);
    cap.castShadow = true;
    // Its own geometry: freed with the actor.
    cap.userData.reshaped = true;
    return cap;
  }
  if (whole) {
    // No sculpted hair on top: the hair is a cap over the whole skull, down to the brows.
    const rim = THREE.MathUtils.clamp((head.y - head.cy) / head.ry, -0.9, 0.9);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 30, 16, 0, Math.PI * 2, 0, Math.acos(rim)), material);
    cap.scale.set(head.rx * 1.03, head.ry * 1.03, head.rz * 1.03);
    cap.position.set(head.x, head.cy, (head.sz ?? head.z - head.rz * 0.12));
    cap.castShadow = true;
    return cap;
  }
  // A half dome whose rim sits at the brows: it fills the crown and never covers the face.
  // Smooth-shaded (unlike the faceted props) so a bald scalp blends into the face.
  const dome = new THREE.Mesh(new THREE.SphereGeometry(head.r, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), material);
  dome.position.set(head.x, head.y, head.z);
  dome.castShadow = true;
  return dome;
}

/** A skull color for a style: skin when bald, hair color (a shade darker) under hair. */
export function skullColor(style: HairStyle, hair: string, skin: string) {
  if (style === "bald" || style === "mohawk") return skin;
  const c = new THREE.Color(hair);
  if (style === "buzz") c.lerp(new THREE.Color(skin), 0.35);
  return `#${c.getHexString()}`;
}

/**
 * A piece of another body (its face, hair, beard or legs), skinned onto this
 * body's skeleton. It keeps the bind pose it was sculpted with: each body binds
 * its head bone a little differently (the wizard's bigger and further back, the
 * knight's higher), so binding with this body's own would resize and shift it.
 */
export function transplant(piece: THREE.BufferGeometry, from: THREE.SkinnedMesh, onto: THREE.SkinnedMesh) {
  const mesh = new THREE.SkinnedMesh(piece, onto.material);
  const inverses = from.skeleton.bones.map((b) => b.name);
  const skeleton = new THREE.Skeleton(
    onto.skeleton.bones,
    onto.skeleton.bones.map((b, i) => {
      const j = inverses.indexOf(b.name);
      return (j >= 0 ? from.skeleton.boneInverses[j] : onto.skeleton.boneInverses[i]).clone();
    }),
  );
  mesh.bind(skeleton, from.bindMatrix);
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

// ---------------------------------------------------------------------------
// Built styles, in the head bone's space (stage units for a 1.55-tall person).

const hairMat = (color: string) => mat(color, { rough: 0.95 });

/** The pieces a style adds on top of its sculpted base or skull. */
export function builtHair(style: HairStyle, color: string, head: HeadShape): THREE.Object3D | null {
  const g = new THREE.Group();
  const { x, y, z, r } = head;
  const top = y + r;
  // The smooth skull (as fullSkull draws it), for styles built all over it.
  const sz = head.sz ?? z - head.rz * 0.12;
  const onSkull = (n: THREE.Vector3, k: number) =>
    new THREE.Vector3(head.x + n.x * head.rx * k, head.cy + n.y * head.ry * k, sz + n.z * head.rz * k);
  const back = z - r;
  const tie = (at: THREE.Vector3) => {
    const t = ball(0.05, "#e45b8a");
    t.position.copy(at);
    t.userData.tail = true;
    return t;
  };
  // Tails, knots and braids hang off the head: hats go over the hair, not them.
  const hanging = (o: THREE.Object3D) => {
    o.userData.tail = true;
    return o;
  };
  switch (style) {
    case "ponytail": {
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.6, 10), hairMat(color));
      tail.rotation.x = Math.PI - 0.4;
      tail.position.set(x, y + r * 0.15, back - 0.2);
      tail.castShadow = true;
      g.add(hanging(tail), tie(new THREE.Vector3(x, y + r * 0.45, back + 0.02)));
      break;
    }
    case "bun": {
      const knot = ball(0.17, color, { detail: 2 });
      knot.position.set(x, top + 0.04, z - r * 0.35);
      g.add(hanging(knot));
      break;
    }
    case "manbun": {
      const knot = ball(0.13, color, { detail: 2 });
      knot.position.set(x, y + r * 0.75, back + 0.04);
      g.add(hanging(knot));
      break;
    }
    case "pigtails": {
      for (const side of [-1, 1]) {
        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.45, 10), hairMat(color));
        tail.position.set(x + side * (r + 0.06), y - r * 0.25, z - r * 0.25);
        tail.rotation.set(Math.PI, 0, side * 0.4);
        tail.castShadow = true;
        g.add(hanging(tail), tie(new THREE.Vector3(x + side * (r - 0.02), y + r * 0.2, z - r * 0.25)));
      }
      break;
    }
    case "braid": {
      for (let i = 0; i < 6; i++) {
        const knot = ball(0.09 - i * 0.007, color);
        knot.position.set(x, y - i * 0.13, back - 0.06 - Math.min(i, 2) * 0.02);
        knot.scale.set(1, 0.8, 1);
        g.add(hanging(knot));
      }
      g.add(tie(new THREE.Vector3(x, y - 0.78, back - 0.1)));
      break;
    }
    case "bob": {
      for (const side of [-1, 1]) {
        const lock = ball(0.2, color, { detail: 1 });
        lock.scale.set(0.55, 1.15, 1.0);
        lock.position.set(x + side * (r - 0.02), y - r * 0.15, z - r * 0.1);
        g.add(lock);
      }
      const nape = ball(0.3, color, { detail: 1 });
      nape.scale.set(1.2, 0.8, 0.6);
      nape.position.set(x, y - r * 0.05, back + 0.08);
      g.add(nape);
      break;
    }
    case "pixie": {
      const fringe = ball(0.17, color);
      fringe.scale.set(1.5, 0.45, 0.8);
      fringe.position.set(x + 0.08, top - 0.1, z + r * 0.55);
      fringe.rotation.z = -0.3;
      g.add(fringe);
      break;
    }
    case "spiky": {
      // Spikes standing out of the crown, each along the skull's own normal.
      const size = head.rx / 0.3;
      for (let i = 0; i < 13; i++) {
        const a = (i / 13) * Math.PI * 2;
        const phi = i % 2 ? 0.75 : 0.35;
        const n = new THREE.Vector3(Math.sin(phi) * Math.cos(a), Math.cos(phi), Math.sin(phi) * Math.sin(a));
        // Not down over the forehead.
        if (n.z > 0.45) n.z = 0.45;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.09 * size, 0.28 * size, 5), hairMat(color));
        spike.position.copy(onSkull(n, 0.92));
        spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n.normalize());
        spike.castShadow = true;
        g.add(spike);
      }
      break;
    }
    case "mohawk": {
      // A crest of fins from the hairline over the crown to the back.
      const size = head.rx / 0.3;
      for (let i = 0; i < 7; i++) {
        const a = -0.55 + i * 0.36;
        const n = new THREE.Vector3(0, Math.cos(a), Math.sin(-a));
        const fin = new THREE.Mesh(new THREE.ConeGeometry(0.085 * size, 0.3 * size, 4), hairMat(color));
        fin.scale.z = 0.45;
        fin.position.copy(onSkull(n, 0.97));
        fin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n.normalize());
        fin.castShadow = true;
        g.add(fin);
      }
      break;
    }
    case "rugged": {
      // Receding: bare on top, a horseshoe of short hair round the sides and back.
      const horseshoe = shellOf(head, 1.03, (d) => d.y < 0.58 && d.y > -0.3 && d.z < 0.5);
      if (horseshoe) {
        // Smooth-shaded, like the skull it hugs.
        const band = new THREE.Mesh(horseshoe, new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0 }));
        band.castShadow = true;
        band.userData.reshaped = true;
        g.add(band);
        break;
      }
      const band = new THREE.Mesh(
        new THREE.SphereGeometry(1, 30, 10, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0.95, 0.85),
        hairMat(color),
      );
      band.scale.set(head.rx * 1.05, head.ry * 1.05, head.rz * 1.05);
      band.position.set(head.x, head.cy, sz);
      band.castShadow = true;
      g.add(band);
      break;
    }
    case "afro": {
      // A big round puff sitting back from the hairline, wider than the head.
      const puff = ball(1, color, { detail: 2 });
      // Its front stops at the hairline, so it frames the face rather than hiding it.
      puff.scale.set(head.rx * 1.32, head.ry * 1.1, head.rz * 1.12);
      puff.position.set(head.x, head.cy + head.ry * 0.45, sz + head.rz * 0.5 - head.rz * 1.12);
      g.add(puff);
      break;
    }
    case "curly": {
      const size = head.rx / 0.3;
      for (let i = 0; i < 30; i++) {
        // A spiral over the skull, front to back.
        const a = i * 2.4;
        const phi = Math.acos(1 - ((i + 0.5) / 30) * 1.25);
        const n = new THREE.Vector3(Math.sin(phi) * Math.cos(a), Math.cos(phi), Math.sin(phi) * Math.sin(a));
        // Keep the face clear.
        if (n.z > 0.35 && n.y < 0.55) continue;
        const curl = ball(0.1 * size, color);
        curl.position.copy(onSkull(n, 1.0));
        g.add(curl);
      }
      break;
    }
    default:
      return null;
  }
  return g;
}

/** Beards that aren't the woodsman's sculpted one, on this face's lip and chin. */
export function builtFacialHair(kind: FacialHair, color: string, skin: string, fit: HeadFit, head: HeadShape): THREE.Object3D | null {
  if (kind === "none" || kind === "beard") return null;
  const g = new THREE.Group();
  // Sized to the face: a mustache spans about the gap between the eyes.
  const span = fit.eyeX * 1.25;
  const lip = fit.mouthY + (fit.eyeY - fit.mouthY) * 0.18;
  if (kind === "stubble") {
    // A shadow along the lower jaw, hugging the head.
    const shade = new THREE.Color(skin).lerp(new THREE.Color(color), 0.4);
    const jaw = new THREE.Mesh(
      new THREE.SphereGeometry(1, 20, 10, Math.PI * 0.2, Math.PI * 0.6, Math.PI * 0.55, Math.PI * 0.3),
      mat(`#${shade.getHexString()}`, { rough: 1 }),
    );
    jaw.scale.set(head.rx * 1.02, head.ry * 1.04, head.rz * 1.04);
    jaw.position.set(head.x, head.cy, (head.sz ?? head.z - head.rz * 0.12));
    g.add(jaw);
    return g;
  }
  const thick = span * 0.18;
  const stache = new THREE.Mesh(new THREE.CapsuleGeometry(thick, span, 4, 8), hairMat(color));
  stache.rotation.z = Math.PI / 2;
  stache.position.set(0, lip, fit.mouthZ + thick * 0.6);
  stache.castShadow = true;
  g.add(stache);
  if (kind === "goatee") {
    const h = Math.max(0.08, (lip - fit.chinY) * 0.9);
    const chin = new THREE.Mesh(new THREE.ConeGeometry(span * 0.35, h, 8), hairMat(color));
    chin.rotation.x = Math.PI;
    chin.position.set(0, fit.chinY + h * 0.3, fit.mouthZ - 0.01);
    g.add(chin);
  }
  return g;
}

/** Eyelashes: a little flick at each eye's outer corner. */
export function lashes(fit: HeadFit): THREE.Object3D {
  const g = new THREE.Group();
  const corner = fit.eyeX * 1.32;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const lash = box(0.05, 0.014, 0.012, "#1d1d22");
      lash.position.set(side * (corner + i * 0.025), fit.eyeY + 0.03 + i * 0.012, fit.eyeZ - 0.03 - i * 0.02);
      lash.rotation.z = side * (0.5 + i * 0.3);
      g.add(lash);
    }
  }
  return g;
}

/** Jewelry and finishing touches: head-bone pieces and chest-bone pieces. */
export function extraPieces(kind: Extra, color: string, width = 1, fit: HeadFit | null = null): { head?: THREE.Object3D; chest?: THREE.Object3D; arm?: THREE.Object3D } {
  const gold = hm("#d4a93f", 0.25, { metal: 0.9 });
  const silver = hm("#d7dbde", 0.2, { metal: 0.9 });
  switch (kind) {
    case "studs":
    case "hoops": {
      const g = new THREE.Group();
      for (const side of [-1, 1]) {
        const at = new THREE.Vector3(side * ((fit?.earX ?? 0.4) + 0.012), (fit?.earY ?? 0.2) - 0.01, fit?.earZ ?? 0);
        if (kind === "studs") {
          // A faceted gem in a little silver setting.
          const set = hmesh(new THREE.CylinderGeometry(0.03, 0.026, 0.012, 16), silver);
          set.rotation.z = Math.PI / 2;
          const gem = hmesh(new THREE.OctahedronGeometry(0.026, 0), hm("#e8f3f6", 0.05, { metal: 0.2, emissive: "#6f8a96" }));
          gem.position.x = side * 0.012;
          gem.scale.x = 0.6;
          const stud = new THREE.Group();
          stud.add(set, gem);
          stud.position.copy(at);
          g.add(stud);
        } else {
          const hoop = hmesh(new THREE.TorusGeometry(0.055, 0.009, 12, 48), gold);
          hoop.rotation.y = Math.PI / 2;
          hoop.position.copy(at).add(new THREE.Vector3(0, -0.05, 0));
          g.add(hoop);
        }
      }
      return { head: g };
    }
    case "flower": {
      // A hibiscus-style blossom tucked over the left ear: teardrop petals, a golden center, two leaves.
      const g = new THREE.Group();
      const petal = hm("#d98a9e", 0.6);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const p = hball(0.045, petal, 20);
        p.scale.set(1.35, 0.8, 0.35);
        p.position.set(Math.cos(a) * 0.05, Math.sin(a) * 0.05, -Math.abs(Math.cos(a)) * 0.004);
        p.rotation.z = a;
        g.add(p);
      }
      const middle = hball(0.024, hm("#e3b64a", 0.6), 16);
      middle.position.z = 0.012;
      g.add(middle);
      for (const s of [-1, 1]) {
        const leaf = hball(0.04, hm("#5d7a4a", 0.7), 16);
        leaf.scale.set(1.6, 0.6, 0.25);
        leaf.position.set(s * 0.075, -0.05, -0.012);
        leaf.rotation.z = s * -0.5;
        g.add(leaf);
      }
      const f = fit;
      g.position.set(-(f ? f.rx * 0.92 : 0.3), f ? f.bandY + 0.03 : 0.44, f ? f.bandZ + f.rz * 0.35 : 0.16);
      g.rotation.y = -1.0;
      return { head: g };
    }
    case "headband": {
      // A padded headband from ear to ear over the hair, just behind the hairline.
      const f = fit ?? { rx: 0.38, bandY: 0.36, bandZ: 0, top: 0.62, rz: 0.36 };
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 24; i++) {
        const a = (i / 24) * Math.PI;
        pts.push(new THREE.Vector3(Math.cos(a) * (f.rx + 0.03), f.bandY - 0.04 + Math.sin(a) * (f.top - f.bandY + 0.08), 0));
      }
      const band = htube(pts, 0.032, 0.032, hm(color, 0.55));
      band.scale.z = 0.55;
      band.position.z = f.bandZ + f.rz * 0.15;
      band.rotation.x = -0.25;
      return { head: band };
    }
    case "pearls": {
      // A strand of pearls draping round the neck and dipping at the front.
      const g = new THREE.Group();
      const pearl = hm("#f4efe4", 0.18, { metal: 0.15 });
      for (let i = 0; i < 25; i++) {
        const a = Math.PI * 0.1 + (i / 24) * Math.PI * 0.8;
        const dip = Math.sin(a) ** 3 * 0.06;
        const p = hball(0.021, pearl, 14);
        p.position.set(Math.cos(a) * 0.165 * width, 0.16 - dip, Math.sin(a) * 0.155 * width);
        g.add(p);
      }
      return { chest: g };
    }
    case "bowtie": {
      // A real bow tie: two pinched wings with soft edges and a wrapped knot.
      const g = new THREE.Group();
      const red = hm("#a5323c", 0.55);
      for (const side of [-1, 1]) {
        const w = new THREE.Shape();
        w.moveTo(0, 0.018);
        w.bezierCurveTo(0.04, 0.03, 0.08, 0.06, 0.1, 0.045);
        w.bezierCurveTo(0.115, 0.02, 0.115, -0.02, 0.1, -0.045);
        w.bezierCurveTo(0.08, -0.06, 0.04, -0.03, 0, -0.018);
        w.closePath();
        const wing = hmesh(new THREE.ExtrudeGeometry(w, { depth: 0.02, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, curveSegments: 16 }), red);
        wing.scale.x = side;
        wing.position.z = -0.01;
        g.add(wing);
      }
      const knot = hball(0.024, hm("#8a2830", 0.55), 16);
      knot.scale.set(0.9, 1.1, 0.8);
      knot.position.z = 0.012;
      g.add(knot);
      g.position.set(0, 0.15, 0.17 * width);
      return { chest: g };
    }
    case "chain": {
      // A gold chain of interlocking links, alternating flat and edge-on.
      const g = new THREE.Group();
      const n = 27;
      for (let i = 0; i < n; i++) {
        const a = Math.PI * 0.18 + (i / (n - 1)) * Math.PI * 0.64;
        const p = new THREE.Vector3(Math.cos(a) * 0.155 * width, 0.13 - Math.sin(a) ** 2 * 0.035, Math.sin(a) * 0.162 * width);
        const link = hmesh(new THREE.TorusGeometry(0.014, 0.0045, 8, 16), gold);
        link.scale.x = 1.4;
        link.position.copy(p);
        // Along the chain, each link turned a quarter from the last.
        link.rotation.set(i % 2 ? Math.PI / 2 : 0, -a + Math.PI / 2, 0);
        g.add(link);
      }
      return { chest: g };
    }
    case "watch": {
      // A leather strap with a buckle, a round face with a bezel and hands.
      const g = new THREE.Group();
      const strap = hmesh(new THREE.TorusGeometry(0.06, 0.018, 10, 32), hm("#5b3a22", 0.7));
      strap.scale.z = 1.6;
      const face = new THREE.Group();
      const bezel = hmesh(new THREE.CylinderGeometry(0.038, 0.038, 0.018, 32), silver);
      bezel.rotation.z = Math.PI / 2;
      const dial = hmesh(new THREE.CircleGeometry(0.031, 32), hm("#f3f0ea", 0.4));
      dial.rotation.y = Math.PI / 2;
      dial.position.x = 0.0095;
      const hands = hm("#1d1d22", 0.4);
      const hour = hmesh(new THREE.BoxGeometry(0.002, 0.018, 0.004), hands);
      hour.position.set(0.0105, 0.008, 0.002);
      hour.rotation.x = 0.5;
      const minute = hmesh(new THREE.BoxGeometry(0.002, 0.026, 0.003), hands);
      minute.position.set(0.0105, 0.004, -0.01);
      minute.rotation.x = -1.2;
      face.add(bezel, dial, hour, minute);
      face.position.x = 0.07;
      g.add(strap, face);
      return { arm: g };
    }
    default:
      return {};
  }
}

export const isFeminine = (g: Gender) => g === "female";
