import * as THREE from "three";
import type { Actor } from "@/components/stage3d/cast";
import * as P from "@/components/stage3d/props";
import type { Scene, StageKit } from "@/components/stage3d/stage";
import { CHAIR, TABLE, around, beat, chance, pick, rand, ring, row, waveOfJoy, wear } from "@/components/stage3d/scenes";
import { HAT_BAND } from "@/components/stage3d/fit";
import { canvasTexture, sceneHat } from "@/components/stage3d/hats";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

/**
 * More states' scenes (see scenes.ts for how a scene works). Floor units: a
 * person is about 1.7 tall, +z toward the viewer, yaw 0 faces them.
 */

// ---------------------------------------------------------------------------
// Shared scenery

/** A flat disc of ground (sand, snow, dirt) laid on the stage. */
function ground(kit: StageKit, color: string, r = 2.1, squash = 0.75, z = -0.05) {
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.04, 40), P.mat(color));
  disc.scale.set(1, 1, squash);
  disc.position.set(0, 0.02, z);
  disc.receiveShadow = true;
  kit.floor.add(disc);
  return disc;
}

/** Something attached to one of an actor's bones, sized in stage units. */
function onBone(actor: Actor, bone: string, object: THREE.Object3D) {
  const b = actor.model.getObjectByName(bone);
  if (!b) return object;
  const holder = new THREE.Group();
  holder.scale.setScalar(1 / actor.unitScale);
  holder.add(object);
  b.add(holder);
  return object;
}

/** Wrap a prop so placing it keeps it standing on its base (P.box and P.cyl sit their base at y 0 inside). */
const stand = (o: THREE.Object3D) => new THREE.Group().add(o);

/** A floor-space point for an actor's head (to glance at). */
const above = (kit: StageKit, x: number, y: number, z: number) => kit.toWorld(x, y, z);

/** A snow-capped pine. */
function snowyPine(scale = 1) {
  const g = P.tree("pine", "#2f6b4a");
  for (let i = 0; i < 3; i++) {
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.3 - i * 0.08, 0.16, 8), P.mat("#f4f6f7"));
    cap.position.y = 0.72 + i * 0.3;
    g.add(cap);
  }
  g.scale.setScalar(scale);
  return g;
}

// ---------------------------------------------------------------------------
// Alabama: a rocket on the pad in Huntsville. Countdown, ignition, liftoff.

function rocket() {
  const g = new THREE.Group();
  const white = "#eef0f2";
  const body = P.cyl(0.16, 0.16, 1.5, white, 16);
  body.position.y = 0.83;
  const stripe = P.cyl(0.162, 0.162, 0.14, "#2f3f5a", 16);
  stripe.position.y = 1.15;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.45, 16), P.mat("#a5483c"));
  nose.position.y = 1.8;
  const nozzle = P.cyl(0.08, 0.13, 0.18, "#5b6066", 12);
  nozzle.position.y = 0.08;
  g.add(body, stripe, nose, nozzle);
  for (let i = 0; i < 4; i++) {
    const fin = P.box(0.03, 0.34, 0.2, "#a5483c");
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    fin.position.set(Math.sin(a) * 0.17, 0.26, Math.cos(a) * 0.17);
    fin.rotation.y = a;
    g.add(fin);
  }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.55, 12), P.mat("#ffb02e", { emissive: "#ff8a1a" }));
  flame.rotation.x = Math.PI;
  flame.position.y = -0.22;
  flame.visible = false;
  g.add(flame);
  return { object: g, flame };
}

function gantry() {
  const g = new THREE.Group();
  const red = "#8a4a3a";
  for (const [x, z] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]] as const) {
    const leg = P.box(0.04, 2.3, 0.04, red);
    leg.position.set(x, 1.15, z);
    g.add(leg);
  }
  for (let y = 0.3; y < 2.3; y += 0.4) {
    const ring_ = P.box(0.28, 0.03, 0.28, red);
    ring_.position.y = y;
    g.add(ring_);
  }
  const arm = P.box(0.42, 0.04, 0.05, red);
  arm.position.set(-0.25, 1.75, 0);
  g.add(arm);
  return g;
}

export function alabamaScene(): Scene {
  let ship: ReturnType<typeof rocket>;
  let phase: "waiting" | "count" | "launch" = "waiting";
  let lift = 0;
  const pad = new THREE.Vector3(-0.9, 0, -0.9);
  return {
    slots: 5,
    build(kit) {
      kit.place(stand(P.cyl(0.6, 0.65, 0.12, "#9aa1a6", 20)), pad.x, pad.z);
      ship = rocket();
      ship.object.scale.setScalar(1.25);
      kit.place(ship.object, pad.x, pad.z, { y: 0.12, scale: 1.25 });
      kit.place(gantry(), pad.x + 0.5, pad.z - 0.1, { y: 0.12, scale: 1.2 });
      kit.place(P.tufts(14, 2.1, ["#8fae7a", "#a3bd8a"]), 0, 0.6);
      kit.block(pad.x, pad.z, 0.7);
    },
    spot: (i, n) => {
      const s = row(i, n, 0.62, 0.7);
      const x = s.x + 0.75;
      const z = s.z - (i % 2) * 0.35;
      return { x, z, yaw: Math.atan2(pad.x - x, pad.z - z) };
    },
    async role(actor, _slot, kit, clock) {
      actor.lookAt(above(kit, pad.x, 1.4, pad.z));
      for (;;) {
        await beat(clock, 0.4, 0.9);
        if (phase === "count" && chance(0.3)) {
          // Counting down on their fingers.
          await actor.gesture(clock, "Interact", "armR", { hold: 0.3 });
        } else if (phase === "launch") {
          actor.lookAt(above(kit, pad.x, 1.6 + lift, pad.z));
          if (chance(0.5)) {
            actor.bounce(0.9);
            await actor.gesture(clock, "Cheer", "arms", { hold: 0.6 });
          }
        } else {
          actor.lookAt(above(kit, pad.x, 1.4, pad.z));
        }
      }
    },
    async ambient(kit, clock) {
      for (;;) {
        phase = "waiting";
        lift = 0;
        ship.object.position.y = 0.12;
        ship.object.visible = true;
        ship.flame.visible = false;
        await clock.wait(1.2);
        phase = "count";
        for (let i = 0; i < 3; i++) {
          kit.fx.smoke({ x: pad.x, y: 0.2, z: pad.z + 0.3 }, { size: 0.25, rise: 0.2 });
          await clock.wait(0.7);
        }
        phase = "launch";
        ship.flame.visible = true;
        await waveOfJoy(kit, clock);
        for (let t = 0; t < 4.5 && clock.alive; t += 1 / 30) {
          await clock.wait(1 / 30);
          lift += 0.01 + t * 0.06;
          ship.object.position.y = 0.12 + lift;
          ship.flame.scale.y = 1 + Math.sin(t * 40) * 0.25;
          kit.fx.smoke({ x: pad.x + rand(-0.1, 0.1), y: 0.15 + lift * 0.6, z: pad.z + rand(-0.1, 0.1) }, { size: 0.3, rise: 0.15, color: "#e9e6e0" });
        }
        ship.object.visible = false;
        await clock.wait(2.5);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Alaska: a dog sled gliding round the snow under the northern lights.

function sledDog(coat: string) {
  const g = new THREE.Group();
  const body = P.ball(0.13, coat, { detail: 2 });
  body.scale.set(0.75, 0.7, 1.35);
  body.position.y = 0.24;
  const head = P.ball(0.085, coat, { detail: 2 });
  head.position.set(0, 0.36, 0.2);
  const snout = P.ball(0.045, "#efe9df");
  snout.position.set(0, 0.34, 0.28);
  g.add(body, head, snout);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 4), P.mat(coat));
    ear.position.set(s * 0.04, 0.45, 0.18);
    g.add(ear);
  }
  const legs: THREE.Object3D[] = [];
  for (const [x, z] of [[-0.06, 0.12], [0.06, 0.12], [-0.06, -0.12], [0.06, -0.12]] as const) {
    const leg = P.cyl(0.022, 0.022, 0.2, coat, 6);
    leg.position.set(x, 0.1, z);
    g.add(leg);
    legs.push(leg);
  }
  const tail = P.ball(0.05, coat);
  tail.scale.set(0.6, 0.6, 1.4);
  tail.position.set(0, 0.34, -0.2);
  tail.rotation.x = -0.8;
  g.add(tail);
  return { object: g, legs };
}

function aurora() {
  const g = new THREE.Group();
  const ribbons: { mesh: THREE.Mesh; base: Float32Array; phase: number }[] = [];
  const colors = [["#3fd3a2", "#2a7a8a"], ["#7ad3c0", "#5a4a9a"], ["#5fe39a", "#2a6a7a"]];
  colors.forEach(([top, bottom], i) => {
    const geo = new THREE.PlaneGeometry(3.6, 0.8, 40, 4);
    const col: number[] = [];
    const pos = geo.getAttribute("position");
    for (let v = 0; v < pos.count; v++) {
      const k = (pos.getY(v) + 0.6) / 1.2;
      const c = new THREE.Color(bottom).lerp(new THREE.Color(top), k);
      col.push(c.r, c.g, c.b);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.38, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    mesh.position.set(-0.3 + i * 0.3, 1.25 + i * 0.22, -2.2 - i * 0.2);
    mesh.rotation.x = -0.5;
    g.add(mesh);
    ribbons.push({ mesh, base: Float32Array.from(pos.array as ArrayLike<number>), phase: i * 1.7 });
  });
  return {
    object: g,
    wave(t: number) {
      for (const r of ribbons) {
        const pos = r.mesh.geometry.getAttribute("position");
        for (let v = 0; v < pos.count; v++) {
          const x = r.base[v * 3];
          pos.setZ(v, Math.sin(x * 1.3 + t * 0.6 + r.phase) * 0.35);
          pos.setY(v, r.base[v * 3 + 1] + Math.sin(x * 2.1 - t * 0.8 + r.phase) * 0.12);
        }
        pos.needsUpdate = true;
        (r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.22 + Math.sin(t * 0.5 + r.phase) * 0.08;
      }
    },
  };
}

export function alaskaScene(): Scene {
  let lights: ReturnType<typeof aurora>;
  const sled = new THREE.Group();
  const dogs: ReturnType<typeof sledDog>[] = [];
  let musher: Actor | null = null;
  let lap = 0;
  return {
    slots: 5,
    build(kit) {
      ground(kit, "#eef2f4", 2.3, 0.8, 0);
      lights = aurora();
      kit.floor.add(lights.object);
      kit.place(snowyPine(1.1), -2.0, -1.2);
      kit.place(snowyPine(0.85), -1.5, -1.6);
      kit.place(snowyPine(1.0), 2.0, -1.3);
      kit.place(snowyPine(0.7), 2.2, 0.9);
      // The sled: two runners, a deck, a handlebar, and four dogs ahead on a line.
      const wood = "#8a6a4a";
      for (const s of [-1, 1]) {
        const runner = P.box(0.03, 0.03, 0.9, "#5b4a3a");
        runner.position.set(s * 0.2, 0, 0);
        sled.add(runner);
      }
      const deck = P.box(0.44, 0.04, 0.6, wood);
      deck.position.set(0, 0.1, 0.05);
      const bar = P.box(0.44, 0.04, 0.04, wood);
      bar.position.set(0, 0.62, -0.3);
      sled.add(deck, bar);
      for (const s of [-1, 1]) {
        const post = P.box(0.03, 0.55, 0.03, wood);
        post.position.set(s * 0.2, 0.37, -0.3);
        sled.add(post);
      }
      ["#5a5f66", "#e9e6e0", "#8a6a4a", "#2e3236"].forEach((c, i) => {
        const d = sledDog(c);
        d.object.position.set(i % 2 ? 0.14 : -0.14, 0, 0.75 + Math.floor(i / 2) * 0.45);
        sled.add(d.object);
        dogs.push(d);
      });
      const line = P.box(0.015, 0.015, 1.1, "#c9312c");
      line.position.set(0, 0.2, 0.9);
      sled.add(line);
      sled.scale.setScalar(1.3);
      kit.floor.add(sled);
    },
    spot: (i, n) => {
      if (i === 0) return { x: 0, z: 0, yaw: 0 };
      const s = ring(i - 1, Math.max(1, n - 1), 0.75, 0, -0.1);
      return s;
    },
    async role(actor, slot, kit, clock) {
      if (slot === 0) {
        musher = actor;
        actor.play("Idle");
        try {
          for (;;) {
            await beat(clock, 1.5, 3);
            actor.bounce(0.4);
            if (chance(0.5)) await actor.gesture(clock, "Cheer", "armR", { hold: 0.5 });
          }
        } finally {
          musher = null;
        }
      }
      // Everyone else: look up at the lights, point, hug themselves against the cold.
      for (;;) {
        await beat(clock, 1, 2.5);
        actor.lookAt(chance(0.6) ? above(kit, rand(-1.5, 1.5), 3, -2) : null);
        if (chance(0.35)) {
          actor.bounce(0.4);
          await actor.gesture(clock, "Spellcast_Raise", "armR", { hold: 0.8 });
        }
      }
    },
    async ambient(kit, clock) {
      for (;;) {
        await clock.wait(0.12);
        kit.fx.emit({
          at: { x: rand(-2.2, 2.2), y: 2.8, z: rand(-1.8, 1.2) },
          vel: { x: rand(-0.05, 0.05), y: -0.45, z: 0 },
          life: 5.5,
          size: 0.05,
          color: "#ffffff",
          wobble: 0.4,
        });
      }
    },
    tick(dt, t) {
      lights?.wave(t);
      lap += dt * 0.38;
      const rx = 1.6;
      const rz = 1.05;
      const x = Math.sin(lap) * rx;
      const z = Math.cos(lap) * rz - 0.1;
      const nx = Math.sin(lap + 0.05) * rx;
      const nz = Math.cos(lap + 0.05) * rz - 0.1;
      sled.position.set(x, 0.04, z);
      sled.rotation.y = Math.atan2(nx - x, nz - z);
      dogs.forEach((d, i) => d.legs.forEach((l, j) => (l.rotation.x = Math.sin(t * 14 + i + j * Math.PI) * 0.6)));
      if (musher) {
        sled.updateMatrix();
        musher.root.position.copy(new THREE.Vector3(0, 0.14, -0.12).applyMatrix4(sled.matrix));
        musher.root.rotation.y = sled.rotation.y;
        musher.yawTarget = null;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Arkansas: digging for diamonds at the crater. Now and then, a sparkle.

function diamond() {
  const d = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), P.mat("#e8f6fa", { emissive: "#8fc8d6" }));
  d.scale.y = 1.3;
  return d;
}

export function arkansasScene(): Scene {
  return {
    slots: 5,
    build(kit) {
      ground(kit, "#9a7552", 2.2, 0.8, 0);
      for (let i = 0; i < 9; i++) {
        const m = P.dirtMound();
        kit.place(m, rand(-1.9, 1.9), rand(-1.3, 1.0), { scale: rand(0.6, 1.0) });
      }
      kit.place(P.tree("round", "#5f8a4a"), -2.1, -1.3, { scale: 0.9 });
      kit.place(P.tree("round", "#6a9a52"), 2.1, -1.2, { scale: 0.8 });
      // A little sign at the gate.
      const sign = new THREE.Group();
      const post = P.box(0.05, 0.6, 0.05, "#6b4b33");
      const board = P.box(0.55, 0.25, 0.04, "#c9a46a");
      board.position.y = 0.5;
      sign.add(post, board);
      kit.place(sign, 1.7, 0.9, { yaw: -0.4 });
    },
    spot: (i, n) => {
      const s = row(i, n, 0.85, 0.35);
      return { ...s, z: s.z + (i % 2 ? -0.35 : 0.15), yaw: rand(-0.5, 0.5) };
    },
    async role(actor, _slot, kit, clock) {
      const shovel = P.shovel();
      actor.hold(shovel);
      for (;;) {
        await beat(clock, 0.3, 0.8);
        await actor.once(clock, "1H_Melee_Attack_Chop", "Idle", { speed: 0.8 });
        const at = actor.root.position.clone();
        kit.fx.dust({ x: at.x, y: 0, z: at.z + 0.3 }, "#b08a62");
        if (chance(0.18)) {
          // A diamond! Hold it up to the light.
          actor.drop(shovel);
          await actor.once(clock, "PickUp", "Idle");
          const gem = diamond();
          actor.hold(gem);
          actor.bounce(1);
          kit.fx.sparkle({ x: at.x, y: 1.6, z: at.z }, "#dff6ff", 0.5);
          await actor.gesture(clock, "Cheer", "armR", { hold: 1.2 });
          actor.drop(gem);
          actor.hold(shovel);
        }
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Colorado: skiing down a snowy slope past the pines, a chairlift behind.

/** Height of the slope at a point: rising toward the back. */
const slope = (z: number) => Math.max(0, (-z + 0.9) * 0.55);

export function coloradoScene(): Scene {
  const chairs: THREE.Group[] = [];
  return {
    slots: 4,
    build(kit) {
      // The slope: a tilted snowfield rising to the back.
      const geo = new THREE.PlaneGeometry(3.8, 3.0, 20, 20);
      geo.rotateX(-Math.PI / 2);
      const pos = geo.getAttribute("position");
      for (let i = 0; i < pos.count; i++) pos.setY(i, slope(pos.getZ(i)) + 0.06 + Math.sin(pos.getX(i) * 2) * 0.03);
      geo.computeVertexNormals();
      const snow = new THREE.Mesh(geo, P.mat("#f1f4f6"));
      snow.receiveShadow = true;
      kit.floor.add(snow);
      for (const [x, z, s] of [[-2.0, -1.4, 1.1], [-1.6, 0.2, 0.8], [1.9, -0.9, 1.0], [2.1, 0.6, 0.75], [0.9, -1.6, 0.9]] as const) {
        kit.place(snowyPine(s), x, z, { y: slope(z) });
      }
      // A chairlift: towers and a cable across the back, chairs riding it.
      for (const x of [-2.2, 2.2]) {
        kit.place(stand(P.box(0.06, 1.9, 0.06, "#5b6066")), x * 0.85, -1.4, { y: slope(-1.4) });
      }
      const cable = P.box(3.7, 0.012, 0.012, "#2e3236");
      kit.place(cable, 0, -1.4, { y: slope(-1.4) + 1.88 });
      for (let i = 0; i < 4; i++) {
        const c = new THREE.Group();
        const hanger = P.box(0.015, 0.4, 0.015, "#2e3236");
        hanger.position.y = -0.4;
        const seat = P.box(0.32, 0.04, 0.16, "#2f3f5a");
        seat.position.y = -0.42;
        c.add(hanger, seat);
        c.userData.u = i / 4;
        kit.place(c, 0, -1.4, { y: slope(-1.4) + 1.88 });
        chairs.push(c);
      }
    },
    spot: (i) => ({ x: -1.2 + i * 0.75, z: -1.0, yaw: 0 }),
    async role(actor, slot, kit, clock) {
      // Skis and poles.
      for (const foot of ["footl", "footr"]) {
        const ski = P.box(0.07, 0.02, 0.75, "#a5483c");
        ski.position.z = 0.12;
        onBone(actor, foot, ski);
      }
      const pole = P.cyl(0.012, 0.012, 0.8, "#2e3236", 6);
      actor.hold(pole);
      for (;;) {
        // Start at the top, ski down in long S-turns, cheer at the bottom, walk back up.
        const x0 = -1.2 + slot * 0.75;
        actor.root.position.set(x0, slope(-1.0), -1.0);
        actor.play("Idle", { fade: 0.2 });
        await beat(clock, 0.5, 1.5);
        let z = -1.0;
        let x = x0;
        let t = 0;
        while (z < 0.95 && clock.alive) {
          await clock.wait(1 / 30);
          t += 1 / 30;
          z += (1 / 30) * 0.55;
          const nx = x0 + Math.sin(t * 2.4 + slot) * 0.45;
          actor.faceToward(nx, z + 0.2);
          x = nx;
          actor.root.position.set(x, slope(z), z);
          if (chance(0.15)) kit.fx.emit({ at: { x, y: slope(z) + 0.05, z }, vel: { x: rand(-0.4, 0.4), y: 0.5, z: -0.3 }, life: 0.6, size: 0.06, color: "#ffffff", gravity: -2 });
        }
        actor.face(0);
        actor.bounce(0.8);
        await actor.gesture(clock, "Cheer", "arms", { hold: 0.5 });
        await beat(clock, 0.5, 1.2);
        await actor.walkTo(clock, x0 + (slot % 2 ? 0.3 : -0.3), 0.6, { speed: 0.9 });
      }
    },
    tick(dt) {
      for (const c of chairs) {
        c.userData.u = (c.userData.u + dt * 0.06) % 1;
        c.position.x = -1.85 + c.userData.u * 3.7;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Connecticut: sailing past a striped lighthouse on a rocky point.

function sailboat(sailColor = "#f6f3ee") {
  const g = new THREE.Group();
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-0.45, 0.2);
  hullShape.lineTo(0.45, 0.2);
  hullShape.quadraticCurveTo(0.4, -0.1, 0, -0.15);
  hullShape.quadraticCurveTo(-0.4, -0.1, -0.45, 0.2);
  const hullGeo = new THREE.ExtrudeGeometry(hullShape, { depth: 1.5, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04 });
  hullGeo.translate(0, 0, -0.75);
  const hull = new THREE.Mesh(hullGeo, P.mat("#eef0f2"));
  hull.castShadow = true;
  const stripe = P.box(0.92, 0.05, 1.5, "#2f3f5a");
  stripe.position.y = 0.12;
  const deck = P.box(0.86, 0.03, 1.45, "#b08a62");
  deck.position.y = 0.2;
  const mast = P.cyl(0.025, 0.025, 2.0, "#8a6a4a", 8);
  mast.position.set(0, 1.2, 0.2);
  const sailShape = new THREE.Shape();
  sailShape.moveTo(0, 0);
  sailShape.lineTo(0, 1.6);
  sailShape.lineTo(-0.9, 0.05);
  sailShape.closePath();
  const sail = new THREE.Mesh(new THREE.ShapeGeometry(sailShape), P.mat(sailColor));
  (sail.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  sail.rotation.y = Math.PI / 2;
  sail.position.set(0, 0.35, 0.2);
  sail.castShadow = true;
  g.add(hull, stripe, deck, mast, sail);
  return { object: g, sail };
}

function lighthouse() {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const band = P.cyl(0.26 - i * 0.025, 0.28 - i * 0.025, 0.36, i % 2 ? "#a5483c" : "#f3f0ea", 16);
    band.position.y = i * 0.36 + 0.18;
    g.add(band);
  }
  const gallery = P.cyl(0.24, 0.24, 0.05, "#2e3236", 16);
  gallery.position.y = 1.8;
  const lamp = P.cyl(0.13, 0.13, 0.24, "#fff2b0", 12, { emissive: "#ffe08a" });
  lamp.position.y = 1.85;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.24, 12), P.mat("#2e3236"));
  roof.position.y = 2.2;
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 2.4, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: "#fff4c8", transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }),
  );
  beam.rotation.z = Math.PI / 2;
  beam.position.x = -1.2;
  const pivot = new THREE.Group();
  pivot.position.y = 1.97;
  pivot.add(beam);
  g.add(gallery, lamp, roof, pivot);
  return { object: g, pivot };
}

export function connecticutScene(): Scene {
  let sea: ReturnType<typeof P.waves>;
  let boat: ReturnType<typeof sailboat>;
  let light: ReturnType<typeof lighthouse>;
  const crew = new Map<Actor, number>();
  const seats: [number, number][] = [[-0.15, -0.5], [0.15, -0.05]];
  let lap = 0;
  return {
    slots: 4,
    build(kit) {
      sea = P.waves(4.8, 3.2);
      kit.place(sea.object, 0, 0, { y: 0.07 });
      const point = new THREE.Group();
      for (const [x, z, s] of [[0, 0, 1], [0.3, 0.2, 0.7], [-0.25, 0.25, 0.8]] as const) {
        const rock = P.ball(0.45 * s, "#8d8a83", { detail: 1 });
        rock.scale.y = 0.55;
        rock.position.set(x, 0.1, z);
        point.add(rock);
      }
      kit.place(point, 1.75, -1.2);
      light = lighthouse();
      kit.place(light.object, 1.75, -1.25, { y: 0.32, scale: 0.9 });
      // A little dock for whoever isn't sailing.
      const dock = P.box(1.5, 0.06, 0.55, "#9a7a58");
      kit.place(dock, -1.7, 0.9, { y: 0.18 });
      boat = sailboat();
      boat.object.scale.setScalar(1.25);
      kit.floor.add(boat.object);
    },
    spot: (i) => (i < 2 ? { x: 0, z: 0, yaw: 0 } : { x: -2.2 + (i - 2) * 0.5, z: 0.95, yaw: 0.4 }),
    async role(actor, slot, _kit, clock) {
      if (slot < 2) {
        crew.set(actor, slot);
        actor.play("Sit_Floor_Idle", { fade: 0 });
        try {
          for (;;) {
            await beat(clock, 1.5, 3);
            actor.bounce(0.3);
            if (chance(0.4)) await actor.gesture(clock, "Cheer", "armR", { hold: 0.6 });
          }
        } finally {
          crew.delete(actor);
        }
      }
      actor.root.position.y = 0.21;
      for (;;) {
        await beat(clock, 1.5, 3);
        actor.faceToward(boat.object.position.x, boat.object.position.z);
        if (chance(0.3)) actor.bounce(0.4);
        await actor.gesture(clock, "Cheer", "armR", { hold: 0.6 });
      }
    },
    tick(dt, t) {
      sea?.roll(t);
      if (light) light.pivot.rotation.y = t * 0.9;
      if (!boat) return;
      lap += dt * 0.22;
      const x = Math.sin(lap) * 1.0 - 0.2;
      const z = Math.cos(lap) * 0.75 - 0.1;
      const nx = Math.sin(lap + 0.05) * 1.0 - 0.2;
      const nz = Math.cos(lap + 0.05) * 0.75 - 0.1;
      boat.object.position.set(x, 0.05 + Math.sin(t * 1.8) * 0.03, z);
      boat.object.rotation.set(Math.sin(t * 1.3) * 0.04, Math.atan2(nx - x, nz - z), Math.sin(t * 1.1) * 0.06);
      boat.sail.rotation.y = Math.PI / 2 + Math.sin(t * 0.7) * 0.15;
      boat.object.updateMatrix();
      for (const [actor, seat] of crew) {
        const p = new THREE.Vector3(seats[seat][0], 0.22, seats[seat][1]).applyMatrix4(boat.object.matrix);
        actor.root.position.copy(p);
        actor.root.rotation.y = boat.object.rotation.y + (seat % 2 ? 0.9 : -0.9);
        actor.yawTarget = null;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Delaware: the beach boardwalk, kites overhead and a cup of boardwalk fries.

function kite(color: string) {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.28);
  shape.lineTo(0.18, 0);
  shape.lineTo(0, -0.34);
  shape.lineTo(-0.18, 0);
  shape.closePath();
  const sail = new THREE.Mesh(new THREE.ShapeGeometry(shape), P.mat(color));
  (sail.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  const tail: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const bow = P.box(0.06, 0.03, 0.01, i % 2 ? "#f3f0ea" : color);
    bow.position.y = -0.4 - i * 0.12;
    tail.push(bow);
    g.add(bow);
  }
  g.add(sail);
  return g;
}

function friesCup() {
  const g = new THREE.Group();
  const cup = P.cyl(0.07, 0.05, 0.13, "#c9312c", 10);
  g.add(cup);
  for (let i = 0; i < 8; i++) {
    const f = P.box(0.015, 0.1, 0.015, "#e8c46a");
    f.position.set(rand(-0.04, 0.04), 0.12, rand(-0.04, 0.04));
    f.rotation.set(rand(-0.3, 0.3), 0, rand(-0.3, 0.3));
    g.add(f);
  }
  return g;
}

export function delawareScene(): Scene {
  let sea: ReturnType<typeof P.waves>;
  const kites: { kite: THREE.Group; line: THREE.Line; flyer: Actor; phase: number }[] = [];
  let kitRef: StageKit | null = null;
  return {
    slots: 5,
    build(kit) {
      kitRef = kit;
      sea = P.waves(4.8, 1.2);
      kit.place(sea.object, 0, -1.6);
      const sand = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.04, 1.2), P.mat("#ecd7a8"));
      sand.position.set(0, 0.02, -0.55);
      sand.receiveShadow = true;
      kit.floor.add(sand);
      // The boardwalk: planks along the front, a railing behind.
      const boards = new THREE.Group();
      for (let i = 0; i < 24; i++) {
        const plank = P.box(0.18, 0.05, 1.1, i % 2 ? "#a88a64" : "#9a7c58");
        plank.position.x = -2.2 + i * 0.19;
        boards.add(plank);
      }
      kit.place(boards, 0, 0.55);
      for (let i = 0; i < 9; i++) {
        kit.place(stand(P.box(0.04, 0.4, 0.04, "#7a5c3c")), -2.2 + i * 0.55, 0.02, { y: 0.05 });
      }
      kit.place(P.box(4.5, 0.04, 0.04, "#7a5c3c"), 0, 0.02, { y: 0.45 });
      // An umbrella on the sand.
      const umbrella = new THREE.Group();
      umbrella.add(P.cyl(0.02, 0.02, 1.1, "#e9e6e0", 6));
      const top = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.22, 8), P.mat("#46658a"));
      top.position.y = 1.1;
      umbrella.add(top);
      kit.place(umbrella, -1.4, -0.6, { yaw: 0.2 });
    },
    spot: (i, n) => row(i, n, 0.85, 0.55),
    async role(actor, slot, kit, clock) {
      actor.root.position.y = 0.05;
      if (slot % 2 === 0) {
        // Flying a kite: string in hand, kite up over the sand.
        const k = kite(pick(["#a5483c", "#46658a", "#c2a052", "#6d7b48"]));
        kit.floor.add(k);
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: "#f3f0ea" }));
        kit.floor.add(line);
        const entry = { kite: k, line, flyer: actor, phase: rand(0, 6) };
        kites.push(entry);
        actor.face(Math.PI);
        try {
          for (;;) {
            await beat(clock, 1, 2);
            await actor.gesture(clock, "Interact", "armR", { hold: 0.6 });
            if (chance(0.3)) actor.bounce(0.5);
          }
        } finally {
          k.removeFromParent();
          line.removeFromParent();
          kites.splice(kites.indexOf(entry), 1);
        }
      }
      // Fries: a bite now and then, and a happy wiggle.
      const fries = friesCup();
      actor.hold(fries, "left");
      for (;;) {
        await beat(clock, 1.2, 2.5);
        await actor.gesture(clock, "Use_Item", "armR", { hold: 0.4 });
        if (chance(0.4)) actor.bounce(0.6);
      }
    },
    async ambient(_kit, clock) {
      await clock.wait(1);
    },
    tick(_dt, t) {
      sea?.roll(t);
      if (!kitRef) return;
      for (const k of kites) {
        const hand = kitRef.floor.worldToLocal(k.flyer.handR.getWorldPosition(new THREE.Vector3()));
        const top = new THREE.Vector3(k.flyer.root.position.x + Math.sin(t * 0.6 + k.phase) * 0.5, 2.3 + Math.sin(t * 1.3 + k.phase) * 0.2, -1.2);
        k.kite.position.copy(top);
        k.kite.rotation.set(0.2, 0, Math.sin(t * 1.7 + k.phase) * 0.35);
        const pos = k.line.geometry.getAttribute("position") as THREE.BufferAttribute;
        pos.setXYZ(0, hand.x, hand.y, hand.z);
        pos.setXYZ(1, top.x, top.y - 0.3, top.z);
        pos.needsUpdate = true;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Hawaii: a beach luau. Leis, tiki torches, hula, and a smoking volcano.

function lei() {
  const g = new THREE.Group();
  const colors = ["#d98a9e", "#e7c46a", "#f3eee5", "#e09a6a", "#c48aa5"];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const f = P.ball(0.035, colors[i % colors.length]);
    f.position.set(Math.cos(a) * 0.17, 0.12 - Math.sin(a) ** 2 * 0.0 + (Math.sin(a) > 0 ? -Math.sin(a) * 0.08 : 0), Math.sin(a) * 0.15);
    g.add(f);
  }
  return g;
}

function tikiTorch() {
  const g = new THREE.Group();
  g.add(P.cyl(0.03, 0.035, 1.2, "#7a5c3c", 6));
  const cup = P.cyl(0.07, 0.05, 0.12, "#5b4a3a", 8);
  cup.position.y = 1.2;
  g.add(cup);
  return g;
}

function volcano() {
  const g = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 1.3, 1.4, 12, 1, true), P.mat("#6b5a4f"));
  cone.position.y = 0.7;
  cone.castShadow = true;
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.34, 12), P.mat("#ff7a2b", { emissive: "#ff5a10" }));
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 1.38;
  const green = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.32, 0.35, 12), P.mat("#5f8a4a"));
  green.position.y = 0.17;
  g.add(cone, glow, green);
  return g;
}

