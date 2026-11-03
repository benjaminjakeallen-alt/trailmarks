import * as THREE from "three";
import { tone } from "@/lib/look";

/**
 * Props KayKit doesn't ship, built to match its look: chunky, slightly rounded,
 * flat-shaded, soft colors. Sizes are in stage units (a person is 1.7 tall).
 */

const mats = new Map<string, THREE.MeshStandardMaterial>();

/** A prop's color, calmed: no candy brights, blacks and whites kept. */
export const calmProp = (color: string) => tone(color, { maxS: 0.3, minL: 0.06, maxL: 0.9 });
export function mat(color: string, { emissive, rough = 0.78 }: { emissive?: string; rough?: number } = {}) {
  const key = `${color}|${emissive ?? ""}|${rough}`;
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      // The same calm, natural palette as the characters and the app.
      color: calmProp(color),
      roughness: rough,
      metalness: 0,
      flatShading: true,
      emissive: emissive ? tone(emissive, { maxS: 0.7, minL: 0.3, maxL: 0.95 }) : "#000000",
      emissiveIntensity: emissive ? 1.2 : 0,
    });
    mats.set(key, m);
  }
  return m;
}

function mesh(geo: THREE.BufferGeometry, color: string, opts?: { emissive?: string; rough?: number }) {
  const m = new THREE.Mesh(geo, mat(color, opts));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export const box = (w: number, h: number, d: number, color: string, opts?: { emissive?: string }) => {
  const m = mesh(new THREE.BoxGeometry(w, h, d), color, opts);
  m.position.y = h / 2;
  return m;
};
export const cyl = (rt: number, rb: number, h: number, color: string, seg = 10, opts?: { emissive?: string }) => {
  const m = mesh(new THREE.CylinderGeometry(rt, rb, h, seg), color, opts);
  m.position.y = h / 2;
  return m;
};
export const ball = (r: number, color: string, opts?: { emissive?: string; detail?: number }) =>
  mesh(new THREE.IcosahedronGeometry(r, opts?.detail ?? 1), color, opts);
const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number) => {
  o.position.set(x, y, z);
  return o;
};
const group = (...children: THREE.Object3D[]) => {
  const g = new THREE.Group();
  g.add(...children);
  return g;
};

/** A 44 oz fountain soda: a cup bigger than your head, lid, bendy straw. */
export function bigCup(color = "#e2483d") {
  const cup = mesh(new THREE.CylinderGeometry(0.17, 0.12, 0.42, 12), "#fbf7f0");
  cup.position.y = 0.21;
  const band = mesh(new THREE.CylinderGeometry(0.168, 0.15, 0.13, 12), color);
  band.position.y = 0.26;
  const lid = mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 12), "#f2f2f2");
  lid.position.y = 0.44;
  const straw = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 6), color);
  straw.position.set(0.04, 0.58, 0);
  straw.rotation.z = -0.15;
  return group(cup, band, lid, straw);
}

/** Folding lawn chair: aluminum frame, striped webbing. */
export function lawnChair(stripe = "#2f7fd6") {
  const g = new THREE.Group();
  const metal = "#c9d1d4";
  for (const x of [-0.27, 0.27]) {
    g.add(at(box(0.04, 0.04, 0.6, metal), x, 0.36, 0));
    g.add(at(box(0.04, 0.38, 0.04, metal), x, 0, 0.27));
    g.add(at(box(0.04, 0.38, 0.04, metal), x, 0, -0.27));
    const back = box(0.04, 0.62, 0.04, metal);
    back.position.set(x, 0.38, -0.28);
    back.rotation.x = -0.25;
    g.add(back);
  }
  for (let i = 0; i < 4; i++) {
    g.add(at(box(0.52, 0.025, 0.12, i % 2 ? "#fbf7f0" : stripe), 0, 0.38, -0.2 + i * 0.13));
    const s = box(0.52, 0.12, 0.025, i % 2 ? "#fbf7f0" : stripe);
    s.position.set(0, 0.45 + i * 0.13, -0.3 - i * 0.035);
    s.rotation.x = -0.25;
    g.add(s);
  }
  return g;
}

