import * as THREE from "three";
import { tone, type Headwear } from "@/lib/look";

/**
 * Hats that look like the hats they're named after: smooth curved crowns and
 * brims, with the details that make each one read at a glance (a cowboy hat's
 * pinched crown and curled brim, a cap's panels and bill, a beanie's knit ribs
 * and pompom).
 *
 * Each is built on a standard head with its opening at y = 0: the band goes
 * round at radius 0.4 and the head's dome rises about 0.28 above it. The face
 * is toward +z. fitHat (fit.ts) moves and sizes it onto the real head.
 */

const R = 0.4;

// ---------------------------------------------------------------- materials and shapes

const mats = new Map<string, THREE.MeshStandardMaterial>();
export function mat(color: string, rough = 0.8, opts: { metal?: number; emissive?: string; map?: THREE.Texture } = {}) {
  const key = `${color}|${rough}|${opts.metal ?? 0}|${opts.emissive ?? ""}|${opts.map?.uuid ?? ""}`;
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      // Textured ones skip the actor's color calming, so calm them here.
      color: opts.map ? tone(color, { maxS: 0.5, minL: 0.1, maxL: 0.92 }) : color,
      roughness: rough,
      metalness: opts.metal ?? 0,
      emissive: opts.emissive ?? "#000000",
      emissiveIntensity: opts.emissive ? 1 : 0,
      map: opts.map ?? null,
      side: THREE.DoubleSide,
    });
    mats.set(key, m);
  }
  return m;
}

export function mesh(geo: THREE.BufferGeometry, m: THREE.Material) {
  const x = new THREE.Mesh(geo, m);
  x.castShadow = true;
  return x;
}

/** A surface of revolution round y: points are [radius, height]. */
export function lathe(pts: [number, number][], segs = 48) {
  return new THREE.LatheGeometry(
    pts.map(([r, y]) => new THREE.Vector2(r, y)),
    segs,
  );
}

/** Move every vertex: f gets the position and its angle round y (0 at +z) and distance from the axis. */
export function bend(geo: THREE.BufferGeometry, f: (v: THREE.Vector3, a: number, d: number) => void) {
  const pos = geo.getAttribute("position");
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    f(v, Math.atan2(v.x, v.z), Math.hypot(v.x, v.z));
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** A flat ring brim, thin and with a rounded edge, from radius r0 out to r1. */
function brim(r0: number, r1: number, t = 0.022) {
  return lathe([
    [r0, t / 2],
    [r1 - t / 2, t / 2],
    [r1, 0],
    [r1 - t / 2, -t / 2],
    [r0, -t / 2],
  ], 64);
}

/** A tube along points, tapering from r0 to r1 (horns, cords, tails). */
export function tube(points: THREE.Vector3[], r0: number, r1: number, m: THREE.Material, closed = false) {
  // Centripetal: the curve stays between its points instead of overshooting at tight bends.
  const curve = new THREE.CatmullRomCurve3(points, closed, "centripetal");
  const segs = 32;
  const radial = 12;
  const geo = new THREE.TubeGeometry(curve, segs, 1, radial, closed);
  const pos = geo.getAttribute("position");
  const v = new THREE.Vector3();
  for (let j = 0; j <= segs; j++) {
    const c = curve.getPointAt(Math.min(1, j / segs));
    const r = r0 + (r1 - r0) * (j / segs);
    for (let k = 0; k <= radial; k++) {
      const i = j * (radial + 1) + k;
      v.fromBufferAttribute(pos, i).sub(c).multiplyScalar(r).add(c);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  return mesh(geo, m);
}

export function ball(r: number, m: THREE.Material, seg = 20) {
  return mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), m);
}

/** A curved bill (a cap's or captain's visor), sticking out the front. */
function bill(width: number, reach: number, m: THREE.Material, droop = 0.1) {
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, width, reach, 0, Math.PI, false, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.018, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, curveSegments: 32 });
  geo.rotateX(Math.PI / 2);
  bend(geo, (v) => {
    // Curved down at the sides, and dipping toward its edge.
    v.y -= 0.12 * (v.x / width) ** 2 * (0.4 + v.z / reach);
    v.y -= droop * (v.z / reach) ** 2;
  });
  return mesh(geo, m);
}

// ---------------------------------------------------------------- textures

const textures = new Map<string, THREE.CanvasTexture>();
export function canvasTexture(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat: [number, number] = [1, 1]) {
  let t = textures.get(key);
  if (!t) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d")!);
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
    textures.set(key, t);
  }
  return t;
}

/** Knit ribs: soft vertical stripes (grayscale; the material's color tints them). */
export const knit = (count: number) =>
  canvasTexture(`knit${count}`, 256, 16, (g) => {
    for (let x = 0; x < 256; x++) {
      const k = 0.78 + 0.22 * Math.cos((x / 256) * Math.PI * 2 * count) ** 2;
      g.fillStyle = `rgb(${255 * k},${255 * k},${255 * k})`;
      g.fillRect(x, 0, 1, 16);
    }
  });

