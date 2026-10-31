import * as THREE from "three";
import { ball, box, cyl, mat } from "@/components/stage3d/props";
import type { Gear, Glasses, Headwear } from "@/lib/look";

/**
 * Glasses and headwear for the characters, sized in stage units for a 1.55-tall
 * person and placed in the head bone's space (its origin is at the neck; the
 * big chibi head sits above it). The actor scales the group to its own model.
 */

/** Where the face and the crown of the head are, relative to the head bone. */
export const HEAD = { eyeY: 0.36, faceZ: 0.33, crownY: 0.56 } as const;

export function glasses(kind: Glasses): THREE.Object3D | null {
  if (kind === "none") return null;
  const g = new THREE.Group();
  const frame = kind === "sun" ? "#1d1d22" : kind === "round" ? "#6b4a2a" : "#2b2b30";
  const lens = (x: number) => {
    const shape =
      kind === "square"
        ? new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.016, 4, 4), mat(frame))
        : new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.016, 6, 16), mat(frame));
    if (kind === "square") shape.rotation.z = Math.PI / 4;
    shape.position.set(x, 0, 0);
    g.add(shape);
    if (kind === "sun") {
      const dark = new THREE.Mesh(new THREE.CircleGeometry(0.08, 16), mat("#1d2733", { rough: 0.2 }));
      dark.position.set(x, 0, 0.002);
      g.add(dark);
    }
  };
  lens(-0.12);
  lens(0.12);
  const bridge = box(0.07, 0.016, 0.016, frame);
  bridge.position.set(0, -0.008, 0);
  g.add(bridge);
  for (const x of [-0.2, 0.2]) {
    const arm = box(0.016, 0.016, 0.28, frame);
    arm.position.set(x, -0.008, -0.14);
    g.add(arm);
  }
  g.position.set(0, HEAD.eyeY, HEAD.faceZ);
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
    g.position.y = HEAD.crownY - 0.18;
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
  } else if (kind === "cowboy") {
    const brim = cyl(0.46, 0.46, 0.03, color, 18);
    const crown = cyl(0.24, 0.27, 0.27, color, 12);
    crown.position.y = 0.15;
    const band = cyl(0.275, 0.275, 0.05, "#3a2416", 12);
    band.position.y = 0.06;
    g.add(brim, crown, band);
    g.position.y = HEAD.crownY - 0.08;
  }
  return g;
}

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