/** A campfire with flames that flicker (call flicker each frame). */
export function campfire() {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const log = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 7), "#7a4a2a");
    log.rotation.z = Math.PI / 2;
    log.rotation.y = (i / 5) * Math.PI;
    log.position.y = 0.06 + (i % 2) * 0.05;
    g.add(log);
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.add(at(ball(0.08, "#8c8f93"), Math.cos(a) * 0.38, 0.04, Math.sin(a) * 0.38));
  }
  const flames = new THREE.Group();
  const f1 = mesh(new THREE.ConeGeometry(0.2, 0.62, 7), "#ff6a2b", { emissive: "#ff4a10" });
  const f2 = mesh(new THREE.ConeGeometry(0.13, 0.44, 7), "#ffb02e", { emissive: "#ffa020" });
  const f3 = mesh(new THREE.ConeGeometry(0.07, 0.26, 6), "#fff1b8", { emissive: "#fff0a0" });
  for (const [f, y] of [[f1, 0.36], [f2, 0.3], [f3, 0.24]] as const) {
    f.position.y = y;
    f.castShadow = false;
    flames.add(f);
  }
  g.add(flames);
  const light = new THREE.PointLight("#ff9a3c", 2.2, 4, 1.6);
  light.position.y = 0.5;
  g.add(light);
  return {
    object: g,
    flicker(time: number) {
      flames.children.forEach((f, i) => {
        f.scale.set(1 + Math.sin(time * 11 + i) * 0.08, 1 + Math.sin(time * 9 + i * 2) * 0.16, 1 + Math.cos(time * 10 + i) * 0.08);
      });
      flames.rotation.y = time * 0.7;
      light.intensity = 2 + Math.sin(time * 13) * 0.35 + Math.sin(time * 7.3) * 0.25;
    },
  };
}

export function stickWithMarshmallow() {
  const stick = mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.8, 5), "#8a5a33");
  stick.rotation.x = Math.PI / 2;
  stick.position.z = 0.4;
  const mallow = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 8), "#fff8ec");
  mallow.rotation.x = Math.PI / 2;
  mallow.position.z = 0.82;
  return { object: group(stick, mallow), mallow };
}

/** Round mouse ears on a headband (a nod, not the logo). */
export function mouseEars(color = "#1d1d22") {
  const band = mesh(new THREE.TorusGeometry(0.2, 0.02, 5, 12, Math.PI), color);
  const l = at(mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 14), color), -0.17, 0.17, 0);
  const r = at(mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 14), color), 0.17, 0.17, 0);
  l.rotation.x = r.rotation.x = Math.PI / 2;
  const bow = at(ball(0.07, "#e2364a"), 0, 0.22, 0.02);
  bow.scale.set(1.6, 0.8, 0.6);
  return group(band, l, r, bow);
}

export function surfboard(color = "#f39a2b") {
  const board = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 14), color);
  board.scale.set(1, 1, 3.6);
  const stripe = mesh(new THREE.BoxGeometry(0.06, 0.055, 1.5), "#fbf7f0");
  stripe.position.y = 0.002;
  return group(board, stripe);
}

/** A patch of rolling sea; call roll each frame. */
export function waves(w = 5.2, d = 2.4) {
  const geo = new THREE.PlaneGeometry(w, d, 24, 12);
  geo.rotateX(-Math.PI / 2);
  const base = geo.attributes.position.array.slice();
  const sea = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: calmProp("#2bb6d6"), roughness: 0.35, flatShading: true, transparent: true, opacity: 0.94 }),
  );
  sea.receiveShadow = true;
  return {
    object: sea,
    roll(time: number) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = base[i * 3];
        const z = base[i * 3 + 2];
        p.setY(i, 0.08 + Math.sin(x * 2.2 + time * 2.4) * 0.07 + Math.sin(z * 3 - time * 1.7) * 0.04);
      }
      p.needsUpdate = true;
      geo.computeVertexNormals();
    },
  };
}

export function iceCream(flavor = "#f7c6d9") {
  const cone = mesh(new THREE.ConeGeometry(0.07, 0.22, 8), "#d79a52");
  cone.rotation.x = Math.PI;
  cone.position.y = 0.11;
  const s1 = at(ball(0.085, flavor), 0, 0.25, 0);
  const s2 = at(ball(0.075, "#fbf2df"), 0, 0.37, 0);
  return group(cone, s1, s2);
}

/** A cheerful roadside ice cream stand with a giant cone on the roof. */
export function iceCreamStand() {
  const g = new THREE.Group();
  g.add(box(1.4, 0.75, 0.6, "#fbf7f0"));
  for (let i = 0; i < 7; i++) g.add(at(box(0.2, 0.18, 0.66, i % 2 ? "#fbf7f0" : "#e45b8a"), -0.6 + i * 0.2, 0.75, 0));
  const big = iceCream("#f39ac0");
  big.scale.setScalar(2.4);
  big.position.set(0, 0.93, 0);
  g.add(big);
  return g;
}

