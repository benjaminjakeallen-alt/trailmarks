import * as THREE from "three";
import { ball, box, cyl, mat } from "@/components/stage3d/props";
import type { Gear, Glasses, Headwear } from "@/lib/look";
import type { HeadFit } from "@/components/stage3d/fit";

/**
 * Glasses and headwear for the characters, sized in stage units for a 1.55-tall
 * person and placed in the head bone's space (its origin is at the neck; the
 * big chibi head sits above it). Glasses are built on the measured head; hats
 * are made on one standard head and fitted to the real one (fitHat).
 */

/** The standard head hats are made on (fitHat moves them onto the real one). */
const HEAD = { crownY: 0.56 } as const;

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

export function headwear(kind: Headwear, color: string): THREE.Object3D | null {
  if (kind === "none") return null;
  const g = new THREE.Group();
  if (kind === "cap") {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(color));
    dome.scale.set(1.05, 0.78, 1.05);
    dome.castShadow = true;
    const visor = cyl(0.22, 0.22, 0.03, color, 14);
    visor.scale.z = 0.8;
    visor.position.set(0, 0.0, 0.32);
    const button = ball(0.04, color);
    button.position.y = 0.28;
    g.add(dome, visor, button);
    g.position.y = HEAD.crownY - 0.1;
  } else if (kind === "beanie") {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.37, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(color));
    dome.scale.set(1.03, 0.85, 1.03);
    dome.castShadow = true;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.06, 6, 20), mat(color));
    rim.rotation.x = Math.PI / 2;
    const pom = ball(0.1, "#fbf7f0");
    pom.position.y = 0.34;
    g.add(dome, rim, pom);
    g.position.y = HEAD.crownY - 0.08;
  } else if (kind === "bow") {
    for (const side of [-1, 1]) {
      const loop = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.2, 8), mat(color));
      loop.rotation.z = (side * Math.PI) / 2;
      loop.position.x = side * 0.1;
      loop.castShadow = true;
      g.add(loop);
    }
    g.add(ball(0.06, color));
    g.position.set(0.22, HEAD.crownY - 0.06, 0.05);
    g.rotation.z = -0.35;
  } else if (kind === "safari") {
    // A pith helmet: rounded dome, wide sloped brim, a band.
    const khaki = "#d9c08f";
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 9, 0, Math.PI * 2, 0, Math.PI / 2), mat(khaki));
    dome.scale.set(1.0, 0.95, 1.08);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.52, 0.06, 20), mat(khaki));
    const band = cyl(0.385, 0.385, 0.06, "#7a5232", 18);
    band.position.y = 0.0;
    const top = ball(0.04, khaki);
    top.position.y = 0.37;
    g.add(dome, brim, band, top);
    g.position.y = HEAD.crownY - 0.1;
  } else if (kind === "fedora") {
    // The explorer's fedora: pinched crown, dark band, slightly turned-down brim.
    const felt = "#8a5a33";
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.46, 0.035, 18), mat(felt));
    brim.scale.z = 0.92;
    const crown = cyl(0.25, 0.28, 0.25, felt, 12);
    crown.position.y = 0.13;
    const dent = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.42), mat("#7a4e2b"));
    dent.position.y = 0.27;
    const band = cyl(0.285, 0.285, 0.06, "#2b1d14", 12);
    band.position.y = 0.06;
    g.add(brim, crown, dent, band);
    g.position.y = HEAD.crownY - 0.08;
    g.rotation.z = -0.08;
  } else if (kind === "ranger") {
    // A park ranger's campaign hat: flat wide brim, four-dent peaked crown.
    const tan = "#b98e57";
    const brim = cyl(0.5, 0.5, 0.03, tan, 22);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.29, 0.34, 4), mat(tan));
    crown.rotation.y = Math.PI / 4;
    crown.position.y = 0.19;
    const band = cyl(0.27, 0.27, 0.05, "#5b3a22", 12);
    band.position.y = 0.04;
    g.add(brim, crown, band);
    g.position.y = HEAD.crownY - 0.06;
  } else if (kind === "bucket") {
    const crown = cyl(0.3, 0.33, 0.24, color, 14);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.47, 0.1, 18, 1, true), mat(color, { rough: 0.9 }));
    brim.material.side = THREE.DoubleSide;
    brim.position.y = -0.02;
    g.add(crown, brim);
    g.position.y = HEAD.crownY - 0.12;
  } else if (kind === "bandana") {
    const wrap = new THREE.Mesh(new THREE.SphereGeometry(0.385, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), mat(color));
    wrap.scale.set(1.02, 0.7, 1.04);
    const knot = ball(0.07, color);
    knot.position.set(0, 0.04, -0.38);
    const tailL = box(0.06, 0.18, 0.03, color);
    tailL.position.set(-0.05, -0.17, -0.38);
    tailL.rotation.z = 0.3;
    const tailR = box(0.06, 0.16, 0.03, color);
    tailR.position.set(0.05, -0.15, -0.38);
    tailR.rotation.z = -0.35;
    g.add(wrap, knot, tailL, tailR);
    g.position.y = HEAD.crownY - 0.14;
  } else if (kind === "headlamp") {
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.03, 6, 24), mat("#2b2b30"));
    strap.rotation.x = Math.PI / 2;
    const lamp = cyl(0.07, 0.08, 0.07, "#e2483d", 12);
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(0, 0, 0.4);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.05, 14), mat("#fff6c8", { emissive: "#fff2b0" }));
    lens.position.set(0, 0, 0.44);
    const glow = new THREE.PointLight("#fff2b0", 0.8, 1.5, 2);
    glow.position.set(0, 0, 0.6);
    g.add(strap, lamp, lens, glow);
    g.position.y = HEAD.crownY - 0.05;
  } else if (kind === "captain") {
    const top = cyl(0.36, 0.3, 0.16, "#fbf7f0", 16);
    const band = cyl(0.31, 0.31, 0.06, "#1f2d4d", 16);
    const visor = cyl(0.22, 0.22, 0.03, "#1d1d22", 14);
    visor.scale.z = 0.7;
    visor.position.set(0, -0.01, 0.3);
    const badge = ball(0.045, "#f5c542");
    badge.position.set(0, 0.08, 0.34);
    g.add(top, band, visor, badge);
    g.position.y = HEAD.crownY - 0.06;
  } else if (kind === "party") {
    // A striped cone with a pom-pom and an elastic, tipped at a jaunty angle.
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 16), mat(color));
    cone.position.y = 0.25;
    g.add(cone);
    for (let i = 0; i < 3; i++) {
      const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.17 - i * 0.055, 0.018, 4, 16), mat("#fbf7f0"));
      stripe.rotation.x = Math.PI / 2;
      stripe.position.y = 0.08 + i * 0.13;
      g.add(stripe);
    }
    const pom = ball(0.07, "#f5c542", { detail: 2 });
    pom.position.y = 0.52;
    g.add(pom);
    g.position.set(0.06, HEAD.crownY - 0.04, 0);
    g.rotation.z = -0.25;
  } else if (kind === "propeller") {
    // A beanie with a propeller that spins (the actor turns anything tagged `spin`).
    const panels = ["#e2483d", "#f5c542", "#2f7fd6", "#3bb54a"];
    for (let i = 0; i < 4; i++) {
      const wedge = new THREE.Mesh(
        new THREE.SphereGeometry(0.37, 8, 8, (i * Math.PI) / 2, Math.PI / 2, 0, Math.PI / 2),
        mat(panels[i]),
      );
      wedge.scale.y = 0.8;
      g.add(wedge);
    }
    const visor = cyl(0.2, 0.2, 0.025, "#e2483d", 14);
    visor.scale.z = 0.7;
    visor.position.set(0, 0.0, 0.3);
    const stem = cyl(0.015, 0.015, 0.1, "#c9d1d4", 6);
    stem.position.y = 0.29;
    const prop = new THREE.Group();
    for (const side of [-1, 1]) {
      const blade = box(0.22, 0.012, 0.06, side < 0 ? "#e2483d" : "#2f7fd6");
      blade.position.x = side * 0.11;
      blade.rotation.x = side * 0.25;
      prop.add(blade);
    }
    prop.add(ball(0.025, "#f5c542"));
    prop.position.y = 0.4;
    prop.userData.spin = 14;
    g.add(visor, stem, prop);
    g.position.y = HEAD.crownY - 0.1;
  } else if (kind === "crown") {
    const gold = "#f5c542";
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.14, 20, 1, true), mat(gold, { rough: 0.35 }));
    ring.material.side = THREE.DoubleSide;
    g.add(ring);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const point = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.13, 4), mat(gold, { rough: 0.35 }));
      point.position.set(Math.cos(a) * 0.26, 0.13, Math.sin(a) * 0.26);
      const gem = ball(0.03, i % 2 ? "#e2364a" : "#2f7fd6", { detail: 0 });
      gem.position.set(Math.cos(a) * 0.275, 0.0, Math.sin(a) * 0.275);
      g.add(point, gem);
    }
    g.position.y = HEAD.crownY - 0.02;
    g.rotation.z = 0.12;
  } else if (kind === "tophat") {
    const brim = cyl(0.38, 0.38, 0.03, "#1d1d22", 20);
    const tall = cyl(0.24, 0.26, 0.5, "#1d1d22", 16);
    const band = cyl(0.262, 0.262, 0.07, "#c0392b", 16);
    band.position.y = 0.05;
    g.add(brim, tall, band);
    g.position.y = HEAD.crownY - 0.06;
    g.rotation.z = -0.1;
  } else if (kind === "pirate") {
    // A tricorn: three folded-up sides and a little skull.
    const felt = "#22252b";
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.33, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(felt));
    crown.scale.y = 0.7;
    g.add(crown);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
      const flap = box(0.5, 0.18, 0.04, felt);
      flap.position.set(Math.cos(a) * 0.3, 0.0, Math.sin(a) * 0.3);
      flap.rotation.y = -a + Math.PI / 2;
      flap.rotateX(-0.35);
      g.add(flap);
    }
    const skull = ball(0.05, "#fbf7f0", { detail: 1 });
    skull.position.set(0, 0.1, 0.34);
    const trim = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.012, 4, 30), mat("#f5c542"));
    trim.rotation.x = Math.PI / 2;
    trim.position.y = 0.14;
    g.add(skull, trim);
    g.position.y = HEAD.crownY - 0.01;
  } else if (kind === "chef") {
    const band = cyl(0.3, 0.3, 0.16, "#fbf7f0", 18);
    g.add(band);
    for (const [x, z, r] of [[0, 0, 0.26], [-0.16, 0.05, 0.2], [0.16, 0.05, 0.2], [0, -0.14, 0.2], [0, 0.15, 0.18]] as const) {
      const puff = ball(r, "#ffffff", { detail: 1 });
      puff.position.set(x, 0.32, z);
      g.add(puff);
    }
    g.position.y = HEAD.crownY - 0.08;
  } else if (kind === "viking") {
    const metal = "#9aa4a8";
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.39, 16, 9, 0, Math.PI * 2, 0, Math.PI / 2), mat(metal, { rough: 0.45 }));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.035, 6, 24), mat("#7a5232"));
    rim.rotation.x = Math.PI / 2;
    const ridge = box(0.06, 0.04, 0.78, "#7a5232");
    ridge.position.y = 0.34;
    ridge.rotation.x = 0;
    g.add(dome, rim);
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.38, 10), mat("#f2ece0"));
      horn.position.set(side * 0.42, 0.18, 0);
      horn.rotation.z = -side * 0.75;
      g.add(horn);
    }
    g.position.y = HEAD.crownY - 0.12;
  } else if (kind === "unicorn") {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.025, 6, 26, Math.PI), mat("#ff8fb1"));
    // Ear to ear over the top, tipped back a little.
    band.rotation.x = -0.3;
    band.position.set(0, -0.06, -0.04);
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.42, 12), mat("#fff4c4", { emissive: "#ffe9a8" }));
    horn.position.set(0, 0.33, 0.12);
    horn.rotation.x = 0.35;
    g.add(band, horn);
    for (const [c, x] of [["#ff8fb1", -0.12], ["#9b7bff", 0.12]] as const) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 6), mat(c));
      ear.position.set(x * 2.2, 0.26, -0.02);
      g.add(ear);
    }
    g.position.y = HEAD.crownY - 0.08;
  } else if (kind === "catears" || kind === "bunny") {
    const fur = kind === "bunny" ? "#fbf7f0" : color;
    const inner = "#ffb3c8";
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.022, 6, 26, Math.PI), mat(fur));
    // Ear to ear over the top, tipped back a little.
    band.rotation.x = -0.3;
    band.position.set(0, -0.06, -0.04);
    g.add(band);
    for (const side of [-1, 1]) {
      const ear = new THREE.Group();
      if (kind === "bunny") {
        const outer = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.34, 4, 8), mat(fur));
        outer.scale.z = 0.5;
        const pink = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.26, 4, 8), mat(inner));
        pink.scale.z = 0.4;
        pink.position.z = 0.025;
        ear.add(outer, pink);
        ear.position.set(side * 0.13, 0.36, -0.02);
        ear.rotation.z = side * -0.18;
        if (side > 0) ear.rotation.x = -0.35;
      } else {
        const outer = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.2, 4), mat(fur));
        outer.scale.z = 0.5;
        const pink = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 4), mat(inner));
        pink.scale.z = 0.3;
        pink.position.set(0, -0.02, 0.03);
        ear.add(outer, pink);
        ear.position.set(side * 0.24, 0.24, 0);
        ear.rotation.z = side * -0.35;
      }
      g.add(ear);
    }
    g.position.y = HEAD.crownY - 0.08;
  } else if (kind === "flowers") {
    const colors = ["#ff8fb1", "#ffd34a", "#ffffff", "#9b7bff", "#ff9a3c"];
    const vine = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.025, 6, 30), mat("#4caf50"));
    vine.rotation.x = Math.PI / 2;
    g.add(vine);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const flower = ball(0.06, colors[i % colors.length], { detail: 0 });
      flower.position.set(Math.cos(a) * 0.34, 0.02, Math.sin(a) * 0.34);
      const middle = ball(0.025, "#f5a524", { detail: 0 });
      middle.position.set(Math.cos(a) * 0.37, 0.04, Math.sin(a) * 0.37);
      g.add(flower, middle);
    }
    g.position.y = HEAD.crownY - 0.1;
    g.rotation.x = -0.12;
  } else if (kind === "santa") {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.33, 0.55, 14), mat("#d62f2f"));
    cone.position.set(0, 0.24, -0.04);
    cone.rotation.x = -0.45;
    const trim = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.07, 8, 24), mat("#ffffff", { rough: 1 }));
    trim.rotation.x = Math.PI / 2;
    const pom = ball(0.08, "#ffffff", { detail: 2 });
    pom.position.set(0, 0.36, -0.32);
    g.add(cone, trim, pom);
    g.position.y = HEAD.crownY - 0.1;
  } else if (kind === "cowboy") {
    const brim = cyl(0.46, 0.46, 0.03, color, 18);
    const crown = cyl(0.24, 0.27, 0.27, color, 12);
    crown.position.y = 0.15;
    const band = cyl(0.275, 0.275, 0.05, "#3a2416", 12);
    band.position.y = 0.06;
    g.add(brim, crown, band);
    g.position.y = HEAD.crownY - 0.08;
  }
  // How wide its opening is (on the standard head), and whether it fits down
  // over the head or perches on top wherever it comes to rest.
  g.userData.fit = {
    r: HAT_OPENING[kind],
    perch: kind === "party" || kind === "crown",
    // Bands, bows and the headlamp go round or on the head without covering the crown.
    cover: !["bow", "headlamp", "unicorn", "catears", "bunny", "flowers"].includes(kind),
    // The inside height of crowns with something on top (a button, a pom-pom, a propeller).
    crown: ({ cap: 0.28, beanie: 0.31, propeller: 0.3, safari: 0.36 } as Partial<Record<Headwear, number>>)[kind],
  };
  return g;
}