export function hawaiiScene(): Scene {
  let sea: ReturnType<typeof P.waves>;
  const torches: THREE.Vector3[] = [];
  return {
    slots: 5,
    build(kit) {
      sea = P.waves(4.8, 1.0);
      kit.place(sea.object, 0, 1.55);
      ground(kit, "#ecd7a8", 2.1, 0.7, -0.15);
      kit.place(volcano(), 0.9, -1.75, { scale: 0.9 });
      const fire = P.campfire();
      kit.place(fire.object, 0, 0.05, { scale: 0.8 });
      kit.block(0, 0.05, 0.35);
      kit.place(P.palmTree(), -1.9, -0.9, { scale: 0.75 });
      kit.place(P.palmTree(), 2.0, 0.2, { scale: 0.6, yaw: 2 });
      for (const [x, z] of [[-1.3, 0.6], [1.3, 0.6], [-1.6, -0.3], [1.6, -0.4]] as const) {
        kit.place(tikiTorch(), x, z);
        torches.push(new THREE.Vector3(x, 1.3, z));
      }
    },
    spot: (i, n) => ring(i, n, 1.0, 0, 0.05),
    async role(actor, slot, kit, clock) {
      onBone(actor, "chest", lei());
      for (;;) {
        // Hula: swaying side to side, arms flowing.
        for (let i = 0; i < 8 && clock.alive; i++) {
          actor.face(Math.sin(i * 0.8 + slot) * 0.5 + (actor.yawTarget ?? 0) * 0);
          await actor.gesture(clock, "Spellcasting", i % 2 ? "armL" : "armR", { hold: 0.2, speed: 0.8 });
        }
        actor.bounce(0.5);
        await beat(clock, 0.5, 1.2);
        if (chance(0.3)) {
          actor.lookAt(above(kit, 0.9, 1.6, -1.75));
          await clock.wait(1.2);
          actor.lookAt(null);
        }
      }
    },
    async ambient(kit, clock) {
      for (;;) {
        await clock.wait(0.1);
        for (const p of torches) {
          if (chance(0.6))
            kit.fx.emit({ at: { x: p.x + rand(-0.03, 0.03), y: p.y, z: p.z }, vel: { x: 0, y: rand(0.4, 0.7), z: 0 }, life: 0.5, size: 0.07, endSize: 0.01, color: pick(["#ffb02e", "#ff7a2b"]) });
        }
        if (chance(0.25)) kit.fx.smoke({ x: 0.9 + rand(-0.1, 0.1), y: 1.3, z: -1.75 }, { size: 0.35, rise: 0.4, color: "#bdb5ad" });
      }
    },
    tick: (_dt, t) => sea?.roll(t),
  };
}

// ---------------------------------------------------------------------------
// Illinois: selfies at the giant silver "Bean", a skyline behind, deep dish waiting.

function bean() {
  const geo = new THREE.SphereGeometry(1, 48, 24);
  const pos = geo.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    let y = pos.getY(i);
    // Flattened underneath, with the arch you can walk into.
    if (y < 0) y *= 0.55;
    y -= 0.35 * Math.exp(-((x / 0.35) ** 2)) * Math.max(0, -pos.getY(i));
    pos.setY(i, y);
  }
  geo.computeVertexNormals();
  // Polished steel; with no sky to reflect, a bright, glossy silver reads best.
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: "#dfe5e9", metalness: 0.35, roughness: 0.18 }));
  m.scale.set(1.15, 0.55, 0.6);
  m.position.y = 0.42;
  m.castShadow = true;
  return m;
}

function skyline() {
  const g = new THREE.Group();
  const shades = ["#7d8a96", "#93a0aa", "#6f7c88", "#a3adb5"];
  for (let i = 0; i < 11; i++) {
    const h = rand(1.0, 2.6) * (i === 5 ? 1.35 : 1);
    const b = P.box(rand(0.3, 0.5), h, 0.35, shades[i % 4]);
    b.position.x = -2.2 + i * 0.44;
    g.add(b);
  }
  return g;
}

function phone() {
  const g = new THREE.Group();
  g.add(P.box(0.08, 0.15, 0.015, "#25272b"));
  const screen = P.box(0.068, 0.13, 0.002, "#9ec4d6", { emissive: "#5a8aa0" });
  screen.position.z = 0.009;
  g.add(screen);
  return g;
}