export function slotMachine() {
  const g = new THREE.Group();
  g.add(box(0.62, 1.05, 0.5, "#c9312c"));
  g.add(at(box(0.66, 0.16, 0.54, "#f5c542"), 0, 1.05, 0));
  const screen = at(box(0.48, 0.24, 0.04, "#fff8dc", { emissive: "#fff2b0" }), 0, 0.62, 0.25);
  g.add(screen);
  const reels: THREE.Mesh[] = [];
  const symbols = ["#e2364a", "#f5c542", "#2fa8e0"];
  for (let i = 0; i < 3; i++) {
    const r = at(box(0.11, 0.14, 0.02, symbols[i], { emissive: symbols[i] }), -0.14 + i * 0.14, 0.67, 0.27);
    reels.push(r);
    g.add(r);
  }
  const lever = at(cyl(0.025, 0.025, 0.42, "#c9d1d4"), 0.36, 0.55, 0);
  const knob = at(ball(0.06, "#e2364a"), 0.36, 0.99, 0);
  g.add(lever, knob);
  const lights = at(box(0.66, 0.06, 0.54, "#fff6c8", { emissive: "#ffd34a" }), 0, 1.21, 0);
  g.add(lights);
  return {
    object: g,
    lever: group(lever, knob),
    spin(time: number, spinning: boolean, win: boolean) {
      reels.forEach((r, i) => {
        const c = symbols[Math.floor(time * 14 + i) % 3];
        if (spinning) r.material = mat(c, { emissive: c });
        else if (win) r.material = mat("#f5c542", { emissive: "#f5c542" });
      });
      (lights.material as THREE.MeshStandardMaterial).emissiveIntensity = win ? 1.5 + Math.sin(time * 18) : 0.8 + Math.sin(time * 3) * 0.3;
    },
  };
}

export function pokerChips(n = 4) {
  const g = new THREE.Group();
  const colors = ["#e2364a", "#2f6fde", "#1d1d22", "#fbf7f0"];
  for (let i = 0; i < n; i++) g.add(at(cyl(0.06, 0.06, 0.025, colors[i % 4], 12), 0, i * 0.026, 0));
  return g;
}

export function card() {
  const c = box(0.12, 0.004, 0.17, "#fbf7f0");
  c.add(at(box(0.05, 0.006, 0.05, "#e2364a"), 0, 0, 0));
  return c;
}

/** A flying saucer with a glass dome, blinking rim lights and a tractor beam. */
export function ufo() {
  const g = new THREE.Group();
  const hull = mesh(new THREE.SphereGeometry(0.9, 18, 8), "#c9d1d4", { rough: 0.35 });
  hull.scale.set(1, 0.24, 1);
  const dome = at(mesh(new THREE.SphereGeometry(0.42, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), "#9be7f0", { rough: 0.1 }), 0, 0.1, 0);
  (dome.material as THREE.MeshStandardMaterial).transparent = true;
  (dome.material as THREE.MeshStandardMaterial).opacity = 0.75;
  const alien = at(ball(0.16, "#7ed957"), 0, 0.22, 0);
  const eyeL = at(ball(0.045, "#111"), -0.06, 0.26, 0.13);
  const eyeR = at(ball(0.045, "#111"), 0.06, 0.26, 0.13);
  g.add(hull, dome, alien, eyeL, eyeR);
  const lights: THREE.Mesh[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const l = at(ball(0.06, "#ffe14a", { emissive: "#ffd000" }), Math.cos(a) * 0.82, -0.02, Math.sin(a) * 0.82);
    lights.push(l);
    g.add(l);
  }
  const beamMat = new THREE.MeshBasicMaterial({ color: "#c8ffb0", transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.75, 1, 18, 1, true), beamMat);
  beam.position.y = -0.5;
  g.add(beam);
  return {
    object: g,
    beam,
    setBeam(height: number, opacity: number) {
      beam.scale.y = Math.max(0.01, height);
      beam.position.y = -height / 2 - 0.1;
      beamMat.opacity = opacity;
    },
    blink(time: number) {
      lights.forEach((l, i) => {
        (l.material as THREE.MeshStandardMaterial).emissiveIntensity = Math.floor(time * 6 + i) % 3 === 0 ? 2.4 : 0.5;
      });
      g.rotation.y = time * 1.4;
    },
  };
}