/** Each hat's opening, the radius that goes round the head (standard-head units). */
const HAT_OPENING: Record<Exclude<Headwear, "none">, number> = {
  cap: 0.37,
  beanie: 0.38,
  bow: 0.38,
  safari: 0.38,
  fedora: 0.26,
  ranger: 0.29,
  bucket: 0.33,
  bandana: 0.39,
  headlamp: 0.38,
  captain: 0.31,
  party: 0.2,
  propeller: 0.37,
  crown: 0.27,
  tophat: 0.26,
  pirate: 0.33,
  chef: 0.3,
  viking: 0.39,
  unicorn: 0.39,
  catears: 0.39,
  bunny: 0.39,
  flowers: 0.34,
  santa: 0.34,
  cowboy: 0.27,
};

/** Where gear sits relative to the chest bone (stage units, a 1.55-tall person). */
export const CHEST = { frontZ: 0.17, backZ: -0.17, neckY: 0.17 } as const;

/**
 * Adventure gear, placed in the chest bone's space. `width` is the build's torso
 * width, so a backpack sits on a thick back and not inside it.
 */
export function gear(kind: Gear, color: string, width = 1): { object: THREE.Object3D; bone: "chest" | "hips" } | null {
  if (kind === "none") return null;
  const g = new THREE.Group();
  if (kind === "backpack") {
    const pack = box(0.36, 0.38, 0.17, color);
    pack.position.y = -0.2;
    const flap = box(0.37, 0.12, 0.18, "#7a5232");
    flap.position.y = 0.06;
    const pocket = box(0.24, 0.13, 0.06, "#7a5232");
    pocket.position.set(0, -0.15, -0.1);
    const roll = cyl(0.07, 0.07, 0.38, "#4f6b3a", 10);
    roll.rotation.z = Math.PI / 2;
    roll.position.set(0, 0.24, 0.0);
    g.add(pack, flap, pocket, roll);
    for (const x of [-0.12, 0.12]) {
      const strap = box(0.05, 0.36, 0.03, "#5b3a22");
      strap.position.set(x, -0.18, 0.1 + 0.17 * width * 2 - 0.02);
      g.add(strap);
    }
    g.position.set(0, -0.02, CHEST.backZ * width - 0.08);
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
    g.position.set(0, CHEST.neckY - 0.12, CHEST.frontZ * width + 0.05);
    return { object: g, bone: "chest" };
  }
  if (kind === "camera") {
    const body = box(0.2, 0.12, 0.08, "#2b2b30");
    body.position.y = -0.06;
    const lens = cyl(0.045, 0.045, 0.07, "#9aa4a8", 12);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 0, 0.06);
    const flash = box(0.05, 0.03, 0.02, "#fbf7f0");
    flash.position.set(0.06, 0.02, 0.04);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 4, 20, Math.PI), mat("#e2483d"));
    strap.position.set(0, 0.02, -0.05);
    strap.rotation.x = -0.3;
    g.add(body, lens, flash, strap);
    g.position.set(0, CHEST.neckY - 0.1, CHEST.frontZ * width + 0.04);
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
  g.position.set(0.24 * width, 0.0, 0.02);
  return { object: g, bone: "hips" };
}