/** Party-hat stripes, spiraling round the cone. */
const partyStripes = () => canvasTexture("party", 256, 256, (g) => {
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#c9c4bb";
  for (let i = -4; i < 8; i++) {
    g.beginPath();
    g.moveTo(i * 64, 0);
    g.lineTo(i * 64 + 32, 0);
    g.lineTo(i * 64 + 32 + 256, 256);
    g.lineTo(i * 64 + 256, 256);
    g.fill();
  }
});

/** Bandana polka dots (white dots on a light ground the color tints). */
const dots = () => canvasTexture(
  "dots",
  128,
  128,
  (g) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = "#3a3a3a";
    g.globalCompositeOperation = "source-over";
    for (const [x, y] of [[32, 32], [96, 96], [96, 32], [32, 96]] as const) {
      g.beginPath();
      g.arc(x, y, (x + y) % 64 === 0 ? 9 : 0, 0, Math.PI * 2);
      g.fill();
    }
  },
  [10, 5],
);

// ---------------------------------------------------------------- the hats

/** How a hat fits: its opening's radius, whether it perches or covers the hair, its inside height, and how far above the brow band it sits. */
type Fit = { r: number; perch?: boolean; cover?: boolean; crown?: number; lift?: number };

/** A headband arc from ear to ear over the crown, for ears, horns and bows to sit on. */
function headband(m: THREE.Material, thick = 0.028) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = (i / 16) * Math.PI;
    pts.push(new THREE.Vector3(Math.cos(t) * (R + 0.015), -0.08 + Math.sin(t) * 0.38, 0));
  }
  const band = tube(pts, thick, thick, m);
  band.rotation.x = -0.18;
  return band;
}

/** Where a point on that headband is (t from 0 at the right ear to π at the left). */
function onBand(t: number, lift = 0) {
  const p = new THREE.Vector3(Math.cos(t) * (R + 0.015 + lift), -0.08 + Math.sin(t) * (0.38 + lift), 0);
  return p.applyAxisAngle(new THREE.Vector3(1, 0, 0), -0.18);
}

/** A peaked cap (a ship's captain's, a police officer's): flat-topped crown, band, glossy visor, cord and badge. */
function peakedCap(g: THREE.Group, top: string, bandColor: string, metal: string): Fit {
  const crown = mesh(lathe([[0.395, 0.08], [0.43, 0.17], [0.47, 0.23], [0.465, 0.255], [0.4, 0.265], [0, 0.265]]), mat(top, 0.6));
  const band = mesh(lathe([[0.405, -0.005], [0.41, 0.095]]), mat(bandColor, 0.7));
  const visor = bill(0.28, 0.24, mat("#15171a", 0.25), 0.0);
  visor.position.set(0, 0.03, 0.3);
  visor.rotation.x = -0.32;
  const shine = mat(metal, 0.35, { metal: 0.6 });
  const cord = tube(
    Array.from({ length: 9 }, (_, i) => {
      const a = -0.9 + (i / 8) * 1.8;
      return new THREE.Vector3(Math.sin(a) * 0.418, 0.035, Math.cos(a) * 0.418);
    }),
    0.01,
    0.01,
    shine,
  );
  const badge = new THREE.Group();
  const disc = ball(0.04, shine);
  disc.scale.z = 0.4;
  badge.add(disc);
  for (const s of [-1, 1]) {
    const leaf = ball(0.035, shine);
    leaf.scale.set(1.6, 0.6, 0.3);
    leaf.position.set(s * 0.055, -0.01, 0);
    leaf.rotation.z = s * 0.4;
    badge.add(leaf);
  }
  badge.position.set(0, 0.1, 0.43);
  g.add(crown, band, visor, cord, badge);
  return { r: R, crown: 0.27 };
}