export function shovel() {
  const handle = at(cyl(0.02, 0.02, 0.9, "#9b6a3c", 6), 0, -0.1, 0);
  const blade = at(box(0.18, 0.22, 0.03, "#9aa4a8"), 0, -0.3, 0);
  handle.rotation.x = Math.PI / 2;
  blade.rotation.x = Math.PI / 2;
  blade.position.set(0, 0, 0.55);
  handle.position.set(0, 0, 0.1);
  return group(handle, blade);
}

export function dirtMound() {
  const m = ball(0.42, "#8a5a3a");
  m.scale.set(1, 0.32, 1);
  return m;
}

/** A baked potato in foil, split and steaming, with a pat of butter. */
export function bakedPotato() {
  const foil = ball(0.16, "#cfd6da");
  foil.scale.set(1.3, 0.55, 0.9);
  const inside = at(ball(0.12, "#f3e3a6"), 0, 0.05, 0);
  inside.scale.set(1.1, 0.4, 0.6);
  const butter = at(box(0.07, 0.04, 0.07, "#ffe46b"), 0, 0.06, 0);
  return group(foil, inside, butter);
}

export function smoker() {
  const g = new THREE.Group();
  const barrel = at(mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.1, 14), "#2b2b30", { rough: 0.6 }), 0, 0.75, 0);
  barrel.rotation.z = Math.PI / 2;
  const fire = at(box(0.4, 0.4, 0.4, "#2b2b30"), -0.68, 0.55, 0);
  const chimney = at(cyl(0.07, 0.07, 0.75, "#2b2b30"), -0.68, 0.75, 0);
  const glow = at(box(0.2, 0.08, 0.02, "#ff8a2b", { emissive: "#ff5a10" }), -0.68, 0.62, 0.21);
  g.add(barrel, fire, chimney, glow);
  for (const [x, z] of [[-0.4, -0.25], [0.4, -0.25], [-0.4, 0.25], [0.4, 0.25]]) g.add(at(cyl(0.03, 0.03, 0.45, "#45454a", 5), x, 0, z));
  return { object: g, chimneyTop: new THREE.Vector3(-0.68, 1.55, 0) };
}

export function palmTree() {
  const g = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const seg = at(cyl(0.1 - i * 0.006, 0.12 - i * 0.006, 0.32, "#a6784a", 7), Math.sin(i * 0.3) * 0.18, i * 0.3, 0);
    g.add(seg);
  }
  const top = new THREE.Vector3(Math.sin(2.1) * 0.18, 2.1, 0);
  for (let i = 0; i < 7; i++) {
    const leaf = mesh(new THREE.ConeGeometry(0.16, 1.1, 4), i % 2 ? "#2f9e44" : "#3bb54a");
    leaf.position.copy(top);
    leaf.rotation.set(0, (i / 7) * Math.PI * 2, 0);
    leaf.rotateX(1.25);
    leaf.translateY(0.5);
    g.add(leaf);
  }
  for (let i = 0; i < 3; i++) g.add(at(ball(0.09, "#6b4a2a"), top.x + Math.cos(i * 2) * 0.1, top.y - 0.08, Math.sin(i * 2) * 0.1));
  return g;
}

/** A whole New York pie, one slice missing. */
export function pizza() {
  const g = new THREE.Group();
  const crust = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 20, 1, false, 0, Math.PI * 1.75), "#e0a85a");
  const cheese = at(mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.02, 20, 1, false, 0, Math.PI * 1.75), "#ffd86b"), 0, 0.03, 0);
  g.add(crust, cheese);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 1.7 + 0.1;
    const r = 0.15 + (i % 3) * 0.1;
    g.add(at(cyl(0.05, 0.05, 0.02, "#c9312c", 8), Math.sin(a) * r, 0.03, Math.cos(a) * r));
  }
  g.position.y = 0.025;
  return g;
}

export function pizzaSlice() {
  const g = new THREE.Group();
  const crust = mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.03, 8, 1, false, 0, Math.PI / 4), "#e0a85a");
  const cheese = at(mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.015, 8, 1, false, 0, Math.PI / 4), "#ffd86b"), 0, 0.02, 0);
  const pep = at(cyl(0.035, 0.035, 0.012, "#c9312c", 8), 0.06, 0.03, 0.16);
  g.add(crust, cheese, pep);
  g.rotation.set(-Math.PI / 2, 0, Math.PI);
  return group(g);
}