export function illinoisScene(): Scene {
  return {
    slots: 5,
    async build(kit) {
      kit.place(skyline(), 0, -2.0);
      kit.place(bean(), 0.75, -1.05, { scale: 1.15 });
      kit.block(0.75, -1.05, 1.05);
      const table = await kit.prop("table_round_A", { w: 0.9, h: 0.6 });
      kit.place(table, -1.6, -1.35);
      kit.block(-1.6, -1.35, 0.45);
      const pie = P.pizza();
      kit.place(pie, -1.6, -1.35, { y: 0.6, scale: 0.8 });
      const plaza = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.03, 2.6), P.mat("#c9c4ba"));
      plaza.position.set(0, 0.015, -0.2);
      plaza.receiveShadow = true;
      kit.floor.add(plaza);
    },
    spot: (i) => {
      // Fanned round the front of the Bean, leaving it in view.
      const spots = [[-1.75, -0.55], [-1.25, 0.15], [-0.55, 0.65], [0.3, 0.75], [1.05, 0.55]];
      const [x, z] = spots[i % spots.length];
      return { x, z, yaw: Math.atan2(-x * 0.2, 1) };
    },
    async role(actor, slot, kit, clock) {
      // Backs to the Bean, phone up: a selfie, a pose, another.
      const p = phone();
      for (;;) {
        actor.face(0);
        actor.hold(p);
        await actor.gesture(clock, "Spellcast_Raise", "armR", { hold: rand(0.8, 1.4) });
        if (chance(0.5)) kit.fx.sparkle({ x: actor.root.position.x, y: 1.7, z: actor.root.position.z + 0.3 }, "#ffffff", 0.2);
        actor.drop(p);
        actor.bounce(0.6);
        await actor.gesture(clock, pick(["Cheer", "Spellcasting"]), "arms", { hold: 0.4 });
        await beat(clock, 0.8, 1.6);
        if (slot === 0 && chance(0.35)) {
          // Someone heads off for a slice of deep dish, and comes back.
          const home = actor.root.position.clone();
          await actor.walkTo(clock, -1.6, -0.85);
          actor.faceToward(-1.6, -1.35);
          await actor.once(clock, "Interact", "Idle");
          actor.bounce(0.5);
          await actor.walkTo(clock, home.x, home.z);
        }
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Indiana: go-karts round an oval, someone waving the checkered flag.

function goKart(color: string, num: number) {
  const g = new THREE.Group();
  const body = P.box(0.42, 0.1, 0.7, color);
  body.position.y = 0.08;
  const nose = P.box(0.3, 0.08, 0.18, color);
  nose.position.set(0, 0.08, 0.4);
  const seat = P.box(0.26, 0.2, 0.06, "#2e3236");
  seat.position.set(0, 0.13, -0.22);
  const wheel = "#1d1d22";
  const wheels: THREE.Object3D[] = [];
  for (const [x, z] of [[-0.24, 0.24], [0.24, 0.24], [-0.24, -0.24], [0.24, -0.24]] as const) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 12), P.mat(wheel));
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.09, z);
    g.add(w);
    wheels.push(w);
  }
  const plate = P.box(0.16, 0.12, 0.01, "#f3f0ea");
  plate.position.set(0, 0.1, 0.5);
  const digit = P.box(0.03, 0.08, 0.012, "#1d1d22");
  digit.position.set(0, 0.12, 0.505);
  digit.rotation.z = num * 0.3;
  g.add(body, nose, seat, plate, digit);
  return { object: g, wheels };
}

function checkeredFlag() {
  const g = new THREE.Group();
  const pole = P.cyl(0.012, 0.012, 0.6, "#c9cdd0", 6);
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d")!;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    x.fillStyle = (i + j) % 2 ? "#1d1d22" : "#f3f0ea";
    x.fillRect(i * 16, j * 16, 16, 16);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.24), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide }));
  flag.position.set(0.17, 0.48, 0);
  g.add(pole, flag);
  return g;
}

export function indianaScene(): Scene {
  const karts: { kart: ReturnType<typeof goKart>; phase: number; speed: number }[] = [];
  const drivers = new Map<Actor, number>();
  const track = (ph: number) => ({ x: Math.sin(ph) * 1.65, z: Math.cos(ph) * 1.0 - 0.15 });
  return {
    slots: 5,
    build(kit) {
      const road = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.4, 4, 48), P.mat("#5a6066"));
      road.rotation.x = Math.PI / 2;
      road.scale.set(1.25, 0.78, 0.06);
      road.position.set(0, 0.01, -0.15);
      road.receiveShadow = true;
      kit.floor.add(road);
      const infield = new THREE.Mesh(new THREE.CircleGeometry(1.0, 32), P.mat("#7a9a62"));
      infield.rotation.x = -Math.PI / 2;
      infield.scale.set(1.25, 0.6, 1);
      infield.position.set(0, 0.012, -0.15);
      kit.floor.add(infield);
      // The yard of bricks at the finish line.
      const bricks = P.box(0.12, 0.012, 0.8, "#a5483c");
      kit.place(bricks, 0, 0.85);
      ["#a5483c", "#46658a", "#c2a052", "#6d7b48"].forEach((c, i) => {
        const k = goKart(c, i);
        k.object.scale.setScalar(1.15);
        kit.floor.add(k.object);
        karts.push({ kart: k, phase: i * 1.55, speed: rand(0.62, 0.75) });
      });
    },
    spot: (i) => (i === 4 ? { x: 0.35, z: 0.55, yaw: 0 } : { x: 0, z: 0, yaw: 0 }),
    async role(actor, slot, _kit, clock) {
      if (slot === 4) {
        // The flagger.
        const flag = checkeredFlag();
        actor.hold(flag);
        for (;;) {
          await actor.gesture(clock, "Spellcast_Raise", "armR", { hold: 0.2, speed: 1.4 });
          await actor.gesture(clock, "Cheer", "armR", { hold: 0.1, speed: 1.6 });
          if (chance(0.3)) actor.bounce(0.6);
        }
      }
      drivers.set(actor, slot);
      actor.play("Sit_Floor_Idle", { fade: 0 });
      try {
        for (;;) {
          await beat(clock, 1.5, 3);
          if (chance(0.4)) await actor.gesture(clock, "Cheer", "armR", { hold: 0.4 });
        }
      } finally {
        drivers.delete(actor);
      }
    },
    tick(dt) {
      for (const k of karts) {
        k.phase += dt * k.speed;
        const p = track(k.phase);
        const q = track(k.phase + 0.05);
        k.kart.object.position.set(p.x, 0.02, p.z);
        k.kart.object.rotation.y = Math.atan2(q.x - p.x, q.z - p.z);
        k.kart.wheels.forEach((w) => (w.rotation.x += dt * 14));
        k.kart.object.updateMatrix();
      }
      for (const [actor, i] of drivers) {
        const k = karts[i % karts.length].kart.object;
        actor.root.position.copy(new THREE.Vector3(0, 0.1, -0.2).applyMatrix4(k.matrix));
        actor.root.rotation.y = k.rotation.y;
        actor.yawTarget = null;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Iowa: lost in a corn maze. Pop out, wave, duck back in.

function cornStalk() {
  const g = new THREE.Group();
  const h = rand(1.25, 1.5);
  g.add(P.cyl(0.02, 0.03, h, "#7a9a4a", 5));
  for (let i = 0; i < 4; i++) {
    const leaf = P.box(0.25, 0.015, 0.06, "#6a8a42");
    leaf.position.set(0, 0.35 + i * 0.25, 0);
    leaf.rotation.set(0, i * 1.7, -0.5);
    g.add(leaf);
  }
  const ear = P.cyl(0.035, 0.03, 0.18, "#e3c45a", 6);
  ear.position.set(0.04, h * 0.6, 0);
  ear.rotation.z = -0.3;
  const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 5), P.mat("#c9a46a"));
  tassel.position.y = h + 0.08;
  g.add(ear, tassel);
  return g;
}

export function iowaScene(): Scene {
  // The maze: rows of corn with gaps; people stroll the aisles between them.
  const aisles = [-0.9, 0, 0.9];
  return {
    slots: 4,
    build(kit) {
      ground(kit, "#8a7350", 2.2, 0.8, -0.1);
      for (const rz of [-1.35, -0.45, 0.45]) {
        for (let x = -2.0; x <= 2.0; x += 0.18) {
          // Gaps in each wall so the maze connects.
          if (Math.abs(x - (rz < 0 ? 0.6 : -0.7)) < 0.25 || Math.abs(x + (rz < -1 ? 1.2 : -1.3)) < 0.22) continue;
          kit.place(cornStalk(), x + rand(-0.03, 0.03), rz + rand(-0.06, 0.06), { yaw: rand(0, 6), scale: rand(0.9, 1.05) });
        }
      }
      // A scarecrow at the entrance.
      const crow = new THREE.Group();
      crow.add(P.box(0.04, 1.2, 0.04, "#6b4b33"));
      const arms = P.box(0.7, 0.04, 0.04, "#6b4b33");
      arms.position.y = 0.95;
      const shirt = P.box(0.36, 0.38, 0.14, "#a5483c");
      shirt.position.y = 0.72;
      const head = P.ball(0.13, "#e3c99a");
      head.position.y = 1.1;
      const hat = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.18, 10), P.mat("#c9a46a"));
      hat.position.y = 1.25;
      crow.add(arms, shirt, head, hat);
      kit.place(crow, 1.9, 0.95, { yaw: -0.5 });
    },
    spot: (i) => ({ x: -1.6 + i * 0.9, z: aisles[i % 3] - 0.45 + 0.0, yaw: 0 }),
    async role(actor, slot, kit, clock) {
      const lane = (slot % 3) - 1;
      const z = lane * 0.9 - 0.0;
      actor.root.position.z = z;
      for (;;) {
        // Stroll the aisle one way, peek about, stroll back.
        const to = rand(-1.8, 1.8);
        await actor.walkTo(clock, to, z, { speed: 0.8 });
        actor.face(rand(-1, 1));
        await beat(clock, 0.4, 1.0);
        if (chance(0.4)) {
          // Found someone (or the way out)!
          actor.bounce(0.9);
          await actor.gesture(clock, "Cheer", "arms", { hold: 0.5 });
        } else {
          actor.lookAt(above(kit, actor.root.position.x + rand(-1, 1), 1.8, z - 0.8));
          await clock.wait(0.8);
          actor.lookAt(null);
        }
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Kansas: a sunflower field, and a twister spinning past in the distance.

function sunflower() {
  const g = new THREE.Group();
  const h = rand(0.8, 1.15);
  g.add(P.cyl(0.018, 0.022, h, "#6a8a42", 5));
  const leaf = P.box(0.2, 0.015, 0.08, "#6a8a42");
  leaf.position.y = h * 0.5;
  leaf.rotation.z = 0.4;
  g.add(leaf);
  const head = new THREE.Group();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const petal = P.ball(0.05, "#e7b93a");
    petal.scale.set(1.5, 0.6, 0.3);
    petal.position.set(Math.cos(a) * 0.09, Math.sin(a) * 0.09, 0);
    petal.rotation.z = a;
    head.add(petal);
  }
  const disk = P.cyl(0.07, 0.07, 0.03, "#5b3a22", 10);
  disk.rotation.x = Math.PI / 2;
  head.add(disk);
  head.position.y = h + 0.02;
  head.rotation.x = -0.35;
  g.add(head);
  return g;
}

export function kansasScene(): Scene {
  const twister = new THREE.Group();
  const swirls: THREE.Mesh[] = [];
  let spinner: Actor | null = null;
  return {
    slots: 5,
    build(kit) {
      ground(kit, "#9aa86a", 2.3, 0.8, 0);
      for (let i = 0; i < 70; i++) {
        const x = rand(-2.1, 2.1);
        const z = rand(-1.6, -0.15) + (Math.abs(x) > 1.6 ? rand(0, 1.8) : 0);
        kit.place(sunflower(), x, z, { yaw: rand(-0.3, 0.3) });
      }
      // The twister: stacked translucent swirls, wide at the top.
      for (let i = 0; i < 10; i++) {
        const m = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06 + i * i * 0.012, 0.05 + (i - 1 < 0 ? 0 : (i - 1) * (i - 1) * 0.012), 0.24, 14, 1, true),
          new THREE.MeshStandardMaterial({ color: "#7d7873", transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }),
        );
        m.position.set(Math.sin(i * 0.5) * 0.08, 0.12 + i * 0.22, 0);
        twister.add(m);
        swirls.push(m);
      }
      kit.place(twister, -1.4, -1.9);
    },
    spot: (i, n) => row(i, n, 0.8, 0.55),
    async role(actor, slot, kit, clock) {
      actor.lookAt(twister.position.clone().setY(1.2).applyMatrix4(kit.floor.matrixWorld));
      for (;;) {
        await beat(clock, 1.2, 2.5);
        if (slot === 2 && chance(0.3) && !spinner) {
          // Whoosh: lifted off their feet for a twirl (and set right back down).
          spinner = actor;
          actor.play("Jump_Idle", { fade: 0.2 });
          const base = actor.root.position.clone();
          for (let t = 0; t < 1.6 && clock.alive; t += 1 / 30) {
            await clock.wait(1 / 30);
            actor.root.position.y = base.y + Math.sin((t / 1.6) * Math.PI) * 0.5;
            actor.root.rotation.y += 0.35;
            actor.yawTarget = null;
          }
          actor.root.position.copy(base);
          actor.play("Idle", { fade: 0.2 });
          actor.face(0);
          actor.bounce(1);
          spinner = null;
          await waveOfJoy(kit, clock);
        } else if (chance(0.4)) {
          actor.bounce(0.4);
          await actor.gesture(clock, "Spellcast_Raise", "armR", { hold: 0.6 });
        }
      }
    },
    async ambient(kit, clock) {
      for (;;) {
        await clock.wait(0.08);
        const p = twister.position;
        kit.fx.dust({ x: p.x + rand(-0.2, 0.2), y: 0, z: p.z }, "#a89a80");
      }
    },
    tick(dt, t) {
      swirls.forEach((m, i) => (m.rotation.y += dt * (4 - i * 0.3)));
      twister.position.x = Math.sin(t * 0.18) * 1.6;
      twister.rotation.z = Math.sin(t * 0.9) * 0.08;
    },
  };
}

// ---------------------------------------------------------------------------
// Kentucky: race day. Horses thunder round the track, fancy hats at the rail.

function horse(coat: string, silks: string) {
  const g = new THREE.Group();
  const body = P.ball(0.22, coat, { detail: 2 });
  body.scale.set(0.7, 0.7, 1.4);
  body.position.y = 0.62;
  const neck = P.cyl(0.08, 0.11, 0.38, coat, 8);
  neck.position.set(0, 0.85, 0.3);
  neck.rotation.x = 0.6;
  const head = P.ball(0.1, coat, { detail: 2 });
  head.scale.set(0.8, 0.8, 1.6);
  head.position.set(0, 1.05, 0.48);
  const mane = P.box(0.03, 0.08, 0.3, "#2e2622");
  mane.position.set(0, 0.98, 0.3);
  mane.rotation.x = 0.6;
  const tail = P.cyl(0.02, 0.05, 0.35, "#2e2622", 6);
  tail.position.set(0, 0.55, -0.35);
  tail.rotation.x = -0.4;
  const legs: THREE.Object3D[] = [];
  for (const [x, z] of [[-0.09, 0.2], [0.09, 0.2], [-0.09, -0.2], [0.09, -0.2]] as const) {
    const leg = P.cyl(0.03, 0.025, 0.48, coat, 6);
    leg.position.set(x, 0.24, z);
    g.add(leg);
    legs.push(leg);
  }
  // A little jockey in racing silks.
  const jockey = P.ball(0.1, silks, { detail: 2 });
  jockey.scale.set(1, 1.2, 1);
  jockey.position.set(0, 0.92, 0.05);
  const cap = P.ball(0.06, silks);
  cap.position.set(0, 1.08, 0.12);
  g.add(body, neck, head, mane, tail, jockey, cap);
  return { object: g, legs };
}

export function kentuckyScene(): Scene {
  const horses: { h: ReturnType<typeof horse>; phase: number; speed: number }[] = [];
  const track = (ph: number) => ({ x: Math.sin(ph) * 1.7, z: Math.cos(ph) * 0.9 - 0.45 });
  return {
    slots: 5,
    build(kit) {
      const dirt = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.38, 4, 48), P.mat("#a07a52"));
      dirt.rotation.x = Math.PI / 2;
      dirt.scale.set(1.3, 0.7, 0.06);
      dirt.position.set(0, 0.012, -0.45);
      dirt.receiveShadow = true;
      kit.floor.add(dirt);
      // The rail in front of the family.
      for (let i = 0; i < 12; i++) kit.place(stand(P.box(0.03, 0.42, 0.03, "#f3f0ea")), -2.2 + i * 0.4, 0.62);
      kit.place(P.box(4.5, 0.035, 0.035, "#f3f0ea"), 0, 0.62, { y: 0.4 });
      // Twin spires, for the feel of it.
      const stand_ = new THREE.Group();
      stand_.add(P.box(1.4, 0.6, 0.4, "#e9e6e0"));
      for (const x of [-0.35, 0.35]) {
        const spire = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 6), P.mat("#5b6066"));
        spire.position.set(x, 0.9, 0);
        const base = P.box(0.22, 0.3, 0.22, "#e9e6e0");
        base.position.set(x, 0.6, 0);
        stand_.add(base, spire);
      }
      kit.place(stand_, 0, -1.95);
      [["#7a4a2a", "#a5483c"], ["#2e2622", "#46658a"], ["#a87a4a", "#c2a052"]].forEach(([c, s], i) => {
        const h = horse(c, s);
        h.object.scale.setScalar(0.85);
        kit.floor.add(h.object);
        horses.push({ h, phase: i * 0.35, speed: 0.95 + i * 0.04 });
      });
    },
    spot: (i, n) => {
      const s = row(i, n, 0.8, 0.95);
      return { ...s, yaw: Math.PI };
    },
    async role(actor, slot, kit, clock) {
      wear(actor, sceneHat("derby", HAT_BAND, { color: pick(["#d98a9e", "#e7c46a", "#a48ac4", "#f3eee5", "#7ab0c4"]) }), { fitted: true });
      for (;;) {
        await beat(clock, 0.6, 1.4);
        const leader = horses.reduce((a, b) => (b.phase > a.phase ? b : a));
        const at = leader.h.object.position;
        actor.lookAt(kit.toWorld(at.x, 1.2, at.z));
        if (chance(0.45)) {
          actor.bounce(0.8);
          await actor.gesture(clock, "Cheer", slot % 2 ? "arms" : "armR", { hold: 0.4 });
        }
      }
    },
    tick(dt, t) {
      for (const r of horses) {
        r.phase += dt * r.speed * (1 + Math.sin(t * 0.7 + r.speed * 9) * 0.12);
        const p = track(r.phase);
        const q = track(r.phase + 0.05);
        r.h.object.position.set(p.x, Math.abs(Math.sin(t * 9 + r.phase)) * 0.05, p.z);
        r.h.object.rotation.y = Math.atan2(q.x - p.x, q.z - p.z);
        r.h.legs.forEach((l, j) => (l.rotation.x = Math.sin(t * 12 + j * 1.6) * 0.7));
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Maine: a lobster bake by the lighthouse. Steaming pot, bibs on, cracking claws.

function lobster() {
  const g = new THREE.Group();
  const red = "#b8432f";
  const body = P.ball(0.07, red, { detail: 2 });
  body.scale.set(0.8, 0.6, 1.8);
  const tail = P.ball(0.05, red);
  tail.scale.set(1.2, 0.5, 0.8);
  tail.position.z = -0.14;
  g.add(body, tail);
  for (const s of [-1, 1]) {
    const arm = P.cyl(0.012, 0.012, 0.12, red, 5);
    arm.rotation.set(Math.PI / 2, 0, s * 0.6);
    arm.position.set(s * 0.06, 0, 0.12);
    const claw = P.ball(0.04, red);
    claw.scale.set(0.8, 0.6, 1.4);
    claw.position.set(s * 0.1, 0, 0.2);
    g.add(arm, claw);
  }
  return g;
}

export function maineScene(): Scene {
  let light: ReturnType<typeof lighthouse>;
  let sea: ReturnType<typeof P.waves>;
  const plate = new THREE.Vector3(0.6, TABLE.h, 0.05);
  const seats = around(plate.x, plate.z, 0.85, [-1.3, 1.3, Math.PI]);
  return {
    slots: 5,
    async build(kit) {
      sea = P.waves(4.8, 1.3);
      kit.place(sea.object, 0, -1.7, { y: 0.04 });
      const rocks = new THREE.Group();
      for (const [x, z, r] of [[0, 0, 0.45], [0.35, 0.15, 0.3], [-0.3, 0.2, 0.32]] as const) {
        const rock = P.ball(r, "#8d8a83");
        rock.scale.y = 0.55;
        rock.position.set(x, 0.1, z);
        rocks.add(rock);
      }
      kit.place(rocks, -1.6, -1.2);
      light = lighthouse();
      kit.place(light.object, -1.6, -1.25, { y: 0.28, scale: 0.85 });
      const table = await kit.prop("table_round_A", TABLE);
      kit.place(table, plate.x, plate.z);
      kit.block(plate.x, plate.z, TABLE.w / 2);
      for (const s of seats) {
        const chair = await kit.prop("chair_A", CHAIR);
        kit.place(chair, s.x - Math.sin(s.yaw!) * 0.12, s.z - Math.cos(s.yaw!) * 0.12, { yaw: s.yaw! });
      }
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        kit.place(lobster(), plate.x + Math.sin(a) * 0.3, plate.z + Math.cos(a) * 0.3, { y: plate.y + 0.04, yaw: a });
      }
      // The pot over a fire, steaming.
      const pot = await kit.prop("pot_A", { w: 0.45 });
      kit.place(pot, -0.85, 0.55);
      kit.block(-0.85, 0.55, 0.35);
    },
    spot(i) {
      if (i === 0) return { x: -0.85, z: 1.0, yaw: Math.PI };
      if (i === 4) return { x: -1.35, z: 0.3, yaw: 1.2 };
      return seats[i - 1];
    },
    async role(actor, slot, kit, clock) {
      if (slot === 0 || slot === 4) {
        // The cook: stir, lift the lid in a cloud of steam, cheer.
        for (;;) {
          await beat(clock, 1.2, 2.5);
          await actor.once(clock, "Interact", "Idle");
          for (let i = 0; i < 5; i++) kit.fx.smoke({ x: -0.85, y: 0.6, z: 0.55 }, { color: "#f3f0ea", size: 0.25, rise: 0.7 });
          if (chance(0.4)) {
            actor.bounce(0.5);
            await actor.gesture(clock, "Cheer", "armR", { hold: 0.4 });
          }
        }
      }
      await actor.once(clock, "Sit_Chair_Down", "Sit_Chair_Idle");
      const l = lobster();
      actor.hold(l);
      for (;;) {
        await beat(clock, 1.5, 3);
        // Crack a claw; sometimes it nips back.
        await actor.gesture(clock, "Use_Item", "armR", { hold: 0.4 });
        if (chance(0.25)) {
          actor.bounce(1);
          await actor.gesture(clock, "Hit_A", "upper", { hold: 0.1, speed: 1.4 });
        }
      }
    },
    tick(_dt, t) {
      sea?.roll(t);
      if (light) light.pivot.rotation.y = t * 0.9;
    },
  };
}

// ---------------------------------------------------------------------------
// Maryland: a crab feast. Brown paper, a pile of steamed crabs, mallets going.

function crab() {
  const g = new THREE.Group();
  const red = "#c2573a";
  const shell = P.ball(0.08, red, { detail: 2 });
  shell.scale.set(1.5, 0.5, 1);
  g.add(shell);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const leg = P.box(0.1, 0.012, 0.012, red);
      leg.position.set(s * 0.14, -0.01, -0.03 + i * 0.03);
      leg.rotation.z = s * -0.4;
      g.add(leg);
    }
    const claw = P.ball(0.035, red);
    claw.scale.set(1.4, 0.7, 0.8);
    claw.position.set(s * 0.1, 0, 0.08);
    g.add(claw);
  }
  return g;
}