/** Hats only the scenes use (not in the wardrobe): a police cap, a cheesehead. */
export function sceneHat(kind: "police" | "cheese" | "mouse", band: number, opts: { bow?: boolean } = {}): THREE.Object3D {
  const body = new THREE.Group();
  let fit: Fit;
  if (kind === "mouse") {
    // Theme-park mouse ears: a black headband with two big round ears, and maybe a polka-dot bow.
    const black = mat("#1d1d22", 0.55);
    body.add(headband(black, 0.03));
    for (const s of [-1, 1]) {
      const ear = mesh(new THREE.SphereGeometry(0.17, 40, 24), black);
      ear.scale.set(1, 1, 0.26);
      ear.position.copy(onBand(Math.PI / 2 + s * 0.62, 0.13));
      ear.rotation.z = -s * 0.25;
      body.add(ear);
    }
    if (opts.bow) {
      const red = mat("#b33a45", 0.5, { map: dots() });
      const bow = new THREE.Group();
      for (const s of [-1, 1]) {
        const loop = mesh(new THREE.SphereGeometry(0.1, 24, 16), red);
        loop.scale.set(1.2, 0.8, 0.45);
        loop.position.x = s * 0.1;
        loop.rotation.z = s * 0.3;
        bow.add(loop);
      }
      const knot = ball(0.05, red, 16);
      knot.scale.z = 0.7;
      bow.add(knot);
      bow.position.copy(onBand(Math.PI / 2, 0.06));
      bow.position.z += 0.05;
      bow.rotation.x = -0.2;
      body.add(bow);
    }
    fit = { r: R, crown: 0.3 };
  } else if (kind === "police") {
    fit = peakedCap(body, "#2f3f5a", "#1d2333", "#c9a24a");
  } else {
    // A foam cheese wedge, tall at the front and sloping to the back, soft-edged, with holes pressed in.
    const side = new THREE.Shape();
    side.moveTo(-0.3, 0);
    side.lineTo(-0.3, 0.36);
    side.lineTo(0.5, 0.02);
    side.lineTo(0.5, 0);
    side.closePath();
    const geo = new THREE.ExtrudeGeometry(side, { depth: 0.9, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 4 });
    geo.translate(0, 0, -0.45);
    geo.rotateY(Math.PI / 2);
    const wedge = mesh(geo, mat("#e3b64a", 0.75));
    body.add(wedge);
    const hole = mat("#b8892c", 0.85);
    const topY = (z: number) => 0.02 + (0.34 * (z + 0.5)) / 0.8 + 0.035;
    for (const [x, z, r] of [[0.15, 0.1, 0.06], [-0.2, -0.05, 0.05], [0.02, -0.25, 0.045], [0.3, -0.2, 0.04], [-0.32, 0.18, 0.04]] as const) {
      const h = ball(r, hole, 16);
      h.scale.y = 0.3;
      h.position.set(x, topY(z), z);
      h.rotation.x = 0.4;
      body.add(h);
    }
    for (const [x, y, r] of [[0.2, 0.2, 0.05], [-0.22, 0.12, 0.045], [-0.02, 0.27, 0.035]] as const) {
      const h = ball(r, hole, 16);
      h.scale.z = 0.3;
      h.position.set(x, y, 0.34);
      body.add(h);
    }
    fit = { r: R, crown: 0.24 };
  }
  const g = new THREE.Group();
  g.add(body);
  g.position.y = band;
  g.userData.fit = { cover: true, ...fit };
  return g;
}