/** A little country stage with footlights and a spotlight. */
export function countryStage() {
  const g = new THREE.Group();
  g.add(at(box(2.6, 0.32, 1.1, "#9c6a3c"), 0, 0, 0));
  for (let i = 0; i < 6; i++) g.add(at(box(0.36, 0.005, 1.1, i % 2 ? "#8a5a33" : "#a8744a"), -1.08 + i * 0.43, 0.32, 0));
  for (let i = 0; i < 5; i++) g.add(at(ball(0.07, "#fff2b0", { emissive: "#ffd34a" }), -1 + i * 0.5, 0.36, 0.5));
  const back = at(box(2.6, 1.4, 0.08, "#c0392b"), 0, 0.32, -0.55);
  g.add(back);
  for (let i = 0; i < 7; i++) {
    const star = at(ball(0.06, "#ffe58a", { emissive: "#ffd34a", detail: 0 }), -1.1 + i * 0.37, 1.45 + (i % 2) * 0.1, -0.5);
    g.add(star);
  }
  return g;
}

export function micStand() {
  const pole = cyl(0.015, 0.015, 1.25, "#2b2b30", 6);
  const base = cyl(0.12, 0.12, 0.03, "#2b2b30", 10);
  const mic = at(ball(0.05, "#b9c1c4"), 0, 1.28, 0.02);
  return group(pole, base, mic);
}

export function guitar(color = "#d4883a") {
  const body = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 12), color);
  body.rotation.x = Math.PI / 2;
  const body2 = at(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 12), color), 0, 0.18, 0);
  body2.rotation.x = Math.PI / 2;
  const neck = at(box(0.05, 0.5, 0.03, "#6b4a2a"), 0, 0.22, 0.01);
  const hole = at(cyl(0.05, 0.05, 0.065, "#3a2a1a", 10), 0, 0.05, 0);
  hole.rotation.x = Math.PI / 2;
  return group(body, body2, neck, hole);
}

export function goalPost() {
  const y = "#f5c542";
  const g = new THREE.Group();
  g.add(cyl(0.05, 0.05, 1, y, 6));
  g.add(at(box(1.5, 0.08, 0.08, y), 0, 0.96, 0));
  g.add(at(cyl(0.04, 0.04, 1.3, y, 6), -0.72, 1, 0));
  g.add(at(cyl(0.04, 0.04, 1.3, y, 6), 0.72, 1, 0));
  return g;
}

export function football() {
  const b = ball(0.1, "#8a4a24", { detail: 1 });
  b.scale.set(1, 0.65, 0.65);
  b.add(at(box(0.07, 0.01, 0.12, "#fbf7f0"), 0, 0.09, 0));
  return b;
}

/** A pickup truck you can stand in the back of. */
export function pickup(color = "#2f5fae") {
  const g = new THREE.Group();
  const body = at(box(1.0, 0.36, 2.3, color), 0, 0.28, 0);
  const cab = at(box(0.92, 0.42, 0.85, color), 0, 0.64, 0.45);
  const glass = at(box(0.86, 0.26, 0.04, "#bfe6f2"), 0, 0.76, 0.88);
  const rear = at(box(0.86, 0.26, 0.04, "#bfe6f2"), 0, 0.76, 0.02);
  const bed = at(box(0.86, 0.04, 1.15, "#3a3f45"), 0, 0.6, -0.55);
  const grill = at(box(0.8, 0.18, 0.04, "#c9d1d4"), 0, 0.38, 1.16);
  const lightL = at(box(0.12, 0.08, 0.04, "#fff6c8", { emissive: "#fff2b0" }), -0.36, 0.48, 1.16);
  const lightR = at(box(0.12, 0.08, 0.04, "#fff6c8", { emissive: "#fff2b0" }), 0.36, 0.48, 1.16);
  g.add(body, cab, glass, rear, bed, grill, lightL, lightR);
  const wheels: THREE.Mesh[] = [];
  for (const [x, z] of [[-0.5, 0.72], [0.5, 0.72], [-0.5, -0.72], [0.5, -0.72]]) {
    const w = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 12), "#1d1d22");
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.2, z);
    wheels.push(w);
    g.add(w);
  }
  return { object: g, wheels, bedTop: 0.62 };
}