function mallet() {
  const g = new THREE.Group();
  g.add(P.cyl(0.012, 0.012, 0.22, "#c9a46a", 6));
  const head = P.cyl(0.035, 0.035, 0.1, "#b08a62", 8);
  head.rotation.z = Math.PI / 2;
  head.position.y = 0.24;
  g.add(head);
  return g;
}

export function marylandScene(): Scene {
  const plate = new THREE.Vector3(0, TABLE.h, -0.2);
  const seats = around(plate.x, plate.z, 0.88, [-1.6, -0.55, 0.55, 1.6, Math.PI]);
  return {
    slots: 5,
    async build(kit) {
      const table = await kit.prop("table_round_A", { w: 1.35, h: TABLE.h });
      kit.place(table, plate.x, plate.z);
      kit.block(plate.x, plate.z, 0.68);
      const paper = new THREE.Mesh(new THREE.CircleGeometry(0.66, 24), P.mat("#b89a6a"));
      paper.rotation.x = -Math.PI / 2;
      kit.place(paper, plate.x, plate.z, { y: plate.y + 0.012 });
      for (let i = 0; i < 9; i++) {
        kit.place(crab(), plate.x + rand(-0.22, 0.22), plate.z + rand(-0.22, 0.22), { y: plate.y + 0.05 + (i > 5 ? 0.06 : 0), yaw: rand(0, 6) });
      }
      for (const s of seats) {
        const chair = await kit.prop("chair_A", CHAIR);
        kit.place(chair, s.x - Math.sin(s.yaw!) * 0.12, s.z - Math.cos(s.yaw!) * 0.12, { yaw: s.yaw! });
      }
      kit.place(P.tree("round", "#5f8a4a"), -2.0, -1.4, { scale: 0.8 });
      kit.place(P.tree("round", "#6a9a52"), 2.0, -1.2, { scale: 0.7 });
    },
    spot: (i) => seats[i % seats.length],
    async role(actor, _slot, kit, clock) {
      await beat(clock, 0.1, 0.4);
      await actor.once(clock, "Sit_Chair_Down", "Sit_Chair_Idle");
      const m = mallet();
      actor.hold(m);
      for (;;) {
        await beat(clock, 0.6, 1.6);
        // Whack, whack. A puff of Old Bay.
        await actor.gesture(clock, "1H_Melee_Attack_Chop", "armR", { hold: 0.05, speed: 1.5 });
        if (chance(0.3)) {
          const at = actor.root.position.clone().lerp(plate, 0.4);
          kit.fx.emit({ at: { x: at.x, y: plate.y + 0.1, z: at.z }, vel: { x: rand(-0.3, 0.3), y: 0.6, z: rand(-0.3, 0.3) }, life: 0.8, size: 0.12, endSize: 0.02, color: "#c2873a" });
        }
        if (chance(0.15)) {
          actor.bounce(0.6);
          await actor.gesture(clock, "Cheer", "armL", { hold: 0.4 });
        }
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Massachusetts: the Boston Tea Party. Crates of tea, heaved off the dock.

function teaCrate() {
  const g = new THREE.Group();
  g.add(P.box(0.32, 0.26, 0.26, "#9a7550"));
  for (const y of [0.03, 0.23]) {
    const slat = P.box(0.33, 0.03, 0.27, "#7a5c3c");
    slat.position.y = y;
    g.add(slat);
  }
  const label = P.box(0.16, 0.1, 0.005, "#e9e0c8");
  label.position.set(0, 0.13, 0.132);
  g.add(label);
  return g;
}

export function massachusettsScene(): Scene {
  let sea: ReturnType<typeof P.waves>;
  const floating: { o: THREE.Object3D; t: number }[] = [];
  let kitRef: StageKit | null = null;
  return {
    slots: 5,
    build(kit) {
      kitRef = kit;
      sea = P.waves(4.8, 1.6);
      kit.place(sea.object, 0, -1.4, { y: 0.04 });
      const dock = new THREE.Group();
      for (let i = 0; i < 22; i++) {
        const plank = P.box(0.2, 0.06, 1.4, i % 2 ? "#9a7c58" : "#8a6c4a");
        plank.position.x = -2.1 + i * 0.2;
        dock.add(plank);
      }
      kit.place(dock, 0, 0.4, { y: 0.12 });
      // The ship's side behind, with a mast.
      const ship = new THREE.Group();
      ship.add(P.box(3.2, 0.5, 0.4, "#5b4030"));
      const rail = P.box(3.2, 0.06, 0.42, "#7a5c3c");
      rail.position.y = 0.5;
      const mast = P.cyl(0.04, 0.05, 2.0, "#6b4b33", 8);
      mast.position.set(0.6, 0.5, 0);
      const yard = P.box(1.1, 0.04, 0.04, "#6b4b33");
      yard.position.set(0.6, 1.9, 0);
      ship.add(rail, mast, yard);
      kit.place(ship, 0.2, -1.6, { y: 0.02 });
      for (const [x, z] of [[-1.7, 0.2], [-1.4, 0.55], [1.6, 0.3], [1.8, 0.7], [1.5, 0.75]] as const) kit.place(teaCrate(), x, z, { y: 0.15, yaw: rand(-0.4, 0.4) });
    },
    spot: (i, n) => {
      const s = row(i, n, 0.75, 0.35);
      return { ...s, yaw: Math.PI * 0.85 };
    },
    async role(actor, _slot, kit, clock) {
      actor.root.position.y = 0.15;
      for (;;) {
        await beat(clock, 1, 2.2);
        const crate = teaCrate();
        crate.scale.setScalar(0.8);
        actor.hold(crate, "head");
        await actor.gesture(clock, "Spellcast_Raise", "arms", { hold: 0.4 });
        actor.drop(crate);
        await actor.once(clock, "Throw", "Idle");
        // Splash! It bobs in the harbor a while.
        const at = actor.root.position;
        const floater = teaCrate();
        floater.scale.setScalar(0.8);
        kit.place(floater, at.x + rand(-0.2, 0.2), -1.0 + rand(-0.15, 0.1), { y: 0.05, yaw: rand(0, 6) });
        floating.push({ o: floater, t: 0 });
        kit.fx.emit({ at: { x: at.x, y: 0.15, z: -1.0 }, vel: { x: 0, y: 1.2, z: 0 }, life: 0.6, size: 0.25, endSize: 0.05, color: "#e6f2f4", gravity: -3 });
        kit.fx.sparkle({ x: at.x, y: 0.3, z: -1.0 }, "#e6f2f4", 0.4);
        actor.bounce(0.7);
        if (chance(0.3)) await waveOfJoy(kit, clock);
      }
    },
    tick(dt, t) {
      sea?.roll(t);
      for (let i = floating.length - 1; i >= 0; i--) {
        const f = floating[i];
        f.t += dt;
        f.o.position.y = 0.06 + Math.sin(t * 2 + i) * 0.04 - Math.max(0, f.t - 6) * 0.1;
        f.o.rotation.z = Math.sin(t * 1.5 + i) * 0.15;
        if (f.t > 9) {
          f.o.removeFromParent();
          floating.splice(i, 1);
        }
      }
      void kitRef;
    },
  };
}

// ---------------------------------------------------------------------------
// Minnesota: ice fishing on a frozen lake, a little red shack, a fish now and then.

function fish(color = "#8a9a7a") {
  const g = new THREE.Group();
  const body = P.ball(0.06, color, { detail: 2 });
  body.scale.set(0.6, 0.9, 2);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.08, 4), P.mat(color));
  tail.rotation.x = -Math.PI / 2;
  tail.position.z = -0.15;
  tail.scale.x = 0.3;
  g.add(body, tail);
  return g;
}

function rod() {
  const g = new THREE.Group();
  const pole = P.cyl(0.008, 0.012, 0.9, "#3a3f45", 6);
  g.add(pole);
  return g;
}

export function minnesotaScene(): Scene {
  const holes = [[-1.1, 0.2], [-0.35, 0.6], [0.4, 0.55], [1.15, 0.15], [0.3, -0.35]] as const;
  return {
    slots: 5,
    build(kit) {
      ground(kit, "#dbe8ee", 2.3, 0.8, 0);
      for (const [x, z] of holes) {
        const hole = new THREE.Mesh(new THREE.CircleGeometry(0.13, 16), P.mat("#2f4a5a"));
        hole.rotation.x = -Math.PI / 2;
        kit.place(hole, x, z + 0.3, { y: 0.045 });
      }
      // The shack.
      const shack = new THREE.Group();
      shack.add(P.box(0.8, 0.7, 0.7, "#a5483c"));
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.6, 0.3, 4), P.mat("#5b6066"));
      roof.rotation.y = Math.PI / 4;
      roof.position.y = 0.85;
      roof.scale.set(1, 1, 0.9);
      const door = P.box(0.22, 0.42, 0.01, "#6b4b33");
      door.position.set(0.1, 0, 0.355);
      const chimney = P.cyl(0.04, 0.04, 0.3, "#3a3f45", 6);
      chimney.position.set(-0.2, 0.8, -0.1);
      shack.add(roof, door, chimney);
      kit.place(shack, -1.4, -1.2, { yaw: 0.3 });
      kit.block(-1.4, -1.2, 0.55);
      kit.place(snowyPine(0.9), 1.9, -1.3);
      kit.place(snowyPine(0.75), 2.1, -0.6);
    },
    spot: (i) => ({ x: holes[i % holes.length][0], z: holes[i % holes.length][1], yaw: 0 }),
    async role(actor, slot, kit, clock) {
      await actor.once(clock, "Sit_Floor_Down", "Sit_Floor_Idle");
      const r = rod();
      actor.hold(r);
      for (;;) {
        await beat(clock, 1.5, 4);
        if (chance(0.3)) {
          // A bite! Reel it up and hold it high.
          await actor.gesture(clock, "Spellcast_Raise", "armR", { hold: 0.2, speed: 1.4 });
          const f = fish(pick(["#8a9a7a", "#b0a070", "#7a8a9a"]));
          actor.hold(f, "left");
          actor.bounce(0.8);
          await actor.gesture(clock, "Cheer", "armL", { hold: 0.8 });
          actor.drop(f);
          if (slot === 0) await waveOfJoy(kit, clock);
        } else {
          await actor.gesture(clock, "Interact", "armR", { hold: 0.2 });
        }
      }
    },
    async ambient(kit, clock) {
      for (;;) {
        await clock.wait(0.15);
        kit.fx.emit({ at: { x: rand(-2.2, 2.2), y: 2.6, z: rand(-1.8, 1.2) }, vel: { x: 0.02, y: -0.4, z: 0 }, life: 6, size: 0.05, color: "#ffffff", wobble: 0.4 });
        if (chance(0.15)) kit.fx.smoke({ x: -1.6, y: 1.15, z: -1.25 }, { size: 0.15, rise: 0.4 });
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Mississippi: a paddlewheel riverboat churning up the river.

function riverboat() {
  const g = new THREE.Group();
  const hull = P.box(2.0, 0.22, 0.75, "#eef0f2");
  const deck1 = P.box(1.6, 0.36, 0.62, "#f6f3ee");
  deck1.position.y = 0.22;
  const deck2 = P.box(1.1, 0.3, 0.5, "#f6f3ee");
  deck2.position.set(0.1, 0.58, 0);
  const trim = P.box(1.62, 0.04, 0.64, "#a5483c");
  trim.position.y = 0.56;
  g.add(hull, deck1, deck2, trim);
  for (const z of [-0.15, 0.15]) {
    const stack = P.cyl(0.05, 0.06, 0.65, "#2e3236", 8);
    stack.position.set(0.55, 0.88, z);
    const crown = P.cyl(0.08, 0.05, 0.08, "#2e3236", 8);
    crown.position.set(0.55, 1.5, z);
    g.add(stack, crown);
  }
  const wheel = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 6, 20), P.mat("#a5483c"));
  rim.rotation.y = Math.PI / 2;
  wheel.add(rim);
  for (let i = 0; i < 8; i++) {
    const paddle = P.box(0.6, 0.26, 0.02, "#a5483c");
    paddle.position.y = -0.13;
    const arm = new THREE.Group();
    arm.add(paddle);
    arm.rotation.x = (i / 8) * Math.PI * 2;
    wheel.add(arm);
  }
  wheel.rotation.y = Math.PI / 2;
  wheel.position.set(-1.15, 0.25, 0);
  g.add(wheel);
  return { object: g, wheel };
}

export function mississippiScene(): Scene {
  let sea: ReturnType<typeof P.waves>;
  let boat: ReturnType<typeof riverboat>;
  const deckers = new Map<Actor, number>();
  let x = -2;
  return {
    slots: 5,
    build(kit) {
      sea = P.waves(4.8, 1.5);
      kit.place(sea.object, 0, -0.75, { y: 0.03 });
      const bank = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.05, 0.9), P.mat("#8aa66a"));
      bank.position.set(0, 0.025, 0.7);
      bank.receiveShadow = true;
      kit.floor.add(bank);
      kit.place(P.tree("round", "#5f8a4a"), -2.0, 0.9, { scale: 0.7 });
      // Spanish moss on an old oak.
      const oak = P.tree("round", "#5a7a48");
      kit.place(oak, 2.0, 0.85, { scale: 0.9 });
      boat = riverboat();
      boat.object.scale.setScalar(0.95);
      kit.floor.add(boat.object);
    },
    spot: (i) => (i < 2 ? { x: 0, z: 0, yaw: 0 } : { x: -0.9 + (i - 2) * 0.9, z: 0.75, yaw: Math.PI }),
    async role(actor, slot, _kit, clock) {
      if (slot < 2) {
        deckers.set(actor, slot);
        try {
          for (;;) {
            await beat(clock, 1.5, 3);
            await actor.gesture(clock, "Cheer", "armR", { hold: 0.6 });
          }
        } finally {
          deckers.delete(actor);
        }
      }
      for (;;) {
        await beat(clock, 1, 2.5);
        actor.faceToward(boat.object.position.x, boat.object.position.z);
        actor.bounce(0.4);
        await actor.gesture(clock, "Cheer", "armR", { hold: 0.5 });
      }
    },
    async ambient(kit, clock) {
      for (;;) {
        await clock.wait(0.12);
        const p = boat.object.position;
        kit.fx.smoke({ x: p.x + 0.52, y: 1.55, z: p.z }, { size: 0.16, rise: 0.5, color: "#bdb5ad" });
      }
    },
    tick(dt, t) {
      sea?.roll(t);
      if (!boat) return;
      x += dt * 0.25;
      if (x > 2.6) x = -2.6;
      boat.object.position.set(x, 0.06 + Math.sin(t * 1.5) * 0.02, -0.8);
      boat.wheel.rotation.x -= dt * 2.5;
      boat.object.updateMatrix();
      for (const [actor, i] of deckers) {
        actor.root.position.copy(new THREE.Vector3(-0.3 + i * 0.4, 0.4, 0.22).applyMatrix4(boat.object.matrix));
        actor.root.rotation.y = 0;
        actor.yawTarget = null;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Missouri: barbecue under the Gateway Arch.

function gatewayArch() {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 30; i++) {
    const x = -1 + (i / 30) * 2;
    pts.push(new THREE.Vector3(x * 1.1, 2.6 - 1.5 * (Math.cosh(x * 1.3) - 1) / (Math.cosh(1.3) - 1) * 1.73, 0));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const geo = new THREE.TubeGeometry(curve, 60, 0.07, 3, false);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: "#d3d9dd", metalness: 0.4, roughness: 0.22 }));
  m.castShadow = true;
  return m;
}

export function missouriScene(): Scene {
  let pit: ReturnType<typeof P.smoker>;
  return {
    slots: 5,
    build(kit) {
      kit.place(gatewayArch(), 0, -1.7, { scale: 0.85 });
      const river = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.03, 0.35), P.mat("#5a7f8f"));
      river.position.set(0, 0.02, -1.95);
      kit.floor.add(river);
      pit = P.smoker();
      kit.place(pit.object, 0.4, -0.35, { yaw: -0.2 });
      kit.block(0.4, -0.35, 0.7);
      kit.place(P.tree("round", "#5f8a4a"), -2.0, -0.6, { scale: 0.8 });
      kit.place(P.tree("round", "#6a9a52"), 2.0, 0.6, { scale: 0.7 });
    },
    spot: (i) => [
      { x: -0.5, z: -0.3, yaw: Math.PI / 2 },
      { x: -0.6, z: 0.6, yaw: 0.6 },
      { x: 0.4, z: 0.7, yaw: 0 },
      { x: 1.3, z: 0.4, yaw: -0.7 },
      { x: 1.4, z: -0.4, yaw: -1.5 },
    ][i % 5],
    async role(actor, slot, kit, clock) {
      if (slot === 0) {
        for (;;) {
          await beat(clock, 1.2, 2.4);
          await actor.once(clock, "Interact", "Idle");
          for (let i = 0; i < 6; i++) kit.fx.smoke({ x: 0.4, y: 1.1, z: -0.35 }, { color: "#cfcac4", size: 0.3, rise: 0.8 });
          actor.bounce(0.5);
        }
      }
      const rib = await kit.prop("food_ingredient_steak", { w: 0.22 });
      actor.hold(rib);
      actor.lookAt(chance(0.5) ? kit.toWorld(0, 2.0, -1.7) : null);
      for (;;) {
        await beat(clock, 1.5, 3);
        await actor.gesture(clock, "Spellcast_Raise", "armR", { hold: 0.4 });
        if (chance(0.3)) {
          actor.bounce(0.6);
          await actor.gesture(clock, "Cheer", "armL", { hold: 0.3 });
        }
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Montana: fly fishing in a mountain river under the big sky.

function mountains() {
  const g = new THREE.Group();
  for (const [x, h, r] of [[-1.8, 1.6, 0.9], [-0.6, 2.1, 1.1], [0.8, 1.8, 1.0], [1.9, 1.4, 0.8]] as const) {
    const peak = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), P.mat("#7d8a8f"));
    peak.position.set(x, h / 2, 0);
    const snow = new THREE.Mesh(new THREE.ConeGeometry(r * 0.35, h * 0.35, 6), P.mat("#f4f6f7"));
    snow.position.set(x, h * 0.83, 0);
    g.add(peak, snow);
  }
  return g;
}

export function montanaScene(): Scene {
  let sea: ReturnType<typeof P.waves>;
  return {
    slots: 4,
    build(kit) {
      kit.place(mountains(), 0, -2.1);
      sea = P.waves(4.8, 1.0);
      kit.place(sea.object, 0, 0.0, { y: 0.0 });
      for (const [x, z, s] of [[-2.0, -1.0, 1.0], [-1.5, -1.3, 0.8], [1.8, -1.1, 0.9], [2.1, 1.0, 0.7]] as const) kit.place(P.tree("pine", "#2f6b4a"), x, z, { scale: s });
      for (let i = 0; i < 6; i++) {
        const rock = P.ball(rand(0.08, 0.15), "#8d8a83");
        rock.scale.y = 0.6;
        kit.place(rock, rand(-2, 2), rand(-0.4, 0.4), { y: 0.05 });
      }
    },
    spot: (i) => ({ x: -1.35 + i * 0.9, z: 0.05 + (i % 2) * 0.15, yaw: Math.PI * 0.85 }),
    async role(actor, _slot, kit, clock) {
      actor.root.position.y = -0.08;
      const r = rod();
      actor.hold(r);
      for (;;) {
        // Back-cast and forward: the line flicks out over the water.
        await actor.gesture(clock, "Spellcast_Shoot", "armR", { hold: 0.15, speed: 1.1 });
        const at = actor.root.position;
        kit.fx.sparkle({ x: at.x + rand(-0.3, 0.3), y: 0.1, z: at.z - 0.6 }, "#e6f2f4", 0.2);
        await beat(clock, 1, 2.2);
        if (chance(0.25)) {
          // A trout leaps, and it's on the line.
          const f = fish("#a07a6a");
          kit.floor.add(f);
          for (let t = 0; t <= 1 && clock.alive; t += 1 / 20) {
            await clock.wait(1 / 30);
            f.position.set(at.x + 0.2, 0.1 + Math.sin(t * Math.PI) * 0.5, at.z - 0.7 + t * 0.3);
            f.rotation.x = -1.2 + t * 2.4;
          }
          f.removeFromParent();
          const caught = fish("#a07a6a");
          actor.hold(caught, "left");
          actor.bounce(0.9);
          await actor.gesture(clock, "Cheer", "armL", { hold: 0.8 });
          actor.drop(caught);
        }
      }
    },
    tick: (_dt, t) => sea?.roll(t),
  };
}

// ---------------------------------------------------------------------------
// Nebraska: a covered wagon rolling past Chimney Rock, the family walking alongside.

function wagon() {
  const g = new THREE.Group();
  const bed = P.box(0.6, 0.22, 1.1, "#8a6a4a");
  bed.position.y = 0.3;
  g.add(bed);
  const cover = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.0, 16, 1, true, -Math.PI / 2, Math.PI), P.mat("#efe9dc"));
  (cover.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  cover.rotation.x = Math.PI / 2;
  cover.position.y = 0.52;
  g.add(cover);
  const wheels: THREE.Object3D[] = [];
  for (const [x, z, r] of [[-0.34, 0.38, 0.22], [0.34, 0.38, 0.22], [-0.34, -0.38, 0.26], [0.34, -0.38, 0.26]] as const) {
    const w = new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 6, 16), P.mat("#5b4030"));
    w.rotation.y = Math.PI / 2;
    w.position.set(x, r, z);
    for (let i = 0; i < 4; i++) {
      const spoke = P.box(0.015, r * 2, 0.015, "#5b4030");
      spoke.position.y = -r;
      spoke.rotation.x = 0;
      const arm = new THREE.Group();
      arm.add(spoke);
      arm.rotation.z = (i / 4) * Math.PI;
      w.add(arm);
    }
    g.add(w);
    wheels.push(w);
  }
  const tongue = P.box(0.04, 0.04, 0.6, "#6b4b33");
  tongue.position.set(0, 0.22, 0.85);
  g.add(tongue);
  return { object: g, wheels };
}