const BUILDERS: Record<Exclude<Headwear, "none">, (g: THREE.Group, color: string) => Fit> = {
  cap(g, color) {
    // Six-panel crown with seams, a button on top, and a curved bill.
    const m = mat(color, 0.75);
    const seam = mat(new THREE.Color(color).multiplyScalar(0.7).getStyle(), 0.8);
    const crown = mesh(new THREE.SphereGeometry(0.415, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), m);
    crown.scale.y = 0.74;
    g.add(crown);
    const seams = new THREE.Group();
    seams.scale.y = 0.74;
    for (let i = 0; i < 6; i++) {
      const s = mesh(new THREE.TorusGeometry(0.417, 0.006, 4, 32, Math.PI / 2), seam);
      s.rotation.y = (i / 6) * Math.PI * 2 + Math.PI / 6;
      seams.add(s);
    }
    g.add(seams);
    const button = ball(0.035, m);
    button.position.y = 0.31;
    const b = bill(0.3, 0.36, mat(new THREE.Color(color).multiplyScalar(0.82).getStyle(), 0.75), 0.06);
    b.position.set(0, 0.06, 0.24);
    b.rotation.x = -0.22;
    g.add(button, b);
    g.rotation.x = -0.1;
    return { r: R, crown: 0.29 };
  },

  beanie(g, color) {
    // Ribbed knit dome, a fat folded cuff, and a fluffy pompom.
    const dome = mesh(lathe([[0.41, 0], [0.41, 0.09], [0.395, 0.18], [0.35, 0.27], [0.27, 0.34], [0.15, 0.38], [0, 0.39]]), mat(color, 0.95, { map: knit(26) }));
    const cuff = mesh(lathe([[0.4, -0.03], [0.43, -0.02], [0.44, 0.06], [0.435, 0.12], [0.41, 0.135]]), mat(color, 0.95, { map: knit(40) }));
    const fluff = new THREE.IcosahedronGeometry(0.11, 3);
    bend(fluff, (v) => v.multiplyScalar(1 + (Math.sin(v.x * 90) * Math.sin(v.y * 80) * Math.sin(v.z * 70)) * 0.12));
    const pom = mesh(fluff, mat("#f3eee5", 1));
    pom.position.y = 0.46;
    g.add(dome, cuff, pom);
    return { r: R, crown: 0.3 };
  },

  bow(g, color) {
    // A big ribbon bow clipped on one side of the head.
    const m = mat(color, 0.55);
    const bow = new THREE.Group();
    for (const s of [-1, 1]) {
      const loop = mesh(new THREE.TorusGeometry(0.085, 0.032, 10, 24), m);
      loop.scale.set(1.3, 0.85, 0.55);
      loop.position.x = s * 0.1;
      loop.rotation.z = s * 0.15;
      const tail = tube([new THREE.Vector3(s * 0.02, -0.02, 0), new THREE.Vector3(s * 0.06, -0.1, 0.01), new THREE.Vector3(s * 0.07, -0.17, 0)], 0.03, 0.022, m);
      tail.scale.z = 0.4;
      bow.add(loop, tail);
    }
    const knot = ball(0.045, m);
    knot.scale.set(1, 1.1, 0.75);
    bow.add(knot);
    bow.position.set(0.28, 0.24, 0.1);
    bow.rotation.set(0, 0.9, -0.55);
    g.add(bow);
    return { r: R, cover: false };
  },

  safari(g) {
    // A pith helmet: tall rounded crown, sloping brim, a band and a vented top.
    const khaki = mat("#d6bf8f", 0.85);
    const shell = mesh(lathe([[0.6, -0.08], [0.585, -0.065], [0.43, 0.01], [0.415, 0.05], [0.41, 0.13], [0.385, 0.25], [0.31, 0.35], [0.18, 0.415], [0, 0.435]], 64), khaki);
    shell.scale.z = 1.1;
    const band = mesh(lathe([[0.418, 0.02], [0.418, 0.085]]), mat("#7a5a3a", 0.8));
    band.scale.z = 1.1;
    const vent = mesh(lathe([[0.07, 0], [0.07, 0.025], [0.04, 0.05], [0, 0.055]]), khaki);
    vent.position.y = 0.42;
    g.add(shell, band, vent);
    return { r: R, crown: 0.32 };
  },

  fedora(g) {
    // Pinched front, a crease down the crown, a dark band, the brim snapped down in front.
    const felt = mat("#7a5434", 0.85);
    const crown = mesh(
      bend(lathe([[0.405, 0], [0.39, 0.14], [0.35, 0.24], [0.26, 0.29], [0.1, 0.275], [0, 0.26]]), (v) => {
        if (v.y > 0.08 && v.z > 0) v.x *= 1 - 0.22 * (v.z / 0.4) * ((v.y - 0.08) / 0.21);
        v.y -= 0.05 * Math.exp(-((v.x / 0.07) ** 2)) * Math.max(0, (v.y - 0.15) / 0.14);
      }),
      felt,
    );
    crown.scale.z = 0.92;
    const band = mesh(lathe([[0.41, 0.005], [0.405, 0.075]]), mat("#2a1f18", 0.6));
    band.scale.z = 0.92;
    const rim = mesh(
      bend(brim(0.39, 0.62), (v, _a, d) => {
        const out = Math.max(0, d - 0.4) / 0.22;
        v.y += out * (v.z > 0 ? -0.07 * (v.z / d) ** 2 : 0.06 * (v.z / d) ** 2) + out * 0.04 * (v.x / d) ** 2;
      }),
      felt,
    );
    rim.scale.z = 0.95;
    g.add(crown, band, rim);
    return { r: R, crown: 0.28 };
  },

  ranger(g) {
    // A campaign hat: flat stiff brim, a tall crown with four dents to a peak.
    const tan = mat("#b38c5c", 0.85);
    const crown = mesh(
      bend(lathe([[0.405, 0], [0.38, 0.16], [0.3, 0.31], [0.16, 0.42], [0, 0.47]]), (v, a, d) => {
        if (d < 1e-4) return;
        const dent = Math.max(0, Math.cos(4 * a)) ** 2 * Math.min(1, v.y / 0.4);
        const k = 1 - 0.28 * dent;
        v.x *= k;
        v.z *= k;
      }),
      tan,
    );
    const band = mesh(lathe([[0.41, 0.005], [0.405, 0.06]]), mat("#4f3624", 0.6));
    const rim = mesh(brim(0.39, 0.66, 0.026), tan);
    g.add(crown, band, rim);
    return { r: R, crown: 0.3 };
  },

  bucket(g, color) {
    // A soft round crown with rows of stitching, the brim sloping down all round.
    const m = mat(color, 0.9);
    const stitch = mat(new THREE.Color(color).multiplyScalar(0.72).getStyle(), 0.9);
    const crown = mesh(lathe([[0.405, 0], [0.4, 0.17], [0.37, 0.26], [0.28, 0.295], [0, 0.3]]), m);
    const rim = mesh(lathe([[0.4, 0.012], [0.55, -0.075], [0.555, -0.088], [0.545, -0.092], [0.4, -0.01]], 64), m);
    g.add(crown, rim);
    for (const [r, y] of [[0.406, 0.05], [0.403, 0.1], [0.45, -0.02], [0.5, -0.05]] as const) {
      const s = mesh(new THREE.TorusGeometry(r, 0.004, 4, 64), stitch);
      s.rotation.x = Math.PI / 2;
      s.position.y = y;
      g.add(s);
    }
    return { r: R, crown: 0.3, lift: 0.07 };
  },

  bandana(g, color) {
    // A polka-dot bandana tied tight over the head, knotted at the back with two tails.
    const m = mat(color, 0.8, { map: dots() });
    const wrap = mesh(new THREE.SphereGeometry(0.415, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.56), m);
    wrap.scale.y = 0.74;
    wrap.rotation.x = -0.22;
    const knot = ball(0.06, mat(color, 0.8));
    knot.position.set(0, 0.0, -0.4);
    knot.scale.set(1.2, 0.9, 0.8);
    g.add(wrap, knot);
    for (const s of [-1, 1]) {
      const tail = tube([new THREE.Vector3(s * 0.03, 0, -0.42), new THREE.Vector3(s * 0.08, -0.08, -0.45), new THREE.Vector3(s * 0.11, -0.19, -0.44)], 0.04, 0.025, mat(color, 0.8));
      tail.scale.z = 0.45;
      g.add(tail);
    }
    return { r: R, crown: 0.28 };
  },

  headlamp(g) {
    // An elastic strap round the head and over the top, and a lamp on the forehead.
    const strap = mat("#2e3236", 0.9);
    const ring = mesh(new THREE.TorusGeometry(0.415, 0.024, 8, 64), strap);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.06;
    ring.scale.set(1, 1, 3);
    const top = headband(strap, 0.02);
    top.rotation.set(0, Math.PI / 2, 0);
    const housing = mesh(new THREE.CapsuleGeometry(0.065, 0.06, 6, 16), mat("#a5483c", 0.5));
    housing.rotation.z = Math.PI / 2;
    housing.position.set(0, 0.07, 0.44);
    housing.scale.z = 0.8;
    const lens = mesh(new THREE.CircleGeometry(0.05, 24), mat("#fff6c8", 0.2, { emissive: "#fff2b0" }));
    lens.position.set(0, 0.07, 0.495);
    const glow = new THREE.PointLight("#fff2b0", 0.8, 1.5, 2);
    glow.position.set(0, 0.07, 0.65);
    g.add(ring, top, housing, lens, glow);
    return { r: R, crown: 0.3 };
  },

  captain(g) {
    // A white flat-topped crown, navy band, glossy black visor, gold cord and badge.
    return peakedCap(g, "#f3f0ea", "#232c44", "#c9a24a");
  },

  cowboy(g, color) {
    // A pinched, creased crown, a dark band, and a wide brim curled up at the sides.
    const felt = mat(color, 0.85);
    const crown = mesh(
      bend(lathe([[0.405, 0], [0.39, 0.16], [0.35, 0.28], [0.25, 0.33], [0.1, 0.31], [0, 0.29]]), (v) => {
        if (v.y > 0.1 && v.z > 0) v.x *= 1 - 0.24 * (v.z / 0.4) * ((v.y - 0.1) / 0.23);
        v.y -= 0.06 * Math.exp(-((v.x / 0.08) ** 2)) * Math.max(0, (v.y - 0.18) / 0.15);
      }),
      felt,
    );
    crown.scale.z = 0.88;
    const band = mesh(lathe([[0.41, 0.005], [0.405, 0.06]]), mat("#3a2416", 0.6));
    band.scale.z = 0.88;
    const rim = mesh(
      bend(brim(0.39, 0.7, 0.024), (v, _a, d) => {
        const out = Math.max(0, d - 0.4) / 0.3;
        const side = (v.x / d) ** 2;
        v.y += out * out * (0.26 * side - 0.05 * (1 - side));
      }),
      felt,
    );
    rim.scale.z = 0.9;
    g.add(crown, band, rim);
    g.rotation.x = -0.05;
    return { r: R, crown: 0.3 };
  },

  party(g, color) {
    // A striped cone with a pompom on top and an elastic under the chin.
    const cone = mesh(new THREE.ConeGeometry(0.25, 0.62, 40, 1, true), mat(color, 0.6, { map: partyStripes() }));
    cone.position.y = 0.31;
    const pom = mesh(new THREE.IcosahedronGeometry(0.075, 2), mat("#f0c34a", 1));
    pom.position.y = 0.64;
    g.add(cone, pom);
    g.rotation.z = -0.22;
    return { r: 0.25, perch: true };
  },

  propeller(g) {
    // A four-panel beanie with a little visor, and a propeller that spins.
    const panels = ["#a5483c", "#c2a052", "#46658a", "#6d7b48"];
    for (let i = 0; i < 4; i++) {
      const w = mesh(new THREE.SphereGeometry(0.41, 16, 16, (i * Math.PI) / 2, Math.PI / 2, 0, Math.PI / 2), mat(panels[i], 0.7));
      w.scale.y = 0.76;
      g.add(w);
    }
    const visor = bill(0.24, 0.2, mat("#8a3a32", 0.7), 0.02);
    visor.position.set(0, 0.06, 0.28);
    visor.rotation.x = -0.28;
    const stem = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.1, 8), mat("#c9d1d4", 0.3, { metal: 0.5 }));
    stem.position.y = 0.35;
    const prop = new THREE.Group();
    for (const s of [-1, 1]) {
      const blade = mesh(new THREE.CapsuleGeometry(0.035, 0.16, 4, 12), mat(s < 0 ? "#a5483c" : "#46658a", 0.5));
      blade.rotation.z = Math.PI / 2;
      blade.scale.set(1, 1, 0.3);
      blade.position.x = s * 0.12;
      blade.rotation.x = s * 0.3;
      prop.add(blade);
    }
    prop.add(ball(0.028, mat("#c2a052", 0.4)));
    prop.position.y = 0.41;
    prop.userData.spin = 14;
    g.add(visor, stem, prop);
    return { r: R, crown: 0.31 };
  },

  crown(g) {
    // A gold crown: a band with five points tipped with pearls, gems all round, a velvet cap.
    const gold = mat("#d4a93f", 0.3, { metal: 0.85 });
    const band = mesh(lathe([[0.27, 0], [0.275, 0.015], [0.275, 0.1], [0.27, 0.11]], 48), gold);
    g.add(band);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const point = mesh(new THREE.ConeGeometry(0.06, 0.15, 4), gold);
      point.position.set(Math.sin(a) * 0.265, 0.17, Math.cos(a) * 0.265);
      point.rotation.y = a + Math.PI / 4;
      const pearl = ball(0.026, mat("#f3efe6", 0.25));
      pearl.position.set(Math.sin(a) * 0.265, 0.26, Math.cos(a) * 0.265);
      const gem = ball(0.03, mat(i % 2 ? "#a5323c" : "#2f5a8a", 0.15), 12);
      gem.position.set(Math.sin(a + 0.63) * 0.28, 0.055, Math.cos(a + 0.63) * 0.28);
      gem.scale.set(1, 1, 0.6);
      gem.lookAt(gem.position.clone().multiplyScalar(2));
      g.add(point, pearl, gem);
    }
    const velvet = mesh(new THREE.SphereGeometry(0.262, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat("#7a2a34", 0.9));
    velvet.scale.y = 0.5;
    velvet.position.y = 0.05;
    g.add(velvet);
    g.rotation.z = 0.1;
    return { r: 0.27, perch: true };
  },

  tophat(g) {
    // A tall, slightly flared crown, a band, and a narrow brim curled up at the sides.
    const silk = mat("#1d1d22", 0.4);
    const crown = mesh(lathe([[0.32, 0], [0.31, 0.25], [0.33, 0.5], [0.335, 0.52], [0.3, 0.53], [0, 0.53]]), silk);
    const band = mesh(lathe([[0.323, 0.015], [0.32, 0.1]]), mat("#7a2a34", 0.6));
    const rim = mesh(
      bend(brim(0.3, 0.5, 0.02), (v, _a, d) => {
        const out = Math.max(0, d - 0.32) / 0.18;
        v.y += out * out * 0.09 * (v.x / d) ** 2;
      }),
      silk,
    );
    g.add(crown, band, rim);
    g.rotation.z = -0.06;
    return { r: 0.32, crown: 0.28 };
  },

  pirate(g) {
    // A tricorn: the brim folded up into three sides, gold trim, and a skull and crossbones.
    const felt = mat("#22252b", 0.85);
    const gold = mat("#c9a24a", 0.4, { metal: 0.5 });
    const crown = mesh(lathe([[0.405, 0], [0.39, 0.15], [0.31, 0.25], [0, 0.29]]), felt);
    // Corners point front and to the back left and right; the sides between fold up.
    const fold = (a: number) => (Math.cos(3 * a) + 1) / 2;
    const lift = (a: number, d: number) => {
      const out = Math.max(0, d - 0.4) / 0.24;
      return { y: out * 0.3 * (1 - fold(a)), d: d - out * 0.1 * (1 - fold(a)) };
    };
    const rim = mesh(
      bend(brim(0.39, 0.64, 0.024), (v, a, d) => {
        const l = lift(a, d);
        v.y += l.y;
        v.x *= l.d / d;
        v.z *= l.d / d;
      }),
      felt,
    );
    const edge: THREE.Vector3[] = [];
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      const l = lift(a, 0.64);
      edge.push(new THREE.Vector3(Math.sin(a) * l.d, l.y, Math.cos(a) * l.d));
    }
    const trim = tube(edge, 0.013, 0.013, gold, true);
    const emblem = new THREE.Group();
    const bone = mat("#efe9dd", 0.6);
    const skull = ball(0.045, bone);
    skull.scale.set(1, 0.95, 0.5);
    emblem.add(skull);
    for (const s of [-1, 1]) {
      const b = mesh(new THREE.CapsuleGeometry(0.01, 0.12, 4, 8), bone);
      b.rotation.z = s * 0.8;
      b.position.z = -0.006;
      emblem.add(b);
      const eye = ball(0.011, felt, 8);
      eye.position.set(s * 0.016, 0.006, 0.022);
      emblem.add(eye);
    }
    emblem.position.set(0, 0.13, 0.4);
    emblem.rotation.x = -0.3;
    g.add(crown, rim, trim, emblem);
    g.rotation.x = -0.24;
    return { r: R, crown: 0.29, lift: 0.07 };
  },

  chef(g) {
    // A tall pleated toque: a band, and a puffed top gathered into pleats.
    const white = mat("#f6f4ef", 0.85);
    const band = mesh(lathe([[0.405, 0], [0.405, 0.13]]), white);
    const top = mesh(
      bend(lathe([[0.405, 0.12], [0.46, 0.26], [0.5, 0.42], [0.48, 0.55], [0.36, 0.63], [0.18, 0.66], [0, 0.665]]), (v, a, d) => {
        if (d < 1e-4) return;
        const k = 1 + 0.045 * Math.sin(14 * a) * Math.min(1, (v.y - 0.12) / 0.2);
        v.x *= k;
        v.z *= k;
      }),
      white,
    );
    g.add(band, top);
    return { r: R, crown: 0.3 };
  },

  viking(g) {
    // A steel dome with a ridge and rivets, a leather rim, and two curved horns.
    const steel = mat("#a3abae", 0.35, { metal: 0.75 });
    const dome = mesh(lathe([[0.41, 0], [0.4, 0.12], [0.345, 0.26], [0.2, 0.345], [0, 0.365]]), steel);
    const rim = mesh(lathe([[0.425, -0.01], [0.43, 0.02], [0.425, 0.06], [0.41, 0.065]]), mat("#6b4b33", 0.75));
    const ridge = mesh(new THREE.TorusGeometry(0.4, 0.018, 6, 48, Math.PI), steel);
    ridge.rotation.y = Math.PI / 2;
    ridge.scale.y = 0.9;
    g.add(dome, rim, ridge);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const rivet = ball(0.014, steel, 8);
      rivet.position.set(Math.sin(a) * 0.43, 0.025, Math.cos(a) * 0.43);
      g.add(rivet);
    }
    const ivory = mat("#ece3cf", 0.55);
    for (const s of [-1, 1]) {
      g.add(
        tube(
          [new THREE.Vector3(s * 0.36, 0.14, 0), new THREE.Vector3(s * 0.5, 0.22, 0.02), new THREE.Vector3(s * 0.56, 0.4, 0.05), new THREE.Vector3(s * 0.5, 0.58, 0.08)],
          0.075,
          0.008,
          ivory,
        ),
      );
    }
    return { r: R, crown: 0.31 };
  },

  unicorn(g) {
    // A pastel headband with a spiral golden horn, two little ears and a flower.
    const band = headband(mat("#d9a5b8", 0.6));
    const gold = mat("#f0d48a", 0.35, { metal: 0.3 });
    const horn = new THREE.Group();
    const cone = mesh(new THREE.ConeGeometry(0.085, 0.46, 24), gold);
    cone.position.y = 0.23;
    const spiral: THREE.Vector3[] = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const r = 0.085 * (1 - t) + 0.004;
      spiral.push(new THREE.Vector3(Math.cos(t * Math.PI * 8) * r, t * 0.45, Math.sin(t * Math.PI * 8) * r));
    }
    horn.add(cone, tube(spiral, 0.012, 0.004, gold));
    horn.position.copy(onBand(Math.PI / 2, -0.01));
    horn.position.z += 0.1;
    horn.rotation.x = 0.4;
    g.add(band, horn);
    for (const s of [-1, 1]) {
      const ear = mesh(new THREE.ConeGeometry(0.06, 0.15, 12), mat("#f3eee5", 0.8));
      ear.position.copy(onBand(Math.PI / 2 + s * 0.6, 0.02));
      ear.rotation.z = -s * 0.5;
      ear.scale.z = 0.5;
      g.add(ear);
    }
    const flower = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const p = ball(0.03, mat("#c48aa5", 0.7), 10);
      const a = (i / 5) * Math.PI * 2;
      p.position.set(Math.cos(a) * 0.03, Math.sin(a) * 0.03, 0);
      p.scale.z = 0.5;
      flower.add(p);
    }
    flower.add(ball(0.018, mat("#e7c46a", 0.6), 10));
    flower.position.copy(onBand(Math.PI * 0.32, 0.02));
    flower.position.z += 0.04;
    g.add(flower);
    return { r: R, crown: 0.3 };
  },

  catears(g, color) {
    // A headband with two pointed cat ears, pink inside.
    g.add(headband(mat(color, 0.6)));
    for (const s of [-1, 1]) {
      const ear = new THREE.Group();
      const outer = new THREE.Shape();
      outer.moveTo(-0.13, 0);
      outer.quadraticCurveTo(-0.09, 0.15, 0, 0.24);
      outer.quadraticCurveTo(0.09, 0.15, 0.13, 0);
      outer.closePath();
      const geo = new THREE.ExtrudeGeometry(outer, { depth: 0.03, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, curveSegments: 12 });
      geo.translate(0, 0, -0.015);
      ear.add(mesh(geo, mat(color, 0.8)));
      const inner = mesh(new THREE.ShapeGeometry(outer, 12), mat("#e8a9b4", 0.8));
      inner.scale.set(0.62, 0.62, 1);
      inner.position.set(0, 0.02, 0.03);
      ear.add(inner);
      ear.position.copy(onBand(Math.PI / 2 + s * 0.6, -0.03));
      ear.rotation.z = s * 0.55;
      g.add(ear);
    }
    return { r: R, crown: 0.3 };
  },

  bunny(g) {
    // A headband with two long bunny ears, one flopped over.
    const fur = mat("#f3eee5", 0.9);
    const pink = mat("#e8a9b4", 0.8);
    g.add(headband(fur));
    for (const s of [-1, 1]) {
      const ear = new THREE.Group();
      const outer = mesh(new THREE.CapsuleGeometry(0.06, 0.32, 8, 16), fur);
      outer.scale.z = 0.45;
      outer.position.y = 0.2;
      const inner = mesh(new THREE.CapsuleGeometry(0.035, 0.26, 8, 16), pink);
      inner.scale.z = 0.3;
      inner.position.set(0, 0.2, 0.02);
      const upper = new THREE.Group();
      upper.add(outer, inner);
      ear.add(upper);
      if (s > 0) {
        // The flopped ear bends forward halfway up.
        upper.position.y = -0.0;
        upper.rotation.x = 0.25;
        const tip = new THREE.Group();
        upper.scale.y = 0.55;
        const tipOuter = mesh(new THREE.CapsuleGeometry(0.06, 0.16, 8, 16), fur);
        tipOuter.scale.z = 0.45;
        tipOuter.position.y = 0.1;
        const tipInner = mesh(new THREE.CapsuleGeometry(0.035, 0.12, 8, 16), pink);
        tipInner.scale.z = 0.3;
        tipInner.position.set(0, 0.1, 0.02);
        tip.add(tipOuter, tipInner);
        tip.position.set(0, 0.24, 0.05);
        tip.rotation.x = 1.6;
        ear.add(tip);
      }
      ear.position.copy(onBand(Math.PI / 2 + s * 0.38));
      ear.rotation.z = -s * 0.18;
      g.add(ear);
    }
    return { r: R, crown: 0.3 };
  },

  flowers(g) {
    // A flower crown: a leafy vine round the head with blossoms all along it.
    const green = mat("#5d7a4a", 0.8);
    const vine: THREE.Vector3[] = [];
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      vine.push(new THREE.Vector3(Math.sin(a) * 0.42, 0.06 + Math.sin(a * 5) * 0.01, Math.cos(a) * 0.42));
    }
    const ring = tube(vine, 0.016, 0.016, green, true);
    g.add(ring);
    const colors = ["#d98a9e", "#e7c46a", "#f3eee5", "#a48ac4", "#e09a6a"];
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2;
      const at = new THREE.Vector3(Math.sin(a) * 0.43, 0.07, Math.cos(a) * 0.43);
      const flower = new THREE.Group();
      for (let j = 0; j < 5; j++) {
        const p = ball(0.035, mat(colors[i % colors.length], 0.7), 10);
        const b = (j / 5) * Math.PI * 2;
        p.position.set(Math.cos(b) * 0.035, Math.sin(b) * 0.035, 0);
        p.scale.z = 0.45;
        flower.add(p);
      }
      flower.add(ball(0.02, mat("#c2873a", 0.6), 10));
      flower.position.copy(at);
      flower.lookAt(at.clone().multiplyScalar(2));
      const leaf = ball(0.03, green, 8);
      leaf.scale.set(1.6, 0.5, 0.3);
      leaf.position.set(Math.sin(a + 0.25) * 0.43, 0.04, Math.cos(a + 0.25) * 0.43);
      leaf.rotation.y = a;
      g.add(flower, leaf);
    }
    g.rotation.x = -0.12;
    return { r: R, cover: false };
  },

  santa(g) {
    // A floppy red cone drooping to the back, a thick white fur trim and a pompom.
    const red = mat("#b33a35", 0.9);
    const cone = mesh(
      bend(lathe([[0.405, 0], [0.37, 0.14], [0.28, 0.29], [0.17, 0.42], [0.08, 0.52], [0, 0.56]]), (v) => {
        const t = Math.max(0, (v.y - 0.18) / 0.38);
        v.x += t * t * 0.34;
        v.z -= t * t * 0.18;
        v.y -= t * t * 0.22;
      }),
      red,
    );
    const fur = mat("#f6f3ee", 1);
    const trim = mesh(new THREE.TorusGeometry(0.42, 0.065, 12, 48), fur);
    trim.rotation.x = Math.PI / 2;
    trim.position.y = 0.03;
    const pom = mesh(new THREE.IcosahedronGeometry(0.075, 3), fur);
    pom.position.set(0.34, 0.34, -0.18);
    g.add(cone, trim, pom);
    return { r: R, crown: 0.3 };
  },
};

/**
 * A hat by name, built on the standard head with its opening at `band` (the
 * head's band height in the head bone's space) and the fitting info fitHat uses.
 */
export function buildHat(kind: Headwear, color: string, band: number): THREE.Object3D | null {
  if (kind === "none") return null;
  const body = new THREE.Group();
  const fit = BUILDERS[kind](body, color);
  // The lift moves the hat itself up off the brows; the opening stays the fitting point.
  body.position.y = fit.lift ?? 0;
  const g = new THREE.Group();
  g.add(body);
  g.position.y = band;
  g.userData.fit = { cover: true, ...fit };
  return g;
}