export function trumpet() {
  const tube = cyl(0.02, 0.02, 0.36, "#e9b52a", 6);
  tube.rotation.x = Math.PI / 2;
  tube.position.set(0, 0, 0.18);
  const bell = at(mesh(new THREE.ConeGeometry(0.08, 0.12, 10, 1, true), "#f5c542"), 0, 0, 0.4);
  bell.rotation.x = -Math.PI / 2;
  return group(tube, bell);
}

export function saxophone() {
  const body = cyl(0.04, 0.05, 0.5, "#e9b52a", 8);
  body.position.y = -0.25;
  const bell = at(mesh(new THREE.ConeGeometry(0.09, 0.14, 10, 1, true), "#f5c542"), 0.05, -0.48, 0.04);
  bell.rotation.z = -0.6;
  return group(body, bell);
}

export function streetLamp() {
  const pole = cyl(0.04, 0.05, 1.9, "#2b3438", 8);
  const arm = at(box(0.3, 0.04, 0.04, "#2b3438"), 0.12, 1.88, 0);
  const lamp = at(ball(0.11, "#fff2b0", { emissive: "#ffd970" }), 0.26, 1.82, 0);
  const light = new THREE.PointLight("#ffd27a", 1.6, 3.5, 1.5);
  light.position.set(0.26, 1.7, 0);
  return group(pole, arm, lamp, light);
}

export function peachTree() {
  const g = new THREE.Group();
  g.add(cyl(0.09, 0.13, 0.9, "#7a5232", 7));
  const peaches: THREE.Mesh[] = [];
  const blobs: [number, number, number, number][] = [[0, 1.25, 0, 0.55], [-0.38, 1.05, 0.1, 0.38], [0.4, 1.08, -0.05, 0.4], [0.05, 1.5, -0.1, 0.38]];
  for (const [x, y, z, r] of blobs) g.add(at(ball(r, "#4caf50"), x, y, z));
  for (let i = 0; i < 9; i++) {
    const a = i * 2.1;
    const p = at(ball(0.085, "#ffad6b"), Math.cos(a) * 0.52, 1.0 + (i % 3) * 0.2, Math.sin(a) * 0.4 + 0.2);
    peaches.push(p);
    g.add(p);
  }
  return { object: g, peaches };
}

export function peach() {
  const p = ball(0.085, "#ffad6b");
  p.add(at(ball(0.03, "#4caf50", { detail: 0 }), 0, 0.08, 0));
  return p;
}

/** A cliff dwelling: stacked sandstone rooms with dark doorways and ladders. */
export function cliffDwelling() {
  const g = new THREE.Group();
  const stone = ["#d9a066", "#c98d55", "#e3b07a"];
  g.add(at(box(3.2, 0.7, 1.3, "#b97a4a"), 0, 0, -0.7));
  const rooms: [number, number, number, number, number][] = [
    [-1, 0.7, -0.7, 0.9, 0.6], [0.05, 0.7, -0.8, 0.9, 0.75], [1.05, 0.7, -0.7, 0.8, 0.55],
    [-0.45, 1.45, -0.95, 0.9, 0.55], [0.6, 1.3, -0.95, 0.7, 0.5],
  ];
  rooms.forEach(([x, y, z, w, h], i) => {
    g.add(at(box(w, h, 0.7, stone[i % 3]), x, y, z));
    g.add(at(box(0.18, 0.26, 0.02, "#3a2416"), x, y + 0.04, z + 0.36));
  });
  for (const x of [-0.4, 0.75]) {
    const ladder = new THREE.Group();
    ladder.add(at(cyl(0.02, 0.02, 1.05, "#8a5a33", 5), -0.1, 0, 0), at(cyl(0.02, 0.02, 1.05, "#8a5a33", 5), 0.1, 0, 0));
    for (let r = 0; r < 5; r++) ladder.add(at(box(0.2, 0.025, 0.025, "#8a5a33"), 0, 0.12 + r * 0.2, 0));
    ladder.position.set(x, 0, 0.02);
    ladder.rotation.x = -0.18;
    g.add(ladder);
  }
  return g;
}

/** A small pine or round shade tree for filling corners. */
export function tree(kind: "pine" | "round" = "round", color = "#4caf50") {
  if (kind === "pine") {
    const g = group(cyl(0.06, 0.08, 0.3, "#7a5232", 6));
    for (let i = 0; i < 3; i++) g.add(at(mesh(new THREE.ConeGeometry(0.42 - i * 0.1, 0.55, 8), color), 0, 0.5 + i * 0.3, 0));
    return g;
  }
  return group(cyl(0.06, 0.09, 0.5, "#7a5232", 6), at(ball(0.4, color), 0, 0.75, 0));
}