function chimneyRock() {
  const g = new THREE.Group();
  // A broad eroded mound with a tall thin column on top.
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.95, 0.55, 12), P.mat("#c2a07a"));
  base.position.y = 0.27;
  const spire = P.cyl(0.08, 0.13, 1.25, "#b8956e", 8);
  spire.position.y = 0.55;
  const cap = P.ball(0.1, "#a8855e");
  cap.scale.y = 0.6;
  cap.position.y = 1.8;
  g.add(cap);
  g.add(base, spire);
  return g;
}

export function nebraskaScene(): Scene {
  let w: ReturnType<typeof wagon>;
  let phase = 0;
  const path = (ph: number) => ({ x: Math.sin(ph) * 1.5, z: Math.cos(ph) * 0.75 + 0.05 });
  return {
    slots: 4,
    build(kit) {
      ground(kit, "#c9b88a", 2.3, 0.8, 0);
      kit.place(chimneyRock(), 0.9, -1.8, { scale: 1.1 });
      kit.place(P.tufts(30, 2.2, ["#a8b25a", "#c9a46a"]), 0, 0);
      w = wagon();
      w.object.scale.setScalar(1.15);
      kit.floor.add(w.object);
    },
    spot: (i) => {
      const p = path(-0.5 - i * 0.35);
      return { x: p.x, z: p.z, yaw: 0 };
    },
    async role(actor, slot, _kit, clock) {
      // Walking behind the wagon, each a few steps back, keeping pace.
      actor.play("Walking_A", { speed: 0.8 });
      for (;;) {
        await clock.wait(1 / 30);
        const ph = phase - 0.55 - slot * 0.32;
        const p = path(ph);
        const q = path(ph + 0.05);
        actor.root.position.set(p.x, 0, p.z);
        actor.faceToward(q.x, q.z);
        if (chance(0.003)) {
          actor.bounce(0.6);
          void actor.gesture(clock, "Cheer", "armR", { hold: 0.3 }).catch(() => {});
        }
      }
    },
    tick(dt) {
      if (!w) return;
      phase += dt * 0.32;
      const p = path(phase);
      const q = path(phase + 0.05);
      w.object.position.set(p.x, Math.abs(Math.sin(phase * 30)) * 0.01, p.z);
      w.object.rotation.y = Math.atan2(q.x - p.x, q.z - p.z);
      w.wheels.forEach((wh) => (wh.rotation.x += dt * 3));
    },
  };
}

// ---------------------------------------------------------------------------
// New Hampshire: fall colors. Leaves drifting down, and a pile to leap into.

export function newHampshireScene(): Scene {
  const pile = new THREE.Vector3(0.2, 0, 0.2);
  return {
    slots: 5,
    build(kit) {
      ground(kit, "#9a8a5a", 2.2, 0.8, 0);
      const colors = ["#c2573a", "#d98a3a", "#e3b64a", "#a5483c", "#c9883a"];
      for (const [x, z, s] of [[-2.0, -1.2, 1.1], [-1.2, -1.6, 0.95], [-0.2, -1.8, 1.0], [0.9, -1.6, 1.05], [1.9, -1.2, 0.95], [2.1, 0.2, 0.8], [-2.1, 0.3, 0.85]] as const) {
        const t = P.tree("round", pick(colors));
        kit.place(t, x, z, { scale: s });
      }
      const heap = P.ball(0.5, "#c9783a", { detail: 2 });
      heap.scale.set(1.2, 0.45, 1);
      kit.place(heap, pile.x, pile.z, { y: 0.02 });
      for (let i = 0; i < 30; i++) {
        const leaf = P.box(0.06, 0.01, 0.05, pick(colors));
        kit.place(leaf, rand(-2, 2), rand(-1.2, 1.1), { y: 0.03, yaw: rand(0, 6) });
      }
    },
    spot: (i, n) => ring(i, n, 1.15, pile.x, pile.z),
    async role(actor, slot, kit, clock) {
      for (;;) {
        await beat(clock, 1.5, 3.5);
        if (chance(0.35)) {
          // Run, jump, land in the pile in a burst of leaves, climb out and go back.
          const home = actor.root.position.clone();
          actor.faceToward(pile.x, pile.z);
          await actor.once(clock, "Jump_Full_Short", "Idle");
          await actor.walkTo(clock, pile.x + (home.x - pile.x) * 0.25, pile.z + (home.z - pile.z) * 0.25, { run: true });
          kit.fx.confetti({ x: pile.x, y: 0.3, z: pile.z }, ["#c2573a", "#d98a3a", "#e3b64a", "#a5483c"], 26);
          actor.bounce(1);
          await actor.gesture(clock, "Cheer", "arms", { hold: 0.5 });
          await actor.walkTo(clock, home.x, home.z);
          actor.faceToward(pile.x, pile.z);
        } else {
          actor.lookAt(kit.toWorld(rand(-1.5, 1.5), 2, -1.5));
          await clock.wait(1);
          actor.lookAt(null);
          if (slot % 2) actor.bounce(0.3);
        }
      }
    },
    async ambient(kit, clock) {
      for (;;) {
        await clock.wait(0.12);
        kit.fx.emit({ at: { x: rand(-2.2, 2.2), y: 2.2, z: rand(-1.8, 0.4) }, vel: { x: rand(-0.1, 0.1), y: -0.35, z: 0.05 }, life: 6, size: 0.08, color: pick(["#c2573a", "#d98a3a", "#e3b64a"]), solid: true, wobble: 0.8 });
      }
    },
  };
}

// ---------------------------------------------------------------------------
// New Jersey: the boardwalk. Arcade booths, saltwater taffy, a Ferris wheel turning.

function ferrisWheel() {
  const g = new THREE.Group();
  const wheel = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.025, 6, 40), P.mat("#e9e6e0"));
  wheel.add(rim);
  const cars: THREE.Object3D[] = [];
  const colors = ["#a5483c", "#46658a", "#c2a052", "#6d7b48", "#6a5076", "#2f6b6e"];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const spoke = P.box(0.02, 0.9, 0.02, "#e9e6e0");
    spoke.position.y = 0;
    const arm = new THREE.Group();
    spoke.position.y = 0.45 - 0.45;
    arm.add(spoke);
    arm.rotation.z = a;
    wheel.add(arm);
    const car = P.box(0.18, 0.16, 0.16, colors[i % colors.length]);
    car.position.set(Math.cos(a) * 0.9, Math.sin(a) * 0.9 - 0.12, 0);
    wheel.add(car);
    cars.push(car);
  }
  wheel.position.y = 1.15;
  for (const s of [-1, 1]) {
    const leg = P.box(0.05, 1.25, 0.05, "#c9cdd0");
    leg.position.set(s * 0.35, 0, 0);
    leg.rotation.z = s * 0.28;
    g.add(leg);
  }
  g.add(wheel);
  return { object: g, wheel, cars };
}

function booth(color: string) {
  const g = new THREE.Group();
  g.add(P.box(0.7, 0.75, 0.45, "#f3f0ea"));
  const counter = P.box(0.72, 0.08, 0.5, color);
  counter.position.y = 0.4;
  const awning = P.box(0.78, 0.04, 0.55, color);
  awning.position.set(0, 1.05, 0.05);
  awning.rotation.x = 0.25;
  for (const x of [-0.33, 0.33]) {
    const post = P.box(0.03, 0.3, 0.03, color);
    post.position.set(x, 0.75, 0.24);
    g.add(post);
  }
  const lights: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const b = P.ball(0.025, "#fff2b0", { emissive: "#ffe08a" });
    b.position.set(-0.3 + i * 0.12, 1.0, 0.3);
    g.add(b);
    lights.push(b);
  }
  g.add(counter, awning);
  return { object: g, lights };
}

function taffy(color: string) {
  const g = new THREE.Group();
  const candy = P.cyl(0.03, 0.03, 0.08, color, 8);
  candy.rotation.z = Math.PI / 2;
  candy.position.y = 0.03;
  g.add(candy);
  for (const s of [-1, 1]) {
    const twist = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.04, 6), P.mat("#f3f0ea"));
    twist.rotation.z = (s * Math.PI) / 2;
    twist.position.set(s * 0.06, 0.03, 0);
    g.add(twist);
  }
  return g;
}

export function newJerseyScene(): Scene {
  let wheel: ReturnType<typeof ferrisWheel>;
  const bulbs: THREE.Mesh[] = [];
  return {
    slots: 5,
    build(kit) {
      const boards = new THREE.Group();
      for (let i = 0; i < 24; i++) {
        const plank = P.box(0.18, 0.04, 2.6, i % 2 ? "#a88a64" : "#9a7c58");
        plank.position.x = -2.2 + i * 0.19;
        boards.add(plank);
      }
      kit.place(boards, 0, -0.1);
      wheel = ferrisWheel();
      kit.place(wheel.object, 1.4, -1.55);
      ["#a5483c", "#46658a", "#c2a052"].forEach((c, i) => {
        const b = booth(c);
        kit.place(b.object, -1.75 + i * 0.8, -1.2);
        kit.block(-1.75 + i * 0.8, -1.2, 0.35);
        bulbs.push(...b.lights);
      });
    },
    spot: (i, n) => row(i, n, 0.8, 0.35),
    async role(actor, slot, kit, clock) {
      actor.root.position.y = 0.04;
      const t = taffy(pick(["#e09aa8", "#a8c8e0", "#e8d48a", "#b0d8a0"]));
      actor.hold(t, "left");
      for (;;) {
        await beat(clock, 1.2, 2.5);
        if (chance(0.35)) {
          // Off to the booth to try their luck; win or lose, back again.
          const home = actor.root.position.clone();
          const bx = -1.75 + (slot % 3) * 0.8;
          await actor.walkTo(clock, bx, -0.7);
          actor.face(Math.PI);
          await actor.once(clock, "Throw", "Idle");
          if (chance(0.5)) {
            actor.bounce(1);
            kit.fx.confetti({ x: bx, y: 1.2, z: -0.8 }, ["#a5483c", "#e7c46a", "#46658a"], 18);
            await actor.gesture(clock, "Cheer", "arms", { hold: 0.5 });
          }
          await actor.walkTo(clock, home.x, home.z);
          actor.face(0);
        } else {
          await actor.gesture(clock, "Use_Item", "armL", { hold: 0.4 });
          actor.bounce(0.4);
        }
      }
    },
    tick(dt, t) {
      if (!wheel) return;
      wheel.wheel.rotation.z += dt * 0.25;
      wheel.cars.forEach((c) => (c.rotation.z = -wheel.wheel.rotation.z));
      bulbs.forEach((b, i) => ((b.material as THREE.MeshStandardMaterial).emissiveIntensity = Math.floor(t * 4 + i) % 2 ? 1.2 : 0.2));
    },
  };
}

// ---------------------------------------------------------------------------
// North Carolina: Kitty Hawk. The Wright Flyer hops over the dunes, everyone running after it.

function flyer() {
  const g = new THREE.Group();
  const cloth = "#efe6d2";
  const strut = "#8a6a4a";
  for (const y of [0.25, 0.75]) {
    const wing = P.box(2.0, 0.025, 0.4, cloth);
    wing.position.y = y;
    g.add(wing);
  }
  for (let i = 0; i < 6; i++) {
    for (const z of [-0.18, 0.18]) {
      const post = P.box(0.015, 0.5, 0.015, strut);
      post.position.set(-0.95 + i * 0.38, 0.25, z);
      g.add(post);
    }
  }
  const elevator = P.box(0.7, 0.02, 0.22, cloth);
  elevator.position.set(0, 0.55, 0.95);
  const rudder = P.box(0.02, 0.4, 0.2, cloth);
  rudder.position.set(0, 0.3, -0.95);
  const boom = P.box(0.02, 0.02, 1.9, strut);
  boom.position.set(0, 0.45, 0);
  g.add(elevator, rudder, boom);
  const props: THREE.Object3D[] = [];
  for (const x of [-0.35, 0.35]) {
    const prop = new THREE.Group();
    const blade = P.box(0.03, 0.4, 0.01, strut);
    blade.position.y = -0.2;
    prop.add(blade);
    prop.position.set(x, 0.5, -0.25);
    g.add(prop);
    props.push(prop);
  }
  return { object: g, props };
}

