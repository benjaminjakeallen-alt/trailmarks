import * as THREE from "three";
import { ball, box, cyl, mat } from "@/components/stage3d/props";
import type { Glasses, Headwear } from "@/lib/look";

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