/** Little tufts of grass and flowers to make the slab feel like ground. */
export function tufts(n: number, radius: number, colors = ["#5cb85c", "#7ac36a"]) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const a = i * 2.39996;
    const r = radius * Math.sqrt((i + 0.5) / n);
    const t = mesh(new THREE.ConeGeometry(0.05, 0.14, 4), colors[i % colors.length]);
    t.position.set(Math.cos(a) * r, 0.07, Math.sin(a) * r);
    t.castShadow = false;
    g.add(t);
  }
  return g;
}

/** A music note (♪) that floats up from a player. */
export function note(color = "#1d1d22") {
  const head = ball(0.06, color, { detail: 0 });
  head.scale.set(1.2, 0.85, 0.6);
  const stem = at(box(0.018, 0.22, 0.018, color), 0.06, 0, 0);
  const flag = at(box(0.08, 0.03, 0.018, color), 0.1, 0.2, 0);
  return group(head, stem, flag);
}

/** A saguaro: tall ribbed trunk, two arms reaching up, a pink bloom on top. */
export function saguaro(color = "#3e9e5a") {
  const g = new THREE.Group();
  const trunk = cyl(0.14, 0.16, 1.3, color, 8);
  const cap = at(ball(0.14, color), 0, 1.3, 0);
  cap.scale.y = 0.8;
  g.add(trunk, cap);
  for (const side of [-1, 1]) {
    const h = side < 0 ? 0.5 : 0.7;
    const out = at(cyl(0.08, 0.08, 0.26, color, 7), side * 0.2, h, 0);
    out.rotation.z = (side * Math.PI) / 2;
    out.position.y = h + 0.04;
    const up = at(cyl(0.085, 0.09, 0.42, color, 7), side * 0.32, h, 0);
    const tip = at(ball(0.085, color), side * 0.32, h + 0.42, 0);
    g.add(out, up, tip);
  }
  g.add(at(ball(0.06, "#ff7aa8", { detail: 0 }), 0, 1.43, 0));
  return g;
}

/**
 * Delicate Arch: one continuous piece of sandstone swept up the slender,
 * pinched left leg, over a heavy lintel and down the broad right leg; banded
 * in Entrada sandstone colors, lumpy like weathered rock, standing on a pale
 * slickrock bowl with the snowy La Sal Mountains behind.
 */