export function northCarolinaScene(): Scene {
  let plane: ReturnType<typeof flyer>;
  let pilot: Actor | null = null;
  let hop = 0;
  const path = (u: number) => ({ x: -1.9 + u * 3.8, y: Math.sin(u * Math.PI) * 0.9, z: -0.9 });
  return {
    slots: 5,
    build(kit) {
      ground(kit, "#e6d3a6", 2.3, 0.8, 0);
      for (const [x, z, s] of [[-1.6, -1.4, 0.9], [0.4, -1.7, 1.2], [1.9, -1.1, 0.8], [-2.0, 0.7, 0.7], [1.8, 0.9, 0.6]] as const) {
        const dune = P.ball(0.6 * s, "#d9c08f", { detail: 2 });
        dune.scale.y = 0.35;
        kit.place(dune, x, z);
      }
      kit.place(P.tufts(20, 2.2, ["#a8b25a", "#c9b36a"]), 0, 0.2);
      plane = flyer();
      plane.object.scale.setScalar(0.8);
      kit.floor.add(plane.object);
    },
    spot: (i, n) => (i === 0 ? { x: 0, z: -0.9, yaw: Math.PI / 2 } : row(i - 1, Math.max(1, n - 1), 0.85, 0.55)),
    async role(actor, slot, kit, clock) {
      if (slot === 0) {
        pilot = actor;
        actor.play("Lie_Idle", { fade: 0 });
        try {
          for (;;) await clock.wait(1);
        } finally {
          pilot = null;
        }
      }
      for (;;) {
        await clock.wait(0.2);
        const p = plane.object.position;
        actor.lookAt(kit.toWorld(p.x, p.y + 0.6, p.z));
        if (p.y > 0.4 && chance(0.15)) {
          actor.bounce(0.9);
          await actor.gesture(clock, "Cheer", "arms", { hold: 0.4 });
        }
      }
    },
    tick(dt, t) {
      if (!plane) return;
      hop = (hop + dt * 0.12) % 1.3;
      const u = Math.min(1, hop);
      const p = path(u);
      plane.object.position.set(p.x, 0.05 + p.y, p.z);
      plane.object.rotation.set(Math.cos(u * Math.PI) * 0.15, Math.PI / 2, Math.sin(t * 2) * 0.05);
      plane.props.forEach((pr) => (pr.rotation.z += dt * 25));
      if (pilot) {
        plane.object.updateMatrix();
        pilot.root.position.copy(new THREE.Vector3(0, 0.3, 0.1).applyMatrix4(plane.object.matrix));
        pilot.root.rotation.y = Math.PI / 2;
        pilot.yawTarget = null;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// North Dakota: bison grazing on the prairie. Binoculars up, quiet now.

function bison() {
  const g = new THREE.Group();
  const brown = "#4a3426";
  const dark = "#2e2018";
  const body = P.ball(0.32, brown, { detail: 2 });
  body.scale.set(0.8, 0.8, 1.4);
  body.position.y = 0.55;
  const hump = P.ball(0.3, dark, { detail: 2 });
  hump.scale.set(0.85, 0.9, 0.8);
  hump.position.set(0, 0.72, 0.22);
  const head = P.ball(0.17, dark, { detail: 2 });
  head.scale.set(0.9, 1, 1.1);
  head.position.set(0, 0.5, 0.55);
  const beard = P.ball(0.09, dark);
  beard.scale.set(0.7, 1.2, 0.7);
  beard.position.set(0, 0.36, 0.6);
  g.add(body, hump, head, beard);
  for (const s of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.12, 6), P.mat("#d9cdb8"));
    horn.position.set(s * 0.15, 0.62, 0.55);
    horn.rotation.z = -s * 0.8;
    g.add(horn);
  }
  const legs: THREE.Object3D[] = [];
  for (const [x, z] of [[-0.13, 0.28], [0.13, 0.28], [-0.13, -0.28], [0.13, -0.28]] as const) {
    const leg = P.cyl(0.05, 0.04, 0.32, brown, 6);
    leg.position.set(x, 0.16, z);
    g.add(leg);
    legs.push(leg);
  }
  return { object: g, legs };
}

export function northDakotaScene(): Scene {
  const herd: { b: ReturnType<typeof bison>; x: number; z: number; dir: number; speed: number }[] = [];
  return {
    slots: 5,
    build(kit) {
      ground(kit, "#a8a86a", 2.3, 0.8, 0);
      kit.place(P.tufts(40, 2.2, ["#9aa05a", "#b8b06a", "#8a9a52"]), 0, 0);
      for (const [x, z, dir] of [[-1.5, -1.0, 1.2], [0.1, -1.5, -0.3], [1.6, -0.9, -1.9]] as const) {
        const b = bison();
        b.object.scale.setScalar(rand(1.4, 1.65));
        kit.place(b.object, x, z, { yaw: dir });
        herd.push({ b, x, z, dir, speed: rand(0.05, 0.1) });
      }
    },
    spot: (i, n) => row(i, n, 0.8, 0.75),
    async role(actor, slot, kit, clock) {
      const lookAtHerd = () => {
        const h = pick(herd);
        actor.lookAt(kit.toWorld(h.b.object.position.x, 0.6, h.b.object.position.z));
      };
      actor.face(Math.PI);
      lookAtHerd();
      for (;;) {
        await beat(clock, 1.5, 3);
        if (slot % 2) {
          const p = phone();
          actor.hold(p);
          await actor.gesture(clock, "Spellcast_Raise", "armR", { hold: 1.0 });
          actor.drop(p);
        } else {
          await actor.gesture(clock, "Spellcast_Raise", "arms", { hold: 1.0 });
        }
        lookAtHerd();
        if (chance(0.2)) actor.bounce(0.4);
      }
    },
    tick(dt, t) {
      for (const h of herd) {
        // Graze along slowly, turning now and then; head bobbing to the grass.
        h.dir += Math.sin(t * 0.2 + h.x) * dt * 0.2;
        h.x += Math.sin(h.dir) * h.speed * dt;
        h.z += Math.cos(h.dir) * h.speed * dt;
        if (Math.abs(h.x) > 1.9 || h.z > -0.3 || h.z < -1.7) h.dir += Math.PI * dt;
        h.b.object.position.set(h.x, 0, h.z);
        h.b.object.rotation.y = h.dir;
        h.b.legs.forEach((l, j) => (l.rotation.x = Math.sin(t * 3 + j * Math.PI) * 0.2));
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Ohio: a roller coaster. Up the lift hill, over the top, arms up all the way down.

export function ohioScene(): Scene {
  let curve: THREE.CatmullRomCurve3;
  const cars: THREE.Group[] = [];
  const riders = new Map<Actor, number>();
  let u = 0;
  let gap = 0.03;
  const level = new THREE.Quaternion();
  const UP = new THREE.Vector3(0, 1, 0);
  return {
    slots: 4,
    build(kit) {
      const pts = [
        [-1.9, 0.25, 0.5], [-1.9, 0.8, -0.5], [-1.3, 1.45, -1.3], [-0.4, 1.5, -1.5], [0.5, 0.35, -1.4], [1.4, 0.95, -1.1],
        [2.0, 0.5, -0.2], [1.6, 0.3, 0.7], [0.4, 0.65, 0.9], [-0.9, 0.25, 1.0],
      ].map(([x, y, z]) => new THREE.Vector3(x, y, z));
      curve = new THREE.CatmullRomCurve3(pts, true, "centripetal");
      const track = new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 0.05, 4, true), P.mat("#c2573a"));
      kit.floor.add(track);
      // Supports down to the ground.
      for (let i = 0; i < 28; i++) {
        const p = curve.getPointAt(i / 28);
        const post = P.box(0.03, p.y, 0.03, "#e9e6e0");
        kit.place(stand(post), p.x, p.z);
      }
      gap = 0.62 / curve.getLength();
      for (let i = 0; i < 4; i++) {
        const car = new THREE.Group();
        const color = i === 0 ? "#46658a" : "#c2a052";
        car.add(P.box(0.5, 0.08, 0.56, color));
        for (const s of [-1, 1]) {
          const side = P.box(0.05, 0.2, 0.56, color);
          side.position.set(s * 0.225, 0.1, 0);
          car.add(side);
        }
        const front = P.box(0.5, 0.26, 0.06, color);
        front.position.set(0, 0.13, 0.25);
        const bar = P.box(0.44, 0.03, 0.03, "#2e2a26");
        bar.position.set(0, 0.32, 0.12);
        car.add(front, bar);
        kit.floor.add(car);
        cars.push(car);
      }
    },
    spot: () => ({ x: 0, z: 0, yaw: 0 }),
    async role(actor, slot, _kit, clock) {
      riders.set(actor, slot);
      // A touch smaller on the ride so the cars still read under them.
      actor.root.scale.setScalar(actor.unitScale * 0.75);
      actor.play("Sit_Floor_Idle", { fade: 0 });
      try {
        for (;;) {
          await clock.wait(0.3);
          const p = cars[slot % cars.length].position;
          // Arms up on the way down.
          if (p.y < 1.1 && chance(0.4)) await actor.gesture(clock, "Cheer", "arms", { hold: 0.6 });
        }
      } finally {
        riders.delete(actor);
        actor.root.scale.setScalar(actor.unitScale);
      }
    },
    tick(dt) {
      if (!curve) return;
      // Slow up the lift hill, fast down the drops.
      const here = curve.getPointAt(u);
      const ahead = curve.getPointAt((u + 0.01) % 1);
      const climbing = ahead.y > here.y;
      u = (u + dt * (climbing ? 0.05 : 0.1)) % 1;
      cars.forEach((c, i) => {
        const v = (u - i * gap + 1) % 1;
        const p = curve.getPointAt(v);
        const q = curve.getPointAt((v + 0.005) % 1);
        c.position.copy(p).y += 0.05;
        c.lookAt(q.x, q.y + 0.05, q.z);
        c.updateMatrix();
      });
      for (const [actor, i] of riders) {
        const c = cars[i % cars.length];
        actor.root.position.copy(new THREE.Vector3(0, 0.06, -0.1).applyMatrix4(c.matrix));
        // Lean with the car, but only half as far, so nobody lies flat on the lift hill.
        const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(c.quaternion);
        level.setFromAxisAngle(UP, Math.atan2(fwd.x, fwd.z));
        actor.root.quaternion.copy(level).slerp(c.quaternion, 0.5);
        actor.yawTarget = null;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Oklahoma: storm chasers. A great dark thunderhead, lightning, and everyone pointing.

export function oklahomaScene(): Scene {
  let truck: ReturnType<typeof P.pickup>;
  const cloud = new THREE.Group();
  let bolt: THREE.Mesh | null = null;
  let flash: THREE.PointLight | null = null;
  const funnel = new THREE.Group();
  return {
    slots: 5,
    build(kit) {
      ground(kit, "#a89a6a", 2.3, 0.8, 0);
      kit.place(P.tufts(30, 2.2, ["#9a9a5a", "#b8a86a"]), 0, 0.3);
      for (let i = 0; i < 14; i++) {
        const puff = P.ball(rand(0.35, 0.6), pick(["#5b6066", "#6f747a", "#4a4f55"]), { detail: 2 });
        puff.position.set(rand(-1.8, 1.8), rand(0, 0.35), rand(-0.3, 0.3));
        puff.scale.y = 0.6;
        cloud.add(puff);
      }
      kit.place(cloud, 0, -1.9, { y: 2.0 });
      const pts: THREE.Vector3[] = [];
      let x = 0.4;
      for (let y = 2.0; y >= 0; y -= 0.25) {
        pts.push(new THREE.Vector3(x, y, -1.9));
        x += rand(-0.18, 0.18);
      }
      bolt = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0), 24, 0.025, 4), P.mat("#fff6c8", { emissive: "#fff2b0" }));
      bolt.visible = false;
      kit.floor.add(bolt);
      flash = new THREE.PointLight("#e8f0ff", 0, 6, 1.2);
      flash.position.set(0.3, 2.2, -1.5);
      kit.floor.add(flash);
      // A tornado dropping out of the cloud on the far side of the field.
      const twist = new THREE.Mesh(
        new THREE.LatheGeometry([[0.06, 0], [0.09, 0.4], [0.16, 0.9], [0.3, 1.4], [0.55, 1.85], [0.7, 2.0]].map(([r, y]) => new THREE.Vector2(r, y)), 20),
        new THREE.MeshStandardMaterial({ color: "#7d8086", roughness: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }),
      );
      funnel.add(twist);
      kit.place(funnel, 1.3, -2.0);
      truck = P.pickup("#46658a");
      kit.place(truck.object, -1.75, -0.5, { yaw: 1.1 });
      kit.block(-1.75, -0.5, 0.6);
    },
    spot: (i, n) => {
      const s = row(i, n, 0.7, 0.75);
      return { ...s, x: s.x + 0.35, yaw: Math.PI };
    },
    async role(actor, slot, kit, clock) {
      actor.lookAt(kit.toWorld(0.3, 1.8, -1.9));
      const cam = slot === 1 ? phone() : null;
      if (cam) actor.hold(cam);
      for (;;) {
        await beat(clock, 1, 2.5);
        if (cam) await actor.gesture(clock, "Spellcast_Raise", "armR", { hold: 1.2 });
        else if (chance(0.5)) await actor.gesture(clock, "Spellcast_Shoot", "armR", { hold: 0.6 });
        else actor.bounce(0.3);
      }
    },
    async ambient(kit, clock) {
      for (;;) {
        await beat(clock, 1.5, 3.5);
        if (!bolt || !flash) continue;
        bolt.position.x = rand(-1.2, 1.2);
        bolt.visible = true;
        flash.intensity = 6;
        await clock.wait(0.12);
        bolt.visible = false;
        flash.intensity = 0;
        await clock.wait(0.08);
        bolt.visible = true;
        flash.intensity = 4;
        await clock.wait(0.08);
        bolt.visible = false;
        flash.intensity = 0;
        for (const a of kit.cast) if (a && chance(0.6)) a.bounce(0.8);
      }
    },
    tick(dt, t) {
      cloud.rotation.y = Math.sin(t * 0.1) * 0.08;
      cloud.position.x = Math.sin(t * 0.15) * 0.3;
      funnel.rotation.y += dt * 4;
      funnel.position.x = 1.3 + Math.sin(t * 0.25) * 0.3;
      funnel.rotation.z = Math.sin(t * 0.7) * 0.06;
      void truck;
    },
  };
}

// ---------------------------------------------------------------------------
// Pennsylvania: the Liberty Bell, then the sweetest town: giant chocolate kisses.

function libertyBell() {
  const g = new THREE.Group();
  const bronze = new THREE.MeshStandardMaterial({ color: "#8a6a3a", metalness: 0.6, roughness: 0.35 });
  const bell = new THREE.Mesh(
    new THREE.LatheGeometry(
      [[0, 0.62], [0.12, 0.6], [0.16, 0.5], [0.18, 0.3], [0.24, 0.12], [0.3, 0.03], [0.31, 0.0], [0.28, 0.0]].map(([r, y]) => new THREE.Vector2(r, y)),
      32,
    ),
    bronze,
  );
  bronze.side = THREE.DoubleSide;
  bell.castShadow = true;
  const crack = P.box(0.012, 0.32, 0.01, "#2e2418");
  crack.position.set(0.05, 0.05, 0.22);
  crack.rotation.z = 0.15;
  bell.add(crack);
  bell.position.y = 0.55;
  const yoke = P.box(0.6, 0.1, 0.12, "#5b4030");
  yoke.position.y = 1.15;
  g.add(bell, yoke);
  for (const s of [-1, 1]) {
    const post = P.box(0.08, 1.2, 0.12, "#5b4030");
    post.position.x = s * 0.35;
    g.add(post);
  }
  return g;
}

function kiss(scale = 1) {
  const g = new THREE.Group();
  const foil = new THREE.Mesh(
    new THREE.LatheGeometry([[0, 0], [0.22, 0.02], [0.23, 0.08], [0.17, 0.2], [0.07, 0.34], [0.01, 0.42]].map(([r, y]) => new THREE.Vector2(r, y)), 24),
    new THREE.MeshStandardMaterial({ color: "#c9cdd0", metalness: 0.7, roughness: 0.25 }),
  );
  foil.castShadow = true;
  const plume = P.box(0.04, 0.14, 0.005, "#f3f0ea");
  plume.position.y = 0.48;
  g.add(foil, plume);
  g.scale.setScalar(scale);
  return g;
}

export function pennsylvaniaScene(): Scene {
  return {
    slots: 5,
    build(kit) {
      const plaza = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.03, 2.2), P.mat("#b8a48a"));
      plaza.position.set(0, 0.015, -0.3);
      kit.floor.add(plaza);
      kit.place(libertyBell(), -0.6, -1.15, { scale: 1.15 });
      kit.block(-0.6, -1.15, 0.5);
      // Independence Hall's tower behind.
      const hall = new THREE.Group();
      hall.add(P.box(1.4, 0.8, 0.5, "#a5574a"));
      const tower = P.box(0.4, 1.1, 0.4, "#a5574a");
      tower.position.y = 1.35;
      const steeple = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 8), P.mat("#e9e6e0"));
      steeple.position.y = 2.2;
      hall.add(tower, steeple);
      kit.place(hall, -0.6, -2.0);
      for (const [x, z, sc] of [[1.3, -1.2, 1.6], [1.9, -0.4, 1.2], [1.6, 0.6, 1.0]] as const) {
        kit.place(kiss(sc), x, z, { yaw: rand(0, 6) });
        kit.block(x, z, 0.35 * sc);
      }
    },
    spot: (i, n) => {
      const s = row(i, n, 0.7, 0.45);
      return { ...s, x: s.x - 0.4 };
    },
    async role(actor, slot, kit, clock) {
      for (;;) {
        await beat(clock, 1.2, 2.6);
        if (slot % 2 === 0) {
          // A look at the crack, a respectful nod.
          actor.faceToward(-0.6, -1.15);
          actor.lookAt(kit.toWorld(-0.6, 1.1, -1.15));
          await clock.wait(1.2);
          actor.lookAt(null);
          actor.face(0);
        } else {
          const k = kiss(0.3);
          actor.hold(k);
          await actor.gesture(clock, "Use_Item", "armR", { hold: 0.5 });
          actor.drop(k);
          actor.bounce(0.6);
        }
        if (chance(0.2)) await waveOfJoy(kit, clock);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Rhode Island: a sailboat regatta round the buoys.

export function rhodeIslandScene(): Scene {
  let sea: ReturnType<typeof P.waves>;
  const boats: { b: ReturnType<typeof sailboat>; phase: number; speed: number }[] = [];
  const crew = new Map<Actor, number>();
  const course = (ph: number) => ({ x: Math.sin(ph) * 1.55, z: Math.cos(ph) * 0.95 - 0.2 });
  return {
    slots: 4,
    build(kit) {
      sea = P.waves(4.8, 3.2);
      kit.place(sea.object, 0, 0, { y: 0.07 });
      for (const [x, z] of [[-1.55, -0.2], [1.55, -0.2], [0, -1.15], [0, 0.75]] as const) {
        const buoy = new THREE.Group();
        const b = P.cyl(0.07, 0.09, 0.22, "#c2573a", 10);
        const top = P.ball(0.05, "#f3f0ea");
        top.position.y = 0.26;
        buoy.add(b, top);
        kit.place(buoy, x * 0.55, z * 0.5 - 0.1, { y: 0.05 });
      }
      ["#a5483c", "#46658a", "#c2a052"].forEach((c, i) => {
        const b = sailboat(c);
        b.object.scale.setScalar(0.85);
        kit.floor.add(b.object);
        boats.push({ b, phase: i * 2.1, speed: 0.3 + i * 0.02 });
      });
    },
    spot: () => ({ x: 0, z: 0, yaw: 0 }),
    async role(actor, slot, _kit, clock) {
      crew.set(actor, slot);
      actor.play("Sit_Floor_Idle", { fade: 0 });
      try {
        for (;;) {
          await beat(clock, 1.5, 3);
          if (chance(0.5)) await actor.gesture(clock, "Cheer", "armR", { hold: 0.5 });
        }
      } finally {
        crew.delete(actor);
      }
    },
    tick(dt, t) {
      sea?.roll(t);
      for (const r of boats) {
        r.phase += dt * r.speed;
        const p = course(r.phase);
        const q = course(r.phase + 0.05);
        r.b.object.position.set(p.x, 0.06 + Math.sin(t * 1.6 + r.phase) * 0.03, p.z);
        r.b.object.rotation.set(0, Math.atan2(q.x - p.x, q.z - p.z), 0.12);
        r.b.sail.rotation.y = Math.PI / 2 + 0.3;
        r.b.object.updateMatrix();
      }
      for (const [actor, i] of crew) {
        const b = boats[i % boats.length].b.object;
        const seat = i < boats.length ? -0.3 : 0.15;
        actor.root.position.copy(new THREE.Vector3(0, 0.2, seat).applyMatrix4(b.matrix));
        actor.root.rotation.y = b.rotation.y + (i % 2 ? 1 : -1);
        actor.yawTarget = null;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// South Carolina: shag dancing on the beach. Partners step and twirl to the jukebox.

function jukebox() {
  const g = new THREE.Group();
  g.add(P.box(0.5, 0.75, 0.32, "#7a4f36"));
  const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.32, 24), P.mat("#a5483c"));
  arch.rotation.x = Math.PI / 2;
  arch.position.y = 0.75;
  g.add(arch);
  const lights: THREE.Mesh[] = [];
  ["#e7c46a", "#c2573a", "#7ab0c4"].forEach((c, i) => {
    const strip = P.box(0.42, 0.035, 0.02, c, { emissive: c });
    strip.position.set(0, 0.25 + i * 0.12, 0.165);
    g.add(strip);
    lights.push(strip);
  });
  const grille = P.box(0.3, 0.14, 0.02, "#3a2e26");
  grille.position.set(0, 0.08, 0.165);
  g.add(grille);
  return { object: g, lights };
}

export function southCarolinaScene(): Scene {
  let sea: ReturnType<typeof P.waves>;
  let box: ReturnType<typeof jukebox>;
  const notes: { o: THREE.Object3D; age: number; x: number }[] = [];
  const pairs = (n: number) => Math.ceil(n / 2);
  return {
    slots: 6,
    build(kit) {
      sea = P.waves(4.8, 1.0);
      kit.place(sea.object, 0, -1.75, { y: 0.02 });
      ground(kit, "#ecd7a8", 2.2, 0.7, 0.1);
      kit.place(P.palmTree(), -1.95, -0.6, { scale: 0.7 });
      kit.place(P.palmTree(), 2.0, -0.9, { scale: 0.6, yaw: 2 });
      box = jukebox();
      kit.place(box.object, -1.55, -0.85, { yaw: 0.5 });
      kit.block(-1.55, -0.85, 0.35);
    },
    spot: (i, n) => {
      const pair = Math.floor(i / 2);
      const x = (pair - (pairs(n) - 1) / 2) * 1.4;
      // The odd one out dances solo, facing out.
      if (i === n - 1 && n % 2) return { x, z: 0.3, yaw: 0 };
      return { x: x + (i % 2 ? 0.36 : -0.36), z: 0.3, yaw: i % 2 ? -Math.PI / 2 : Math.PI / 2 };
    },
    async role(actor, slot, _kit, clock) {
      const home = actor.root.position.clone();
      const base = actor.yawTarget ?? actor.root.rotation.y;
      const dir = new THREE.Vector3(Math.sin(base), 0, Math.cos(base));
      for (;;) {
        // The shag: a little rock-step toward and away from the partner, arms easy.
        for (let k = 0; k < 6 && clock.alive; k++) {
          const to = home.clone().addScaledVector(dir, k % 2 ? 0.07 : -0.05);
          const from = actor.root.position.clone();
          void actor.gesture(clock, "Spellcasting", k % 2 ? "armL" : "armR", { hold: 0.1, speed: 1.2, upTo: 0.35 }).catch(() => {});
          for (let f = 1; f <= 9; f++) {
            await clock.wait(1 / 30);
            actor.root.position.lerpVectors(from, to, f / 9);
          }
          actor.bounce(0.25);
        }
        if (slot % 2 && chance(0.7)) {
          // A twirl under the partner's arm.
          actor.yawTarget = null;
          const start = actor.root.rotation.y;
          for (let f = 1; f <= 20 && clock.alive; f++) {
            await clock.wait(1 / 30);
            actor.root.rotation.y = start + (f / 20) * Math.PI * 2;
          }
          actor.face(base);
        } else if (slot % 2 === 0) {
          await actor.gesture(clock, "Spellcast_Raise", "armR", { hold: 0.6 });
        }
        if (chance(0.15)) actor.bounce(0.8);
      }
    },
    async ambient(kit, clock) {
      for (;;) {
        await beat(clock, 0.5, 0.9);
        const n = P.note(pick(["#3a2e26", "#a5483c", "#46658a"]));
        n.scale.setScalar(0.9);
        kit.floor.add(n);
        notes.push({ o: n, age: 0, x: rand(-0.15, 0.15) });
      }
    },
    tick(dt, t) {
      sea?.roll(t);
      if (!box) return;
      box.lights.forEach((l, i) => ((l.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + 0.5 * Math.sin(t * 5 + i * 2)));
      for (let i = notes.length - 1; i >= 0; i--) {
        const n = notes[i];
        n.age += dt;
        n.o.position.set(-1.55 + n.x + Math.sin(n.age * 3) * 0.1, 1.1 + n.age * 0.45, -0.85 + n.age * 0.1);
        n.o.rotation.z = Math.sin(n.age * 4) * 0.3;
        if (n.age > 2.4) {
          n.o.removeFromParent();
          notes.splice(i, 1);
        }
      }
    },
  };
}

// ---------------------------------------------------------------------------
// South Dakota: Mount Rushmore, with this family's own faces carved in the granite.

const granite = (src: THREE.Material) => {
  const map = (src as THREE.MeshStandardMaterial).map ?? null;
  const m = new THREE.MeshStandardMaterial({ color: "#ffffff", map, roughness: 0.95 });
  // Turn whatever they're wearing into stone: grey it out, keep the shading of the features.
  m.onBeforeCompile = (s) => {
    s.fragmentShader = s.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
      diffuseColor.rgb = vec3(0.5 + lum * 0.28) * vec3(1.0, 0.97, 0.92);`,
    );
  };
  m.customProgramCacheKey = () => "granite";
  return m;
};

function carve(actor: Actor) {
  const bust = SkeletonUtils.clone(actor.model);
  bust.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.material = Array.isArray(m.material) ? m.material.map(granite) : granite(m.material);
      m.castShadow = true;
    }
  });
  bust.scale.setScalar(1);
  return bust;
}

export function southDakotaScene(): Scene {
  return {
    slots: 5,
    build(kit) {
      ground(kit, "#9aa47a", 2.3, 0.8, 0.1);
      // The mountain behind, and the rubble ledge the faces rise out of.
      const rock = ["#a8a397", "#9b968a", "#b3aea2"];
      for (const [x, y, z, sx, sy] of [[-1.3, 0.5, -2.15, 1.3, 1.5], [0, 0.6, -2.25, 1.6, 1.7], [1.3, 0.45, -2.15, 1.3, 1.4], [2.0, 0.2, -1.8, 0.8, 0.9], [-2.0, 0.2, -1.8, 0.8, 0.9]] as const) {
        const r = P.ball(0.8, pick(rock), { detail: 1 });
        r.scale.set(sx, sy, 0.7);
        kit.place(r, x, z, { y });
      }
      for (let i = 0; i < 7; i++) {
        const r = P.ball(0.42, pick(rock), { detail: 1 });
        r.scale.set(1.3, 0.75, 0.8);
        kit.place(r, -1.8 + i * 0.6, -1.15 + rand(-0.05, 0.05), { y: 0.12, yaw: rand(0, 6) });
      }
      for (const [x, z, s] of [[-2.0, -0.6, 0.8], [2.05, -0.5, 0.9], [-1.8, 0.9, 0.6], [1.9, 0.8, 0.7]] as const) kit.place(P.tree("pine", "#2f6b4a"), x, z, { scale: s });
    },
    spot: (i, n) => row(i, n, 0.8, 0.55),
    async role(actor, slot, kit, clock) {
      // Let the sculptors get their likeness first.
      await clock.wait(1.6);
      const cam = slot % 2 ? phone() : null;
      if (cam) actor.hold(cam);
      for (;;) {
        actor.lookAt(kit.toWorld(rand(-1.2, 1.2), 1.3, -1.6));
        await beat(clock, 1.2, 2.4);
        if (cam) await actor.gesture(clock, "Spellcast_Raise", "armR", { hold: 1.0 });
        else if (chance(0.5)) await actor.gesture(clock, "Spellcast_Shoot", "armR", { hold: 0.6 });
        else actor.bounce(0.4);
        if (chance(0.15)) await waveOfJoy(kit, clock);
      }
    },
    async ambient(kit, clock) {
      // Once the family's here (standing at ease), carve up to four of them into the mountain.
      for (let i = 0; i < 40; i++) {
        await clock.wait(0.1);
        const here = kit.cast.filter(Boolean).length;
        if (here >= Math.min(4, kit.cast.length) && here > 0) break;
      }
      await clock.wait(0.5);
      const faces = kit.cast.filter((a): a is Actor => Boolean(a)).slice(0, 4);
      const v = new THREE.Vector3();
      faces.forEach((a, i) => {
        const bust = carve(a);
        bust.scale.setScalar(a.unitScale * 1.35);
        const x = (i - (faces.length - 1) / 2) * 0.82;
        bust.position.set(x, 0, -1.6);
        bust.rotation.y = 0.1 * (i - (faces.length - 1) / 2);
        kit.floor.add(bust);
        bust.updateMatrixWorld(true);
        // Sink them so only the head rises above the ledge.
        const head = bust.getObjectByName("head");
        const neck = head ? kit.floor.worldToLocal(head.getWorldPosition(v)).y : 1.4;
        bust.position.y = 0.4 - neck;
        kit.fx.dust({ x, y: 0.8, z: -1.5 });
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Vermont: sugaring season. Buckets on the maples, steam from the sugar shack, pancakes flipping.

function maple() {
  const g = new THREE.Group();
  const bark = "#6b5444";
  g.add(P.cyl(0.07, 0.11, 1.5, bark, 8));
  for (const [y, a, l] of [[1.1, 0.7, 0.6], [1.25, -0.8, 0.55], [1.4, 0.2, 0.5], [0.95, -2.4, 0.45]] as const) {
    const b = P.cyl(0.02, 0.04, l, bark, 6);
    b.position.set(Math.sin(a) * l * 0.35, y + l * 0.3, Math.cos(a) * 0.05);
    b.rotation.z = -Math.sin(a) * 0.9;
    g.add(b);
  }
  const bucket = new THREE.Group();
  bucket.add(P.cyl(0.08, 0.065, 0.14, "#9aa4a8", 12));
  const lid = P.cyl(0.095, 0.095, 0.015, "#7d878b", 12);
  lid.position.y = 0.16;
  lid.rotation.x = 0.4;
  bucket.add(lid);
  const spout = P.cyl(0.01, 0.01, 0.08, "#7d878b", 6);
  spout.rotation.x = Math.PI / 2;
  spout.position.set(0, 0.18, -0.05);
  bucket.add(spout);
  bucket.position.set(0, 0.55, 0.12);
  g.add(bucket);
  return g;
}

function sugarShack() {
  const g = new THREE.Group();
  g.add(P.box(1.1, 0.7, 0.7, "#8a5a3a"));
  for (const s of [-1, 1]) {
    const roof = P.box(1.25, 0.04, 0.48, "#5b4a40");
    roof.position.set(0, 0.86, s * 0.19);
    roof.rotation.x = s * 0.6;
    g.add(roof);
  }
  const vent = P.box(0.4, 0.2, 0.26, "#8a5a3a");
  vent.position.y = 1.08;
  const ventRoof = P.box(0.5, 0.03, 0.34, "#5b4a40");
  ventRoof.position.y = 1.2;
  const door = P.box(0.26, 0.45, 0.02, "#5b3e2e");
  door.position.set(0.2, 0.225, 0.36);
  g.add(vent, ventRoof, door);
  return g;
}

function pancake() {
  const p = P.cyl(0.11, 0.11, 0.025, "#d9a35a", 16);
  p.position.y = 0;
  return p;
}

function pan() {
  const g = new THREE.Group();
  const dish = P.cyl(0.13, 0.11, 0.03, "#2e2a26", 16);
  dish.position.y = 0;
  const handle = P.box(0.03, 0.02, 0.22, "#2e2a26");
  handle.position.set(0, 0, -0.22);
  g.add(dish, handle);
  return g;
}

export function vermontScene(): Scene {
  const trees: THREE.Vector2[] = [];
  return {
    slots: 5,
    async build(kit) {
      ground(kit, "#eef0ee", 2.3, 0.8, 0);
      for (const [x, z, s] of [[-1.9, -1.2, 1], [-1.0, -1.6, 1.1], [1.0, -1.5, 1.05], [1.9, -1.0, 0.95]] as const) {
        kit.place(maple(), x, z, { scale: s, yaw: rand(-0.3, 0.3) });
        kit.block(x, z, 0.25);
        trees.push(new THREE.Vector2(x, z));
      }
      kit.place(sugarShack(), 0, -1.75);
      kit.block(0, -1.75, 0.7);
      // The breakfast table: a tall stack and a jug of syrup.
      const table = await kit.prop("table_round_A", { w: 0.9, h: TABLE.h });
      kit.place(table, 1.35, -0.35);
      kit.block(1.35, -0.35, 0.5);
      const stack = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const c = pancake();
        c.position.y = i * 0.026;
        c.rotation.y = rand(0, 6);
        stack.add(c);
      }
      const pat = P.box(0.06, 0.03, 0.06, "#f3e2a0");
      pat.position.y = 0.17;
      stack.add(pat);
      const jug = P.cyl(0.05, 0.06, 0.16, "#8a5a2a", 10);
      jug.position.x = 0.22;
      stack.add(jug);
      kit.place(stack, 1.3, -0.35, { y: TABLE.h + 0.015 });
    },
    spot: (i, n) => row(i, n, 0.85, 0.35),
    async role(actor, slot, kit, clock) {
      if (slot === 0) {
        // The pancake flipper.
        const p = pan();
        actor.hold(p);
        const cake = pancake();
        kit.floor.add(cake);
        const v = new THREE.Vector3();
        for (;;) {
          await beat(clock, 0.8, 1.6);
          const at = kit.floor.worldToLocal(actor.handR.getWorldPosition(v)).clone();
          void actor.gesture(clock, "Spellcast_Raise", "armR", { hold: 0.2, speed: 1.4 }).catch(() => {});
          for (let f = 0; f <= 24 && clock.alive; f++) {
            await clock.wait(1 / 30);
            const u = f / 24;
            cake.position.set(at.x, at.y + 0.1 + Math.sin(u * Math.PI) * 0.7, at.z + 0.1);
            cake.rotation.x = u * Math.PI * 2;
          }
          cake.position.y = -5;
          actor.bounce(0.6);
          if (chance(0.3)) kit.fx.sparkle({ x: at.x, y: at.y + 0.4, z: at.z }, "#e7c46a", 0.3);
        }
      }
      if (slot % 2) {
        // Off to check the sap buckets.
        for (;;) {
          await beat(clock, 1.5, 3);
          const home = actor.root.position.clone();
          const t = trees[(slot + Math.floor(rand(0, 4))) % trees.length];
          await actor.walkTo(clock, t.x, t.y + 0.45);
          actor.faceToward(t.x, t.y);
          await actor.once(clock, "Interact", "Idle");
          if (chance(0.5)) await actor.gesture(clock, "Cheer", "arms", { hold: 0.4 });
          await actor.walkTo(clock, home.x, home.z);
          actor.face(0);
        }
      }
      // Everyone else tucks in.
      const plate = await kit.prop("plate", { w: 0.24 });
      actor.hold(plate, "left");
      for (;;) {
        await beat(clock, 1, 2.2);
        await actor.gesture(clock, "Use_Item", "armR", { hold: 0.4 });
        if (chance(0.3)) actor.bounce(0.6);
      }
    },
    async ambient(kit, clock) {
      for (;;) {
        await clock.wait(0.15);
        if (chance(0.5)) kit.fx.smoke({ x: rand(-0.12, 0.12), y: 1.25, z: -1.75 }, { size: 0.3, rise: 0.5, color: "#e8e6e2" });
        if (chance(0.25)) {
          const t = pick(trees);
          kit.fx.emit({ at: { x: t.x, y: 0.72, z: t.y + 0.07 }, vel: { x: 0, y: -0.2, z: 0 }, life: 0.25, size: 0.04, color: "#c99a4a", gravity: -2 });
        }
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Virginia: a colonial fife and drum parade past the brick capitol.

function capitol() {
  const g = new THREE.Group();
  g.add(P.box(2.0, 0.9, 0.55, "#a5574a"));
  for (const s of [-1, 1]) {
    const roof = P.box(2.1, 0.04, 0.38, "#4a4644");
    roof.position.set(0, 1.0, s * 0.14);
    roof.rotation.x = s * 0.7;
    g.add(roof);
  }
  const cupola = P.cyl(0.13, 0.15, 0.35, "#f3f0ea", 8);
  cupola.position.y = 1.32;
  const dome = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.25, 8), P.mat("#4a4644"));
  dome.position.y = 1.62;
  g.add(cupola, dome);
  for (let i = 0; i < 5; i++) {
    const w = P.box(0.18, 0.3, 0.02, "#f3f0ea");
    w.position.set(-0.8 + i * 0.4, 0.5, 0.28);
    const pane = P.box(0.13, 0.24, 0.02, "#46586a");
    pane.position.set(-0.8 + i * 0.4, 0.5, 0.29);
    g.add(w, pane);
  }
  return g;
}

function colonialFlag() {
  const g = new THREE.Group();
  g.add(P.cyl(0.02, 0.025, 1.9, "#d9d4ca", 6));
  const flag = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const s = P.box(0.6, 0.06, 0.01, i % 2 ? "#f3f0ea" : "#a5483c");
    s.position.set(0.3, -i * 0.06, 0);
    flag.add(s);
  }
  const canton = P.box(0.26, 0.24, 0.015, "#2f3f5a");
  canton.position.set(0.13, -0.09, 0.002);
  flag.add(canton);
  flag.position.y = 1.85;
  g.add(flag);
  return { object: g, flag };
}

function drum() {
  const g = new THREE.Group();
  const shell = P.cyl(0.17, 0.17, 0.2, "#2f3f5a", 16);
  shell.position.y = 0;
  const head = P.cyl(0.175, 0.175, 0.02, "#efe6d2", 16);
  head.position.y = 0.1;
  const rim = P.cyl(0.18, 0.18, 0.025, "#a5483c", 16);
  rim.position.y = -0.1;
  g.add(shell, head, rim);
  return g;
}

const stick = (len = 0.32, color = "#d9b98a") => {
  const s = P.cyl(0.008, 0.008, len, color, 5);
  s.position.y = 0;
  return s;
};

export function virginiaScene(): Scene {
  const loop = (ph: number) => ({ x: Math.sin(ph) * 1.55, z: Math.cos(ph) * 0.62 + 0.15 });
  let flag: ReturnType<typeof colonialFlag>;
  return {
    slots: 5,
    build(kit) {
      const lawn = ground(kit, "#8fa070", 2.3, 0.8, 0);
      void lawn;
      const path = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.15, 48), P.mat("#b8ab98"));
      path.rotation.x = -Math.PI / 2;
      path.scale.set(1.55, 0.62, 1);
      path.position.set(0, 0.045, 0.15);
      path.receiveShadow = true;
      kit.floor.add(path);
      kit.place(capitol(), 0, -1.65);
      flag = colonialFlag();
      kit.place(flag.object, 1.6, -1.2);
      kit.place(P.tree("round", "#5a7a4a"), -1.9, -1.2, { scale: 0.9 });
    },
    spot: (i) => {
      const p = loop(-i * 0.5);
      const q = loop(-i * 0.5 + 0.05);
      return { x: p.x, z: p.z, yaw: Math.atan2(q.x - p.x, q.z - p.z) };
    },
    async role(actor, slot, _kit, clock) {
      wear(actor, sceneHat("tricorn", HAT_BAND), { fitted: true });
      let ph = -slot * 0.5;
      if (slot === 0) {
        onBone(actor, "chest", drum()).position.set(0, -0.32, 0.24);
        actor.hold(stick());
        actor.hold(stick(), "left");
        void (async () => {
          for (let k = 0; clock.alive; k++) await actor.gesture(clock, "Use_Item", k % 2 ? "armL" : "armR", { hold: 0.05, speed: 1.8, upTo: 0.3 });
        })().catch(() => {});
      } else if (slot === 1) {
        const f = colonialFlag();
        f.object.scale.setScalar(0.6);
        actor.hold(f.object);
      } else {
        actor.hold(stick(0.3, "#5b4030"));
        void (async () => {
          for (;;) {
            await actor.gesture(clock, "Use_Item", "armR", { hold: 1.4, speed: 0.8 });
            await beat(clock, 0.2, 0.5);
          }
        })().catch(() => {});
      }
      actor.play("Walking_A", { speed: 0.8 });
      for (;;) {
        await clock.wait(1 / 30);
        ph += (1 / 30) * 0.32;
        const p = loop(ph);
        const q = loop(ph + 0.05);
        actor.root.position.x = p.x;
        actor.root.position.z = p.z;
        actor.face(Math.atan2(q.x - p.x, q.z - p.z));
      }
    },
    tick(_dt, t) {
      if (flag) flag.flag.rotation.y = Math.sin(t * 2) * 0.25;
    },
  };
}

// ---------------------------------------------------------------------------
// Washington: the fish toss at the market, the Space Needle overhead.

function spaceNeedle() {
  const g = new THREE.Group();
  const white = "#e9e6e0";
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = P.cyl(0.03, 0.05, 2.2, white, 6);
    leg.position.set(Math.sin(a) * 0.12, 1.1, Math.cos(a) * 0.12);
    leg.rotation.set(Math.cos(a) * 0.08, 0, -Math.sin(a) * 0.08);
    g.add(leg);
  }
  const waist = P.cyl(0.06, 0.06, 0.05, white, 8);
  waist.position.y = 1.2;
  const saucer = P.cyl(0.45, 0.22, 0.14, white, 24);
  saucer.position.y = 2.26;
  const halo = P.cyl(0.47, 0.47, 0.03, "#c2a052", 24);
  halo.position.y = 2.18;
  const cap = P.cyl(0.2, 0.38, 0.1, white, 20);
  cap.position.y = 2.38;
  const spire = P.cyl(0.01, 0.03, 0.5, white, 6);
  spire.position.y = 2.68;
  g.add(waist, saucer, halo, cap, spire);
  return g;
}

function marketStall() {
  const g = new THREE.Group();
  const counter = P.box(1.5, 0.6, 0.5, "#6b5444");
  const ice = P.box(1.45, 0.06, 0.46, "#e8eef0");
  ice.position.y = 0.63;
  g.add(counter, ice);
  for (let i = 0; i < 6; i++) {
    const f = fish(pick(["#8a9a7a", "#b07a6a", "#9aa4b0"]));
    f.scale.setScalar(1.3);
    f.position.set(-0.6 + i * 0.24, 0.7, rand(-0.1, 0.1));
    f.rotation.y = Math.PI / 2 + rand(-0.3, 0.3);
    g.add(f);
  }
  const tex = canvasTexture("pike-sign", 512, 96, (c) => {
    c.fillStyle = "#a5483c";
    c.fillRect(0, 0, 512, 96);
    c.fillStyle = "#f3f0ea";
    c.font = "bold 58px Georgia, serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("PUBLIC MARKET", 256, 52);
  });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.28, 0.04), [P.mat("#a5483c"), P.mat("#a5483c"), P.mat("#a5483c"), P.mat("#a5483c"), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }), P.mat("#a5483c")]);
  sign.position.set(0, 1.75, -0.2);
  g.add(sign);
  for (const s of [-1, 1]) {
    const post = P.box(0.06, 1.62, 0.06, "#3a2e26");
    post.position.set(s * 0.7, 0.81, -0.2);
    g.add(post);
  }
  return g;
}

export function washingtonScene(): Scene {
  let flying: THREE.Object3D;
  return {
    slots: 5,
    build(kit) {
      const floor = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.03, 2.6), P.mat("#a8a096"));
      floor.position.set(0, 0.015, -0.2);
      kit.floor.add(floor);
      kit.place(spaceNeedle(), 1.75, -1.75, { scale: 0.9 });
      kit.place(marketStall(), -0.5, -1.25);
      kit.block(-0.5, -1.25, 0.8);
      flying = fish("#b07a6a");
      flying.scale.setScalar(1.6);
      flying.visible = false;
      kit.floor.add(flying);
    },
    spot: (i, n) => (i === 0 ? { x: -0.5, z: -1.75, yaw: 0 } : i === 1 ? { x: -0.5, z: 0.75, yaw: Math.PI } : row(i - 2, Math.max(1, n - 2), 0.8, 0.4, )),
    async role(actor, slot, kit, clock) {
      if (slot === 0) actor.root.position.y = 0;
      if (slot === 1) {
        // The tosser out front; slot 0 behind the ice catches, and throws it back.
        for (;;) {
          await beat(clock, 0.8, 1.6);
          const other = kit.cast[0];
          if (!other) continue;
          for (const [from, to] of [[actor, other], [other, actor]] as const) {
            const held = fish("#b07a6a");
            held.scale.setScalar(1.6);
            from.hold(held);
            from.faceToward(to.root.position.x, to.root.position.z);
            void from.once(clock, "Throw", "Idle", { speed: 1.2 }).catch(() => {});
            await clock.wait(0.45);
            from.drop(held);
            const a = from.root.position.clone().setY(1.2);
            const b = to.root.position.clone().setY(1.1);
            flying.visible = true;
            for (let f = 0; f <= 22 && clock.alive; f++) {
              await clock.wait(1 / 30);
              const u = f / 22;
              flying.position.lerpVectors(a, b, u);
              flying.position.y += Math.sin(u * Math.PI) * 0.9;
              flying.rotation.set(u * 6, Math.atan2(b.x - a.x, b.z - a.z), 0);
            }
            flying.visible = false;
            to.bounce(0.6);
            void to.gesture(clock, "Cheer", "arms", { hold: 0.3 }).catch(() => {});
            for (const c of kit.cast) if (c && c !== from && c !== to && chance(0.5)) void c.gesture(clock, "Cheer", "arms", { hold: 0.4 }).catch(() => {});
            await beat(clock, 0.6, 1);
          }
          actor.face(Math.PI);
        }
      }
      if (slot === 0) {
        for (;;) await clock.wait(1);
      }
      for (;;) {
        await beat(clock, 1.5, 3);
        if (chance(0.4)) {
          actor.lookAt(kit.toWorld(1.75, 2.3, -1.75));
          await clock.wait(1.2);
          actor.lookAt(null);
        } else actor.bounce(0.3);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// West Virginia: whitewater rafting under the New River Gorge Bridge.

function raft() {
  const g = new THREE.Group();
  const tube = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.13, 10, 28), P.mat("#c2573a"));
  tube.rotation.x = Math.PI / 2;
  tube.scale.set(1.25, 0.75, 1);
  tube.position.y = 0.12;
  const deck = P.cyl(0.5, 0.5, 0.04, "#3a3f46", 20);
  deck.scale.set(1.2, 1, 0.72);
  deck.position.y = 0.04;
  g.add(tube, deck);
  return g;
}

function paddle() {
  const g = new THREE.Group();
  const shaft = P.cyl(0.012, 0.012, 0.7, "#2e2a26", 5);
  shaft.position.y = 0;
  const blade = P.box(0.09, 0.18, 0.015, "#c2a052");
  blade.position.y = -0.4;
  g.add(shaft, blade);
  return g;
}

function archBridge() {
  const g = new THREE.Group();
  const steel = P.mat("#8a5a3a");
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    pts.push(new THREE.Vector3(-2.3 + u * 4.6, Math.sin(u * Math.PI) * 1.55, 0));
  }
  for (const z of [-0.12, 0.12]) {
    const arch = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.045, 6), steel);
    arch.position.z = z;
    g.add(arch);
  }
  const deck = P.box(4.8, 0.08, 0.36, "#6b6460");
  deck.position.y = 1.7;
  g.add(deck);
  for (let i = 1; i < 12; i++) {
    const x = -2.3 + (i / 12) * 4.6;
    const y0 = Math.sin((i / 12) * Math.PI) * 1.55;
    const h = 1.7 - y0;
    if (h < 0.05) continue;
    const post = P.box(0.03, h, 0.03, "#8a5a3a");
    post.position.set(x, y0 + h / 2, 0);
    g.add(post);
  }
  return g;
}

export function westVirginiaScene(): Scene {
  let river: ReturnType<typeof P.waves>;
  let boat: THREE.Group;
  const crew = new Map<Actor, number>();
  const seats = [[-0.32, -0.2], [-0.32, 0.2], [0.25, -0.22], [0.25, 0.22]] as const;
  const rocks: THREE.Vector3[] = [];
  return {
    slots: 5,
    build(kit) {
      river = P.waves(4.8, 1.5);
      (river.object.material as THREE.MeshStandardMaterial).color.set(P.calmProp("#3f8a8f"));
      kit.place(river.object, 0, -0.25, { y: 0.02 });
      const bank = (z: number, d: number) => {
        const b = P.box(4.8, 0.16, d, "#7a8a5a");
        kit.place(stand(b), 0, z);
      };
      bank(-1.55, 1.1);
      bank(1.05, 0.6);
      for (let i = 0; i < 7; i++) kit.place(P.tree("pine", pick(["#2f6b4a", "#3a7a52"])), -2.0 + i * 0.66 + rand(-0.1, 0.1), -1.5 + rand(-0.25, 0.2), { scale: rand(0.7, 1.0), y: 0.16 });
      const bridge = archBridge();
      kit.place(bridge, 0, -1.95, { y: 0.16 });
      for (const [x, z] of [[-1.5, -0.6], [-0.9, 0.2], [1.1, -0.5], [1.7, 0.15]] as const) {
        const r = P.ball(0.16, "#7a7670", { detail: 1 });
        r.scale.set(1.3, 0.7, 1);
        kit.place(r, x, z, { y: 0.08 });
        rocks.push(new THREE.Vector3(x, 0.15, z));
      }
      boat = raft();
      kit.floor.add(boat);
    },
    spot: (i) => (i < 4 ? { x: 0, z: 0, yaw: Math.PI / 2 } : { x: 1.2, z: 1.0, yaw: Math.PI }),
    async role(actor, slot, kit, clock) {
      if (slot >= 4) {
        // The one on the bank with the camera.
        actor.root.position.y = 0.16;
        const cam = actor.hold(phone());
        void cam;
        for (;;) {
          actor.lookAt(kit.toWorld(boat.position.x, 0.8, boat.position.z));
          await actor.gesture(clock, "Spellcast_Raise", "armR", { hold: 1.2 });
          await beat(clock, 0.6, 1.4);
          if (chance(0.3)) actor.bounce(0.6);
        }
      }
      crew.set(actor, slot);
      actor.play("Sit_Floor_Idle", { fade: 0 });
      actor.hold(paddle());
      try {
        for (;;) {
          await actor.gesture(clock, "Spellcasting", "armR", { hold: 0.15, speed: 1.3 });
          if (chance(0.15)) await actor.gesture(clock, "Cheer", "arms", { hold: 0.4 });
        }
      } finally {
        crew.delete(actor);
      }
    },
    async ambient(kit, clock) {
      for (;;) {
        await clock.wait(0.05);
        const r = pick(rocks);
        kit.fx.emit({ at: { x: r.x - 0.1, y: r.y, z: r.z + rand(-0.1, 0.1) }, vel: { x: rand(0.3, 0.7), y: rand(0.3, 0.7), z: rand(-0.1, 0.1) }, life: 0.5, size: 0.09, endSize: 0.02, color: "#f3f6f7", gravity: -2, solid: true });
        if (boat && chance(0.6)) {
          const s = chance(0.5) ? 1 : -1;
          kit.fx.emit({ at: { x: boat.position.x + 0.65, y: 0.18, z: boat.position.z + s * 0.3 }, vel: { x: rand(0.2, 0.6), y: rand(0.5, 1.0), z: s * rand(0.2, 0.5) }, life: 0.6, size: 0.1, endSize: 0.02, color: "#f3f6f7", gravity: -2.5, solid: true });
        }
      }
    },
    tick(_dt, t) {
      river?.roll(t * 1.6);
      if (!boat) return;
      boat.position.set(Math.sin(t * 0.35) * 0.9, 0.08 + Math.sin(t * 3.1) * 0.05, -0.25 + Math.sin(t * 0.7) * 0.15);
      boat.rotation.set(Math.sin(t * 2.3) * 0.08, Math.sin(t * 0.5) * 0.35, Math.sin(t * 2.9) * 0.1);
      boat.updateMatrix();
      for (const [actor, i] of crew) {
        const [sx, sz] = seats[i % seats.length];
        actor.root.position.copy(new THREE.Vector3(sx, 0.16, sz).applyMatrix4(boat.matrix));
        // Facing downstream, angled a little toward their own side to paddle.
        actor.root.rotation.y = boat.rotation.y + Math.PI / 2 + (sz < 0 ? 0.35 : -0.35);
        actor.yawTarget = null;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Wyoming: waiting on Old Faithful from the boardwalk, then the eruption.

export function wyomingScene(): Scene {
  let erupting = false;
  return {
    slots: 5,
    build(kit) {
      ground(kit, "#d9cfb8", 2.3, 0.8, 0);
      // A hot spring: teal in the middle, rings of yellow and orange.
      ["#c2703a", "#d9b04a", "#5f9ea0"].forEach((c, i) => {
        const r = 0.55 - i * 0.16;
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.02, 32), P.mat(c));
        disc.scale.z = 0.6;
        disc.position.set(-1.45, 0.045 + i * 0.004, -0.75);
        kit.floor.add(disc);
      });
      const cone = new THREE.Mesh(
        new THREE.LatheGeometry([[0.75, 0], [0.6, 0.12], [0.35, 0.25], [0.14, 0.3], [0.08, 0.24], [0, 0.24]].map(([r, y]) => new THREE.Vector2(r, y)), 28),
        P.mat("#cfc6b3"),
      );
      cone.receiveShadow = true;
      kit.place(cone, 0.5, -1.35);
      for (const [x, z, s] of [[-2.0, -1.5, 1], [-1.4, -1.8, 0.9], [1.9, -1.5, 1.05], [2.1, -0.6, 0.8]] as const) kit.place(P.tree("pine", "#2f6b4a"), x, z, { scale: s });
      const b = bison();
      b.object.scale.setScalar(1.2);
      kit.place(b.object, 1.7, 0.2, { yaw: -2.2 });
      // The boardwalk, with a rail on the geyser side.
      const walk = new THREE.Group();
      for (let i = 0; i < 22; i++) {
        const plank = P.box(0.18, 0.05, 0.8, i % 2 ? "#9a7c58" : "#8a6c4a");
        plank.position.x = -2.0 + i * 0.19;
        walk.add(plank);
      }
      for (let i = 0; i < 9; i++) {
        const post = P.box(0.04, 0.4, 0.04, "#6b5444");
        post.position.set(-2.0 + i * 0.5, 0.2, -0.38);
        walk.add(post);
      }
      const rail = P.box(4.1, 0.04, 0.04, "#6b5444");
      rail.position.set(0, 0.4, -0.38);
      walk.add(rail);
      kit.place(walk, 0, 0.6);
    },
    spot: (i, n) => row(i, n, 0.75, 0.65),
    async role(actor, slot, kit, clock) {
      actor.root.position.y = 0.05;
      actor.face(Math.PI);
      actor.lookAt(kit.toWorld(0.5, 0.8, -1.35));
      const cam = slot % 2 ? phone() : null;
      if (cam) actor.hold(cam);
      let was = false;
      for (;;) {
        await clock.wait(0.2);
        if (erupting && !was) {
          actor.lookAt(kit.toWorld(0.5, 2.4, -1.35));
          actor.bounce(1);
          if (cam) await actor.gesture(clock, "Spellcast_Raise", "armR", { hold: 2.0 });
          else await actor.gesture(clock, "Cheer", "arms", { hold: 1.2 });
        } else if (!erupting && was) {
          actor.lookAt(kit.toWorld(0.5, 0.8, -1.35));
          if (chance(0.5)) await actor.gesture(clock, "Cheer", "armR", { hold: 0.4 });
        }
        was = erupting;
      }
    },
    async ambient(kit, clock) {
      const at = { x: 0.5, y: 0.3, z: -1.35 };
      for (;;) {
        // Simmering: a wisp of steam.
        for (let i = 0; i < 40; i++) {
          await clock.wait(0.1);
          if (chance(0.4)) kit.fx.smoke(at, { size: 0.2, rise: 0.4, color: "#eceae6" });
        }
        erupting = true;
        for (let i = 0; i < 130; i++) {
          await clock.wait(1 / 30);
          const k = Math.min(1, i / 15) * (i > 100 ? (130 - i) / 30 : 1);
          for (let j = 0; j < 4; j++)
            kit.fx.emit({ at: { x: at.x + rand(-0.05, 0.05), y: at.y, z: at.z + rand(-0.05, 0.05) }, vel: { x: rand(-0.25, 0.25), y: rand(3.2, 4.4) * k, z: rand(-0.25, 0.25) }, life: 1.2, size: 0.18, endSize: 0.4, color: pick(["#f3f6f7", "#e2eef2"]), gravity: -3.2, drag: 0.3, solid: true });
          if (chance(0.5)) kit.fx.smoke({ x: at.x, y: at.y + 1.8 * k, z: at.z }, { size: 0.5, rise: 0.5, color: "#eceae6" });
        }
        erupting = false;
      }
    },
  };
}

export const MORE_SCENES: Record<string, (() => Scene)[]> = {
  AL: [alabamaScene],
  AK: [alaskaScene],
  AR: [arkansasScene],
  CO: [coloradoScene],
  CT: [connecticutScene],
  DE: [delawareScene],
  HI: [hawaiiScene],
  IL: [illinoisScene],
  IN: [indianaScene],
  IA: [iowaScene],
  KS: [kansasScene],
  KY: [kentuckyScene],
  ME: [maineScene],
  MD: [marylandScene],
  MA: [massachusettsScene],
  MN: [minnesotaScene],
  MS: [mississippiScene],
  MO: [missouriScene],
  MT: [montanaScene],
  NE: [nebraskaScene],
  NH: [newHampshireScene],
  NJ: [newJerseyScene],
  NC: [northCarolinaScene],
  ND: [northDakotaScene],
  OH: [ohioScene],
  OK: [oklahomaScene],
  PA: [pennsylvaniaScene],
  RI: [rhodeIslandScene],
  SC: [southCarolinaScene],
  SD: [southDakotaScene],
  VT: [vermontScene],
  VA: [virginiaScene],
  WA: [washingtonScene],
  WV: [westVirginiaScene],
  WY: [wyomingScene],
};

