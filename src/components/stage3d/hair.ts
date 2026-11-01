import * as THREE from "three";
import { ball, box, cyl, mat } from "@/components/stage3d/props";
import { HEAD } from "@/components/stage3d/accessories";
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
  rugged: "barbarian",
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
  ball.position.set(head.x, head.cy, head.z - head.rz * 0.12);
  ball.castShadow = true;
  return ball;
}

/**
 * Fill the top of the bald head (hair was sculpted there, so there's no skull
 * under it): a dome in skin color, or in hair color under a buzz cut or hair.
 */
export function skull(head: HeadShape, color: string) {
  // A half dome whose rim sits at the brows: it fills the crown and never covers the face.
  // Smooth-shaded (unlike the faceted props) so a bald scalp blends into the face.
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(head.r, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 }),
  );
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

/** A piece of another body's head (its hair or beard), skinned onto this body's head. */
export function transplant(piece: THREE.BufferGeometry, onto: THREE.SkinnedMesh) {
  const mesh = new THREE.SkinnedMesh(piece, onto.material);
  mesh.bind(onto.skeleton, onto.bindMatrix);
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
  const back = z - r;
  const tie = (at: THREE.Vector3) => {
    const t = ball(0.05, "#e45b8a");
    t.position.copy(at);
    return t;
  };
  switch (style) {
    case "ponytail": {
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.6, 10), hairMat(color));
      tail.rotation.x = Math.PI - 0.4;
      tail.position.set(x, y + r * 0.15, back - 0.2);
      tail.castShadow = true;
      g.add(tail, tie(new THREE.Vector3(x, y + r * 0.45, back + 0.02)));
      break;
    }
    case "bun": {
      const knot = ball(0.17, color, { detail: 2 });
      knot.position.set(x, top + 0.04, z - r * 0.35);
      g.add(knot);
      break;
    }
    case "manbun": {
      const knot = ball(0.13, color, { detail: 2 });
      knot.position.set(x, y + r * 0.75, back + 0.04);
      g.add(knot);
      break;
    }
    case "pigtails": {
      for (const side of [-1, 1]) {
        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.45, 10), hairMat(color));
        tail.position.set(x + side * (r + 0.06), y - r * 0.25, z - r * 0.25);
        tail.rotation.set(Math.PI, 0, side * 0.4);
        tail.castShadow = true;
        g.add(tail, tie(new THREE.Vector3(x + side * (r - 0.02), y + r * 0.2, z - r * 0.25)));
      }
      break;
    }
    case "braid": {
      for (let i = 0; i < 6; i++) {
        const knot = ball(0.09 - i * 0.007, color);
        knot.position.set(x, y - i * 0.13, back - 0.06 - Math.min(i, 2) * 0.02);
        knot.scale.set(1, 0.8, 1);
        g.add(knot);
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
      for (let i = 0; i < 11; i++) {
        const a = (i / 11) * Math.PI * 2;
        const ring = i % 2 ? 0.55 : 0.25;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 5), hairMat(color));
        spike.position.set(x + Math.cos(a) * r * ring, top - 0.02 - ring * 0.08, z + Math.sin(a) * r * ring);
        spike.rotation.set(Math.sin(a) * ring * 0.9, 0, -Math.cos(a) * ring * 0.9);
        spike.castShadow = true;
        g.add(spike);
      }
      break;
    }
    case "mohawk": {
      for (let i = 0; i < 6; i++) {
        const fin = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 4), hairMat(color));
        fin.scale.z = 0.5;
        const a = 0.4 - i * 0.32;
        fin.position.set(x, y + Math.cos(a) * r + 0.06, z + Math.sin(a) * r);
        fin.rotation.x = a;
        fin.castShadow = true;
        g.add(fin);
      }
      break;
    }
    case "afro": {
      const puff = ball(r * 1.18, color, { detail: 2 });
      puff.position.set(x, y + r * 0.55, z - r * 0.32);
      g.add(puff);
      break;
    }
    case "curly": {
      for (let i = 0; i < 18; i++) {
        const a = i * 2.4;
        const lift = (i % 4) / 4;
        const curl = ball(0.1, color);
        const phi = 0.25 + lift * 0.9;
        curl.position.set(x + Math.cos(a) * Math.sin(phi) * r, y + Math.cos(phi) * r + 0.02, z + Math.sin(a) * Math.sin(phi) * r - 0.02);
        // Keep the face clear.
        if (curl.position.z > z + r * 0.55 && curl.position.y < y + r * 0.6) continue;
        g.add(curl);
      }
      break;
    }
    default:
      return null;
  }
  return g;
}

/** Beards that aren't the woodsman's sculpted one. */
export function builtFacialHair(kind: FacialHair, color: string, skin: string, head: HeadShape): THREE.Object3D | null {
  if (kind === "none" || kind === "beard") return null;
  const g = new THREE.Group();
  const mouthY = HEAD.eyeY - 0.17;
  const z = HEAD.faceZ + 0.02;
  if (kind === "stubble") {
    // A shadow along the lower jaw, hugging the head.
    const shade = new THREE.Color(skin).lerp(new THREE.Color(color), 0.4);
    const jaw = new THREE.Mesh(
      new THREE.SphereGeometry(head.r * 1.02, 20, 10, Math.PI * 0.2, Math.PI * 0.6, Math.PI * 0.62, Math.PI * 0.2),
      mat(`#${shade.getHexString()}`, { rough: 1 }),
    );
    jaw.position.set(head.x, head.y, head.z);
    g.add(jaw);
    return g;
  }
  const stache = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.16, 4, 8), hairMat(color));
  stache.rotation.z = Math.PI / 2;
  stache.position.set(0, mouthY + 0.05, z);
  stache.castShadow = true;
  g.add(stache);
  if (kind === "goatee") {
    const chin = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 8), hairMat(color));
    chin.rotation.x = Math.PI;
    chin.position.set(0, mouthY - 0.1, z - 0.03);
    g.add(chin);
  }
  return g;
}

/** Eyelashes: a little flick at each eye's outer corner. */
export function lashes(head: HeadShape): THREE.Object3D {
  const g = new THREE.Group();
  // Just under the brows, at the outer corners of the eyes, on the face's front.
  const y = head.y - 0.07;
  const z = head.z + head.rz * 0.86;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const lash = box(0.05, 0.014, 0.012, "#1d1d22");
      lash.position.set(side * (head.rx * 0.5 + i * 0.03), y + i * 0.012, z - i * 0.02);
      lash.rotation.z = side * (0.5 + i * 0.3);
      g.add(lash);
    }
  }
  return g;
}

/** Jewelry and finishing touches: head-bone pieces and chest-bone pieces. */
export function extraPieces(kind: Extra, color: string, width = 1): { head?: THREE.Object3D; chest?: THREE.Object3D; arm?: THREE.Object3D } {
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
        piece.position.set(side * 0.4, HEAD.eyeY - 0.1, -0.02);
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
      g.position.set(-0.3, HEAD.crownY - 0.12, 0.16);
      g.rotation.y = -0.6;
      return { head: g };
    }
    case "headband": {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.03, 6, 26, Math.PI), mat(color));
      band.rotation.y = Math.PI / 2;
      band.rotation.z = -0.3;
      band.position.set(0, HEAD.crownY - 0.18, 0.02);
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