export function delicateArch() {
  const g = new THREE.Group();

  // The arch's centerline: left foot, up, over, down to the right foot.
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.78, -0.1, 0),
    new THREE.Vector3(-0.8, 0.55, 0),
    new THREE.Vector3(-0.74, 1.25, 0.02),
    new THREE.Vector3(-0.55, 1.85, 0),
    new THREE.Vector3(-0.1, 2.12, 0),
    new THREE.Vector3(0.38, 2.02, 0),
    new THREE.Vector3(0.7, 1.6, 0),
    new THREE.Vector3(0.82, 0.9, 0),
    new THREE.Vector3(0.84, -0.1, 0),
  ]);
  // How thick it is along the way (half-width across, half-depth front to back):
  // a thin "waist" low on the left leg, a heavy top, a fat right leg.
  // Its signature: a slender left leg pinched to a narrow "waist" near the
  // bottom, a heavy lintel, and a broad, blocky right leg.
  const waist = (t: number) => 1 - 0.62 * Math.exp(-(((t - 0.12) / 0.07) ** 2));
  const left = (t: number) => 0.72 + 0.28 * THREE.MathUtils.smoothstep(t, 0.15, 0.4);
  const width = (t: number) => {
    const top = 1 + 0.6 * Math.exp(-(((t - 0.48) / 0.14) ** 2));
    const right = 1 + 0.95 * THREE.MathUtils.smoothstep(t, 0.58, 0.95);
    return 0.2 * waist(t) * left(t) * top * right;
  };
  const depth = (t: number) =>
    (0.24 + 0.1 * Math.exp(-(((t - 0.5) / 0.2) ** 2)) + 0.1 * THREE.MathUtils.smoothstep(t, 0.65, 1)) * (0.55 + 0.45 * waist(t));

  const SEG = 64;
  const RING = 12;
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  // Entrada sandstone in sun: pale salmon at the foot, glowing orange, rust at the top.
  const bands = [new THREE.Color("#f3c39b"), new THREE.Color("#ec9058"), new THREE.Color("#e07a43"), new THREE.Color("#d46a37")];
  const tmp = new THREE.Color();
  const noise = (a: number, b: number) => Math.sin(a * 12.9 + b * 4.1) * 0.5 + Math.sin(a * 5.3 - b * 7.7) * 0.5;
  for (let i = 0; i <= SEG; i++) {
    const t = i / SEG;
    const p = path.getPointAt(t);
    const tan = path.getTangentAt(t);
    // Across the arch (in its plane) and front-to-back.
    const across = new THREE.Vector3(-tan.y, tan.x, 0).normalize();
    const front = new THREE.Vector3(0, 0, 1);
    for (let j = 0; j < RING; j++) {
      const a = (j / RING) * Math.PI * 2;
      const bump = 1 + 0.12 * noise(t * 9, j);
      const v = p
        .clone()
        .addScaledVector(across, Math.cos(a) * width(t) * bump)
        .addScaledVector(front, Math.sin(a) * depth(t) * bump);
      pos.push(v.x, v.y, v.z);
      // Bands by height: pale at the foot, rich orange, darker rust on top.
      const h = THREE.MathUtils.clamp(v.y / 2.2, 0, 1);
      const k = h * (bands.length - 1);
      const lo = Math.floor(k);
      tmp.lerpColors(bands[lo], bands[Math.min(bands.length - 1, lo + 1)], k - lo);
      tmp.offsetHSL(0, 0, 0.03 * noise(v.y * 6, j));
      col.push(tmp.r, tmp.g, tmp.b);
    }
  }
  for (let i = 0; i < SEG; i++) {
    for (let j = 0; j < RING; j++) {
      const a = i * RING + j;
      const b = i * RING + ((j + 1) % RING);
      const c = (i + 1) * RING + j;
      const d = (i + 1) * RING + ((j + 1) % RING);
      idx.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  // The rock's bands, calmed like every other color on stage.
  for (let i = 0; i < col.length; i += 3) {
    const l = 0.299 * col[i] + 0.587 * col[i + 1] + 0.114 * col[i + 2];
    for (let c = 0; c < 3; c++) col[i + c] = l + (col[i + c] - l) * 0.62;
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // A little warm glow, so the shaded side still reads as sunlit orange rock.
  const rock = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true, emissive: "#5a3420", emissiveIntensity: 0.4 }),
  );
  rock.castShadow = true;
  rock.receiveShadow = true;
  g.add(rock);

  // A cap of slightly darker rock on top of the span, like the real one's lip.
  const cap = ball(0.34, "#c9653a");
  cap.scale.set(1.5, 0.45, 1.0);
  cap.position.set(-0.15, 2.28, 0);
  g.add(cap);

  // Slickrock: a pale, smooth sandstone bowl it stands on, with rounded humps.
  const slick = "#e2b48d";
  const base = ball(1.6, slick, { detail: 2 });
  base.scale.set(1.05, 0.12, 0.62);
  base.position.y = -0.06;
  g.add(base);
  for (const [x, z, r] of [[-1.35, 0.3, 0.45], [1.4, 0.25, 0.4], [0.2, -0.55, 0.35]] as const) {
    const hump = ball(r, "#d9a77f", { detail: 2 });
    hump.scale.y = 0.4;
    hump.position.set(x, 0.02, z);
    g.add(hump);
  }

  // The La Sal Mountains, far behind and snow-capped.
  const range = new THREE.Group();
  for (const [x, h, r] of [[-1.7, 0.85, 0.6], [-0.9, 1.15, 0.7], [0.1, 0.95, 0.62], [1.1, 1.05, 0.66], [1.9, 0.8, 0.55]] as const) {
    // Far off: hazy blue-grey, so they sit behind the arch instead of beside it.
    const peak = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), mat("#a9b8cc"));
    peak.position.set(x, h / 2, 0);
    const snow = new THREE.Mesh(new THREE.ConeGeometry(r * 0.38, h * 0.38, 7), mat("#f4f7fb"));
    snow.position.set(x, h - h * 0.19, 0.01);
    range.add(peak, snow);
  }
  range.position.set(0, 0, -0.95);
  range.scale.setScalar(0.62);
  g.add(range);
  return g;
}
