import * as THREE from "three";
import { ball, box, cyl, mat } from "@/components/stage3d/props";
import type { HeadFit } from "@/components/stage3d/fit";
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
  ball.position.set(head.x, head.cy, head.z - head.rz * 0.12);
  ball.castShadow = true;
  return ball;
}

/**
 * Fill the top of the bald head (hair was sculpted there, so there's no skull
 * under it): a dome in skin color, or in hair color under a buzz cut or hair.
 */
export function skull(head: HeadShape, color: string, whole = false) {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 });
  if (whole) {
    // No sculpted hair on top: the hair is a cap over the whole skull, down to the brows.
    const rim = THREE.MathUtils.clamp((head.y - head.cy) / head.ry, -0.9, 0.9);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 30, 16, 0, Math.PI * 2, 0, Math.acos(rim)), material);
    cap.scale.set(head.rx * 1.03, head.ry * 1.03, head.rz * 1.03);
    cap.position.set(head.x, head.cy, head.z - head.rz * 0.12);
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
  const sz = z - head.rz * 0.12;
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
      puff.scale.set(head.rx * 1.35, head.ry * 1.12, head.rz * 1.22);
      puff.position.set(head.x, head.cy + head.ry * 0.38, sz - head.rz * 0.32);
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
    jaw.position.set(head.x, head.cy, head.z - head.rz * 0.12);
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
  const gold = "#e9b52a";
  switch (kind) {
    case "studs":
    case "hoops": {
      const g = new THREE.Group();
      for (const side of [-1, 1]) {
        const piece =
          kind === "studs"
            ? ball(0.035, "#dfe7ea", { emissive: "#9ab" })
            : new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 16), mat(gold));
        piece.position.set(side * ((fit?.earX ?? 0.4) + 0.01), (fit?.earY ?? 0.2) - (kind === "hoops" ? 0.05 : 0), fit?.earZ ?? 0);
        if (kind === "hoops") piece.rotation.y = Math.PI / 2;
        g.add(piece);
      }
      return { head: g };
    }
    case "flower": {
      const g = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const petal = ball(0.05, "#ff8fb1");
        petal.position.set(Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0);
        petal.scale.z = 0.5;
        g.add(petal);
      }
      g.add(ball(0.035, "#ffd34a"));
      // Tucked over the left ear, on the hair.
      const f = fit;
      g.position.set(-(f ? f.rx * 0.92 : 0.3), f ? f.bandY + 0.03 : 0.44, f ? f.bandZ + f.rz * 0.35 : 0.16);
      g.rotation.y = -1.0;
      return { head: g };
    }
    case "headband": {
      // An arc from ear to ear over the hair, just behind the hairline.
      const f = fit ?? { rx: 0.38, bandY: 0.36, bandZ: 0, top: 0.62, rz: 0.36 };
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 16; i++) {
        const a = (i / 16) * Math.PI;
        pts.push(new THREE.Vector3(Math.cos(a) * (f.rx + 0.025), f.bandY - 0.04 + Math.sin(a) * (f.top - f.bandY + 0.07), 0));
      }
      const band = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.028, 6), mat(color));
      band.position.z = f.bandZ + f.rz * 0.15;
      band.rotation.x = -0.25;
      return { head: band };
    }
    case "pearls": {
      const g = new THREE.Group();
      for (let i = 0; i < 13; i++) {
        const a = Math.PI * 0.15 + (i / 12) * Math.PI * 0.7;
        const p = ball(0.028, "#f6f1e7");
        p.position.set(Math.cos(a) * 0.16 * width, 0.15, Math.sin(a) * 0.15 * width);
        g.add(p);
      }
      return { chest: g };
    }
    case "bowtie": {
      const g = new THREE.Group();
      for (const side of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 4), mat("#c0392b"));
        wing.rotation.z = (side * Math.PI) / 2;
        wing.position.x = side * 0.05;
        g.add(wing);
      }
      g.add(ball(0.025, "#a5281f"));
      g.position.set(0, 0.15, 0.17 * width);
      return { chest: g };
    }
    case "chain": {
      const g = new THREE.Group();
      for (let i = 0; i < 11; i++) {
        const a = Math.PI * 0.2 + (i / 10) * Math.PI * 0.6;
        const link = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.007, 4, 8), mat(gold));
        link.position.set(Math.cos(a) * 0.15 * width, 0.12 - Math.sin(a) * 0.03, Math.sin(a) * 0.16 * width);
        g.add(link);
      }
      return { chest: g };
    }
    case "watch": {
      const g = new THREE.Group();
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.022, 6, 12), mat("#2b2b30"));
      const face = cyl(0.035, 0.035, 0.03, "#dfe7ea", 12);
      face.rotation.z = Math.PI / 2;
      face.position.x = 0.07;
      g.add(strap, face);
      return { arm: g };
    }
    default:
      return {};
  }
}

export const isFeminine = (g: Gender) => g === "female";
