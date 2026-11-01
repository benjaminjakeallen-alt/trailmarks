import * as THREE from "three";
import type { Actor, Clip, Clock } from "@/components/stage3d/cast";
import type { Look } from "@/lib/look";
import * as P from "@/components/stage3d/props";
import type { Scene, Spot, StageKit } from "@/components/stage3d/stage";

/**
 * What the family does on each state. Every scene places its props, says where
 * each of up to five people stands, and gives each one a little routine that
 * loops for as long as they're on stage (the rest of the family rotates in).
 * Floor units: a person is 1.7 tall, the usable floor reaches about 2.4 from
 * the middle, +z comes toward the viewer and yaw 0 faces them.
 */

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];
const chance = (p: number) => Math.random() < p;

/** Side by side, facing the viewer. */
const row = (i: number, n: number, gap = 0.95, z = 0.5): Spot => ({ x: (i - (n - 1) / 2) * gap, z, yaw: 0 });

/** Around a point, everyone facing it, the front left open so you can see in. */
function ring(i: number, n: number, r: number, cx = 0, cz = 0): Spot {
  const span = n <= 2 ? Math.PI * 0.6 : Math.PI * 1.25;
  const a = Math.PI + (n === 1 ? 0 : -span / 2 + (span * i) / (n - 1));
  const x = cx + Math.sin(a) * r;
  const z = cz + Math.cos(a) * r;
  return { x, z, yaw: Math.atan2(cx - x, cz - z) };
}

/**
 * Seats around a table, everyone facing in. `angles` in radians: 0 is the side
 * nearest the viewer, π the far side.
 */
function around(cx: number, cz: number, r: number, angles: number[]): Spot[] {
  return angles.map((a) => {
    const x = cx + Math.sin(a) * r;
    const z = cz + Math.cos(a) * r;
    return { x, z, yaw: Math.atan2(cx - x, cz - z) };
  });
}

/** Real sizes for the KayKit props (the packs each use their own scale). */
const TABLE = { w: 1.25, h: 0.6 };
const CHAIR = { h: 0.78 };
const STOOL = { h: 0.36 };

/**
 * Walk to a spot, stepping around anything in the way (tables, crates, trees)
 * instead of through it.
 */
async function walkAround(actor: Actor, kit: StageKit, clock: Clock, x: number, z: number, opts?: { run?: boolean; then?: Clip }) {
  const path: [number, number][] = [];
  let from = new THREE.Vector2(actor.root.position.x, actor.root.position.z);
  const to = new THREE.Vector2(x, z);
  for (let hop = 0; hop < 3; hop++) {
    const seg = to.clone().sub(from);
    const len = seg.length();
    if (len < 1e-3) break;
    const dir = seg.clone().divideScalar(len);
    // The first obstacle the straight line passes through.
    let hit: { o: StageKit["obstacles"][number]; t: number } | null = null;
    for (const o of kit.obstacles) {
      const c = new THREE.Vector2(o.x, o.z);
      const t = THREE.MathUtils.clamp(c.clone().sub(from).dot(dir), 0, len);
      const closest = from.clone().addScaledVector(dir, t);
      const clearance = o.r + 0.22;
      if (closest.distanceTo(c) < clearance && to.distanceTo(c) > o.r && (!hit || t < hit.t)) hit = { o, t };
    }
    if (!hit) break;
    // Step out to the side of it, whichever side is closer.
    const c = new THREE.Vector2(hit.o.x, hit.o.z);
    const side = new THREE.Vector2(-dir.y, dir.x);
    if (side.dot(from.clone().addScaledVector(dir, hit.t).sub(c)) < 0) side.negate();
    const way = c.clone().addScaledVector(side, hit.o.r + 0.35);
    path.push([way.x, way.y]);
    from = way;
  }
  for (const [wx, wz] of path) await actor.walkTo(clock, wx, wz, { run: opts?.run, then: "Walking_A" });
  await actor.walkTo(clock, x, z, opts);
}

/** Fill seats from the middle out, so two people sit together, not at the ends. */
const middleOut = (i: number, n: number) => [2, 1, 3, 0, 4].filter((s) => s < Math.max(n, 5))[i % 5];

/** The parts of a guest's look every guest shares. */
const GUEST: Look = { gender: "male", hairStyle: "tousled", facialHair: "none", extra: "none", body: "rogue", legs: "rogue", cape: false, hat: false, skin: "#f1bf98", hair: "#4f3324", outfit: "#2f7fd6", pants: "#2b2b30", size: "adult", build: "normal", glasses: "none", headwear: "none", gear: "none" };

/** Something worn on the head, sitting on top of it. */
function wear(actor: Actor, object: THREE.Object3D, y = 0.72) {
  const holder = new THREE.Group();
  object.position.y += y;
  holder.add(object);
  actor.hold(holder, "head");
  return object;
}

function cowboyHat(color = "#8a5a33") {
  const brim = P.cyl(0.42, 0.42, 0.03, color, 16);
  const crown = P.cyl(0.22, 0.25, 0.26, color, 12);
  crown.position.y = 0.15;
  const band = P.cyl(0.255, 0.255, 0.05, "#3a2416", 12);
  band.position.y = 0.06;
  const g = new THREE.Group();
  g.add(brim, crown, band);
  return g;
}

function cheeseHat() {
  const wedge = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.26, 3), P.mat("#ffc72c"));
  wedge.rotation.y = Math.PI / 6;
  wedge.scale.set(1, 1, 0.75);
  wedge.position.y = 0.13;
  wedge.castShadow = true;
  const g = new THREE.Group();
  g.add(wedge);
  for (const [x, z] of [[0.1, 0.08], [-0.12, -0.02], [0.02, -0.15]]) {
    const hole = P.ball(0.05, "#e0a91c");
    hole.position.set(x, 0.27, z);
    g.add(hole);
  }
  return g;
}

function policeCap() {
  const g = new THREE.Group();
  const top = P.cyl(0.3, 0.26, 0.16, "#1f2d4d", 12);
  const visor = P.box(0.34, 0.02, 0.18, "#111");
  visor.position.set(0, 0.0, 0.24);
  const badge = P.box(0.08, 0.08, 0.02, "#f5c542");
  badge.position.set(0, 0.08, 0.27);
  g.add(top, visor, badge);
  return g;
}

/** A local helper: wait, but only if the clock is still running. */
const beat = (clock: Clock, a: number, b = a) => clock.wait(rand(a, b));

/** Everyone currently on stage. */
const onStage = (kit: StageKit) => kit.cast.filter((a): a is Actor => Boolean(a));

/** A cheer that ripples down the line, everyone a beat apart. */
async function waveOfJoy(kit: StageKit, clock: Clock, clip: Clip = "Cheer") {
  for (const a of onStage(kit)) {
    a.bounce(0.7);
    void a.gesture(clock, clip, "arms", { hold: 0.4 }).catch(() => {});
    await clock.wait(0.12);
  }
}

// ---------------------------------------------------------------------------
// The default: a campfire with marshmallows, for every state without its own.

function campfireScene(): Scene {
  let fire: ReturnType<typeof P.campfire>;
  return {
    slots: 5,
    build(kit) {
      fire = P.campfire();
      kit.place(fire.object, 0, -0.1);
      kit.place(P.tufts(26, 2.2), 0, 0);
      kit.place(P.tree("pine", "#3f9a54"), -1.9, -1.3, { scale: 1.1 });
      kit.place(P.tree("pine", "#358a49"), 1.95, -1.1, { scale: 0.9 });
      kit.place(P.tree("round", "#58b05c"), 2.1, 0.9, { scale: 0.7 });
    },
    spot: (i, n) => ring(i, n, 1.15, 0, -0.1),
    async role(actor, _slot, kit, clock) {
      await beat(clock, 0.2, 0.6);
      await actor.once(clock, "Sit_Floor_Down", "Sit_Floor_Idle");
      const stick = P.stickWithMarshmallow();
      stick.object.rotation.set(0, Math.PI / 2, 0.5);
      actor.hold(stick.object);
      const m = (stick.mallow.material = (stick.mallow.material as THREE.MeshStandardMaterial).clone());
      let toast = 0;
      for (;;) {
        await beat(clock, 1.6, 3.2);
        toast += rand(0.15, 0.3);
        m.color.lerpColors(new THREE.Color("#fff8ec"), new THREE.Color("#b8742e"), Math.min(1, toast));
        if (toast > 1.1) {
          // Too far: it catches fire, a frantic wave, then a fresh one.
          m.emissive.set("#ff6a00");
          m.emissiveIntensity = 1.2;
          const p = kit.floor.worldToLocal(stick.mallow.getWorldPosition(new THREE.Vector3()));
          kit.fx.sparkle(p, "#ff9a3c", 0.3);
          actor.bounce(1);
          await actor.gesture(clock, "Cheer", "armR", { hold: 0.2, speed: 1.6 });
          m.emissiveIntensity = 0;
          m.color.set("#fff8ec");
          toast = 0;
        } else if (chance(0.25)) {
          // A story gets a laugh.
          actor.bounce(0.5);
        }
      }
    },
    async ambient(kit, clock) {
      for (;;) {
        await beat(clock, 0.1, 0.25);
        kit.fx.emit({
          at: { x: rand(-0.1, 0.1), y: 0.5, z: -0.1 + rand(-0.1, 0.1) },
          vel: { x: rand(-0.15, 0.15), y: rand(0.6, 1.1), z: rand(-0.15, 0.15) },
          life: rand(0.8, 1.4),
          size: 0.08,
          endSize: 0.01,
          color: pick(["#ffb02e", "#ff7a2b", "#ffe08a"]),
          wobble: 0.5,
        });
      }
    },
    tick: (_dt, t) => fire?.flicker(t),
  };
}

// ---------------------------------------------------------------------------
// Utah: lawn chairs in a row, 44 oz fountain drinks, under a red rock arch.

function utahScene(): Scene {
  const stripes = ["#2f7fd6", "#e2483d", "#f5a524", "#2fb59a", "#9b59d0"];
  const cups = ["#e2483d", "#2f7fd6", "#f5a524", "#2fb59a", "#e45b8a"];
  const seatX = (seat: number) => (seat - 2) * 0.92;
  return {
    slots: 5,
    build(kit) {
      const arch = new THREE.Group();
      const rock = "#c8643b";
      const left = P.box(0.5, 1.5, 0.55, rock);
      const right = P.box(0.5, 1.5, 0.55, rock);
      left.position.x = -0.95;
      right.position.x = 0.95;
      const top = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.27, 6, 14, Math.PI), P.mat(rock));
      top.position.y = 1.45;
      top.castShadow = true;
      arch.add(left, right, top);
      kit.place(arch, 0.2, -1.55);
      kit.place(P.box(0.7, 0.5, 0.5, "#b4552f"), -1.7, -1.2, { yaw: 0.4 });
      kit.place(P.box(0.5, 0.8, 0.5, "#c8643b"), 1.9, -0.9, { yaw: -0.3 });
      kit.place(P.tufts(14, 2.1, ["#c9a46a", "#d8b37a"]), 0, 0.3);
      for (let i = 0; i < 5; i++) kit.place(P.lawnChair(stripes[i]), seatX(i), 0.18, { scale: 0.92 });
    },
    spot: (i, n) => ({ x: seatX(middleOut(i, n)), z: 0.32, yaw: 0 }),
    async role(actor, slot, kit, clock) {
      const cup = P.bigCup(cups[slot % 5]);
      await beat(clock, 0.2, 0.4);
      await actor.once(clock, "Sit_Chair_Down", "Sit_Chair_Idle");
      actor.hold(cup);
      for (;;) {
        await beat(clock, 2.2, 4.5);
        // A long pull on the straw, a happy wiggle, a bubble or two.
        await actor.gesture(clock, "Spellcast_Raise", "armR", { hold: rand(0.6, 1.2) });
        actor.bounce(0.45);
        if (chance(0.4)) kit.fx.sparkle(kit.floor.worldToLocal(cup.getWorldPosition(new THREE.Vector3())), "#ffffff", 0.25);
      }
    },
    async ambient(kit, clock) {
      for (;;) {
        await beat(clock, 9, 13);
        // Everyone raises their cup at once: a toast.
        await waveOfJoy(kit, clock, "Spellcast_Raise");
      }
    },
  };
}

// ---------------------------------------------------------------------------
// California: mouse ears and fireworks over a fairytale castle.

function castle() {
  const g = new THREE.Group();
  const pink = "#f6c1d6";
  const blue = "#5d8fe0";
  g.add(P.box(1.8, 0.9, 0.5, pink));
  const tower = (x: number, h: number, r: number) => {
    const t = P.cyl(r, r, h, pink, 10);
    t.position.x = x;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(r * 1.3, r * 2.6, 10), P.mat(blue));
    roof.position.set(x, h + r * 1.3, 0);
    roof.castShadow = true;
    g.add(t, roof);
    const flag = P.box(0.12, 0.08, 0.01, "#f5c542");
    flag.position.set(x + 0.07, h + r * 2.6 + 0.05, 0);
    g.add(flag);
  };
  tower(-0.95, 1.2, 0.2);
  tower(0.95, 1.2, 0.2);
  tower(0, 1.7, 0.28);
  tower(-0.45, 1.35, 0.16);
  tower(0.45, 1.35, 0.16);
  const door = P.box(0.32, 0.45, 0.02, "#7a4a6a");
  door.position.z = 0.26;
  g.add(door);
  return g;
}

function fireworksScene(): Scene {
  const colors = ["#ff5a7a", "#ffd34a", "#5ad1ff", "#9b7bff", "#7dff9a", "#ff9a3c"];
  const sky = new THREE.Vector3(0, 3.4, -1.4);
  return {
    slots: 5,
    build(kit) {
      kit.place(castle(), 0, -1.55, { scale: 1.05 });
      kit.place(P.tree("round", "#5cb85c"), -1.9, -1.0, { scale: 0.7 });
      kit.place(P.tree("round", "#4caf50"), 1.95, -1.1, { scale: 0.8 });
    },
    spot: (i, n) => {
      const s = row(i, n, 0.85, 0.55);
      return { ...s, yaw: -s.x * 0.2 };
    },
    async role(actor, slot, kit, clock) {
      const ears = P.mouseEars(slot % 2 ? "#1d1d22" : "#e2364a");
      ears.scale.setScalar(1.35);
      wear(actor, ears, 0.62);
      actor.lookAt(kit.toWorld(sky.x, sky.y, sky.z));
      for (;;) {
        await beat(clock, 1.5, 3.5);
        if (chance(0.5)) {
          actor.bounce(0.6);
          await actor.gesture(clock, "Cheer", chance(0.5) ? "arms" : "armR", { hold: 0.3 });
        } else if (chance(0.3)) {
          // Point it out to the person next to you.
          actor.face(rand(-0.6, 0.6));
          await beat(clock, 1, 1.6);
          actor.face(0);
        }
      }
    },
    async ambient(kit, clock) {
      for (let shot = 0; ; shot++) {
        const finale = shot % 12 === 11;
        const n = finale ? 6 : 1;
        for (let i = 0; i < n; i++) {
          const from = { x: rand(-1.6, 1.6), y: 0.4, z: -1.3 };
          const h = rand(2.6, 3.6);
          const color = pick(colors);
          kit.fx.rocket(from, h, "#fff2c8");
          await clock.wait(0.45);
          kit.fx.firework({ x: from.x, y: h, z: from.z }, color, rand(0.8, 1.15));
          if (chance(0.5)) pick(onStage(kit))?.bounce(0.6);
          await clock.wait(finale ? 0.15 : 0);
        }
        if (finale) await waveOfJoy(kit, clock);
        await beat(clock, finale ? 2.5 : 0.7, finale ? 3 : 1.4);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// California, take two: surfing the waves; the rest cheer from the sand.

function surfScene(): Scene {
  let sea: ReturnType<typeof P.waves>;
  const boards = ["#f39a2b", "#2fb59a", "#e45b8a"];
  return {
    slots: 5,
    build(kit) {
      sea = P.waves(5.4, 2.2);
      kit.place(sea.object, 0, -1.0);
      const sand = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.06, 28), P.mat("#f2d49b"));
      sand.scale.set(1, 1, 0.42);
      sand.position.set(0, 0.03, 0.85);
      sand.receiveShadow = true;
      kit.floor.add(sand);
      kit.place(P.palmTree(), -2.0, 0.6, { scale: 0.75 });
      const umbrella = new THREE.Group();
      umbrella.add(P.cyl(0.02, 0.02, 1.1, "#fbf7f0", 5));
      const top = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.28, 10), P.mat("#e45b8a"));
      top.position.y = 1.2;
      top.castShadow = true;
      umbrella.add(top);
      kit.place(umbrella, 1.85, 0.75);
    },
    // Two surfers out on the water; everyone else on the beach.
    spot: (i) => (i < 2 ? { x: i ? 0.9 : -0.8, z: -1.05, yaw: Math.PI / 2 } : { x: (i - 3) * 0.9, z: 0.85, yaw: 0 }),
    async role(actor, slot, kit, clock) {
      if (slot >= 2) {
        await beat(clock, 0.2, 0.5);
        await actor.once(clock, "Sit_Floor_Down", "Sit_Floor_Idle");
        actor.lookAt(kit.toWorld(0, 0.8, -1.1));
        for (;;) {
          await beat(clock, 2.5, 5);
          actor.bounce(0.5);
          await actor.gesture(clock, "Cheer", "arms", { hold: 0.3 });
        }
      }
      const board = P.surfboard(boards[slot % 3]);
      const ride = new THREE.Group();
      ride.add(board);
      board.rotation.y = Math.PI / 2;
      kit.floor.add(ride);
      const dir = slot ? -1 : 1;
      try {
        for (;;) {
          actor.play("2H_Melee_Idle", { fade: 0.3 });
          // Ride across the face of the wave, bobbing with it.
          const x0 = actor.root.position.x;
          for (let t = 0; t < 4.2; t += 1 / 30) {
            await clock.wait(1 / 30);
            const x = THREE.MathUtils.clamp(x0 + dir * Math.sin(t * 0.75) * 1.4, -2.1, 2.1);
            const y = 0.14 + Math.sin(x * 2.2 + t * 2.4) * 0.06;
            actor.root.position.set(x, y + 0.03, -1.05 + Math.sin(t * 1.3) * 0.15);
            actor.root.rotation.z = Math.sin(t * 3) * 0.12;
            ride.position.set(x, y, actor.root.position.z);
            ride.rotation.z = actor.root.rotation.z;
            if (chance(0.05)) kit.fx.emit({ at: { x: x - dir * 0.4, y: 0.15, z: ride.position.z }, vel: { x: -dir * 0.5, y: 0.6, z: 0 }, life: 0.6, size: 0.12, color: "#ffffff", solid: true, gravity: -2 });
          }
          if (chance(0.45)) {
            // Wipeout! A splash, a tumble, back on the board.
            await actor.once(clock, "Hit_A", "2H_Melee_Idle", { speed: 1.2 });
            for (let i = 0; i < 18; i++) {
              kit.fx.emit({
                at: actor.root.position,
                vel: { x: rand(-1, 1), y: rand(1, 2.2), z: rand(-0.6, 0.6) },
                life: 0.8,
                size: 0.14,
                endSize: 0.05,
                color: "#e6faff",
                solid: true,
                gravity: -4,
              });
            }
            for (const a of onStage(kit)) if (a !== actor) a.bounce(0.4);
          } else {
            await actor.gesture(clock, "Cheer", "arms", { hold: 0.4 });
          }
        }
      } finally {
        ride.removeFromParent();
        actor.root.rotation.z = 0;
      }
    },
    tick: (_dt, t) => sea?.roll(t),
  };
}

// ---------------------------------------------------------------------------
// Oregon: a creamery stand, cones all round, and a little rain cloud.

function oregonScene(): Scene {
  const flavors = ["#f7c6d9", "#7b4a2e", "#fbf2df", "#c8e8a8", "#f5d76e"];
  let cloud: THREE.Group;
  return {
    slots: 5,
    build(kit) {
      kit.place(P.iceCreamStand(), 0, -1.35, { scale: 1.05 });
      kit.place(P.tree("pine", "#2f8a4c"), -1.95, -1.1, { scale: 1.2 });
      kit.place(P.tree("pine", "#2b7d45"), 2.0, -1.2, { scale: 1.0 });
      kit.place(P.tree("pine", "#358a49"), -2.1, 0.5, { scale: 0.8 });
      kit.place(P.tufts(22, 2.2), 0, 0.3);
      cloud = new THREE.Group();
      for (const [x, y, r] of [[0, 0, 0.32], [0.3, -0.05, 0.25], [-0.3, -0.05, 0.25], [0.12, 0.15, 0.24]]) {
        const puff = P.ball(r, "#e9eef0");
        puff.position.set(x, y, 0);
        cloud.add(puff);
      }
      kit.place(cloud, 1.2, -1.2, { y: 2.7 });
    },
    spot: (i, n) => {
      const s = row(i, n, 0.85, 0.65);
      // Face the viewer, angled a little toward each other.
      return { x: s.x, z: s.z - Math.abs(s.x) * 0.2, yaw: -s.x * 0.3 };
    },
    async role(actor, slot, kit, clock) {
      const give = () => {
        const cone = P.iceCream(flavors[(slot + Math.floor(rand(0, 5))) % flavors.length]);
        actor.hold(cone);
        kit.fx.sparkle(actor.root.position.clone().setY(1), "#ffffff", 0.4);
        return cone;
      };
      let cone = give();
      for (;;) {
        await beat(clock, 1.8, 3.6);
        if (chance(0.12)) {
          // The top scoop topples off. Oh no.
          const scoop = cone.children[2];
          const at = kit.floor.worldToLocal(scoop.getWorldPosition(new THREE.Vector3()));
          actor.drop(cone);
          const fallen = P.ball(0.075, "#fbf2df");
          kit.place(fallen, at.x, at.z, { y: at.y });
          for (let i = 0; i < 20 && fallen.position.y > 0.04; i++) {
            await clock.wait(1 / 30);
            fallen.position.y = Math.max(0.04, fallen.position.y - 0.05 - i * 0.004);
          }
          fallen.scale.set(1.5, 0.35, 1.5);
          await actor.once(clock, "Hit_A", "Idle");
          await clock.wait(0.8);
          fallen.removeFromParent();
          cone = give();
          actor.bounce(1);
        } else {
          await actor.gesture(clock, "Spellcast_Raise", "armR", { hold: rand(0.4, 0.8) });
          actor.bounce(0.4);
        }
      }
    },
    async ambient(kit, clock) {
      for (;;) {
        await beat(clock, 0.05, 0.12);
        // It's Oregon: a little drizzle, mostly over the stand.
        kit.fx.emit({
          at: { x: cloud.position.x + rand(-0.4, 0.4), y: cloud.position.y - 0.25, z: cloud.position.z + rand(-0.15, 0.15) },
          vel: { x: 0, y: -2.4, z: 0 },
          life: 1.0,
          size: 0.05,
          color: "#7fb8e6",
          solid: true,
        });
      }
    },
    tick(_dt, t) {
      if (cloud) cloud.position.x = Math.sin(t * 0.25) * 1.3;
    },
  };
}

// ---------------------------------------------------------------------------
// Nevada: one at the slot machine, the rest playing cards. Jackpots happen.

function nevadaScene(): Scene {
  let machine: ReturnType<typeof P.slotMachine>;
  let spinning = false;
  let win = false;
  const pot = new THREE.Group();
  const T = { x: 1.05, z: -0.35 };
  const seats = around(T.x, T.z, 0.88, [-1.2, 1.2, Math.PI]);
  return {
    slots: 5,
    async build(kit) {
      machine = P.slotMachine();
      kit.place(machine.object, -1.0, -0.9, { yaw: 0.35 });
      kit.block(-1.0, -0.9, 0.4);
      const table = await kit.prop("table_round_A", TABLE);
      kit.place(table, T.x, T.z);
      kit.block(T.x, T.z, TABLE.w / 2);
      const felt = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.02, 20), P.mat("#1f7a4a"));
      felt.position.set(T.x, TABLE.h + 0.01, T.z);
      kit.floor.add(felt);
      pot.position.set(T.x, TABLE.h + 0.02, T.z);
      kit.floor.add(pot);
      for (let i = 0; i < 3; i++) {
        const stack = P.pokerChips(2 + i);
        stack.position.x = i * 0.13 - 0.13;
        pot.add(stack);
      }
      for (const s of seats) {
        const stool = await kit.prop("chair_stool_wood", STOOL);
        kit.place(stool, s.x - Math.sin(s.yaw ?? 0) * 0.14, s.z - Math.cos(s.yaw ?? 0) * 0.14);
      }
      const sign = P.box(1.1, 0.35, 0.06, "#1d1d22");
      const lights = P.box(1.02, 0.25, 0.07, "#ffd34a", { emissive: "#ffb000" });
      lights.position.y = 0.05;
      sign.add(lights);
      kit.place(sign, -1.0, -1.45, { y: 1.75 });
      kit.place(P.cyl(0.03, 0.03, 1.75, "#2b2b30", 6), -1.0, -1.45);
    },
    spot(i) {
      if (i === 0) return { x: -0.75, z: -0.3, yaw: Math.PI * 0.85 };
      if (i === 4) return { x: -1.55, z: -0.05, yaw: Math.PI * 0.7 };
      return seats[i - 1];
    },
    async role(actor, slot, kit, clock) {
      if (slot === 0) {
        for (;;) {
          await beat(clock, 1, 2);
          await actor.once(clock, "Interact", "Idle", { speed: 1.2 });
          spinning = true;
          await clock.wait(1.4);
          spinning = false;
          win = chance(0.4);
          if (win) {
            actor.play("Cheer");
            for (let i = 0; i < 28; i++) {
              kit.fx.emit({
                at: { x: -0.95, y: 0.7, z: -0.65 },
                vel: { x: rand(-0.8, 0.8), y: rand(1.6, 2.8), z: rand(0.1, 0.9) },
                life: 1.4,
                size: 0.12,
                color: pick(["#f5c542", "#ffe58a", "#e9b52a"]),
                gravity: -4,
                solid: true,
              });
              if (i % 6 === 0) await clock.wait(0.05);
            }
            await waveOfJoy(kit, clock);
            await clock.wait(1.2);
            win = false;
            actor.play("Idle");
          } else {
            actor.bounce(0.3);
          }
        }
      }
      if (slot === 4) {
        // The cheerleader for whoever's on the machine.
        actor.lookAt(kit.toWorld(-1, 0.9, -0.9));
        for (;;) {
          await beat(clock, 2, 4);
          if (win) await actor.once(clock, "Jump_Full_Short", "Idle");
          else actor.bounce(0.3);
        }
      }
      await beat(clock, 0.1, 0.4);
      await actor.once(clock, "Sit_Chair_Down", "Sit_Chair_Idle");
      const hand = P.card();
      hand.rotation.x = Math.PI / 2;
      actor.hold(hand, "left");
      for (;;) {
        await beat(clock, 2, 4.5);
        if (chance(0.5)) {
          // All in.
          await actor.gesture(clock, "Interact", "armR", { hold: 0.3 });
          const chip = P.pokerChips(1);
          chip.position.set(rand(-0.2, 0.2), pot.children.length * 0.002, rand(-0.15, 0.15));
          pot.add(chip);
          if (pot.children.length > 14) pot.children.slice(3).forEach((c) => c.removeFromParent());
        } else {
          actor.bounce(0.3);
        }
      }
    },
    tick: (_dt, t) => machine?.spin(t, spinning, win),
  };
}

// ---------------------------------------------------------------------------
// Arizona: scrambling up ladders through a cliff dwelling, cactus all around.

function arizonaScene(): Scene {
  const ROOF = 0.7;
  const ladders = [-0.4, 0.75];
  return {
    slots: 4,
    build(kit) {
      kit.place(P.cliffDwelling(), 0, -0.55);
      kit.place(P.tufts(12, 2.1, ["#c9a46a", "#b8955a"]), 0, 0.6);
      kit.place(P.saguaro(), -1.95, 0.25, { scale: 1.0 });
      kit.place(P.saguaro("#4aa865"), 1.95, 0.55, { scale: 0.75, yaw: 1.2 });
      kit.place(P.saguaro(), 2.05, -0.75, { scale: 0.9, yaw: 0.5 });
      void kit.prop("rocks_A", { w: 0.7 }).then((c) => kit.place(c, -1.4, 1.1));
    },
    spot: (i) => ({ x: [-1.2, 1.4, -0.2, 0.9][i % 4], z: [0.55, 0.45, 0.9, 0.95][i % 4], yaw: 0 }),
    async role(actor, slot, kit, clock) {
      const home = actor.root.position.clone();
      await beat(clock, slot * 0.8, slot * 0.8 + 0.5);
      for (;;) {
        const lx = ladders[slot % 2];
        await actor.walkTo(clock, lx, 0.0);
        actor.face(Math.PI);
        // Climb: hand over hand up the ladder.
        actor.play("Walking_A", { speed: 0.8 });
        for (let t = 0; t <= 1; t += 1 / 36) {
          await clock.wait(1 / 30);
          actor.root.position.set(lx, ROOF * t, -0.15 * t);
        }
        actor.root.position.set(lx, ROOF, -0.35);
        actor.face(0);
        actor.play("Idle");
        await clock.wait(0.3);
        // On top: a wave to everyone below.
        actor.bounce(0.6);
        await actor.gesture(clock, "Cheer", "armR", { hold: 0.6 });
        await beat(clock, 0.6, 1.4);
        // Jump down with a puff of red dust.
        await actor.once(clock, "Jump_Full_Short", "Idle", { speed: 1.2 });
        for (let t = 0; t <= 1; t += 1 / 12) {
          await clock.wait(1 / 30);
          actor.root.position.set(lx, ROOF * (1 - t * t), -0.35 + 0.65 * t);
        }
        kit.fx.dust({ x: lx, y: 0, z: 0.3 }, "#d9a066");
        actor.bounce(0.7);
        await actor.walkTo(clock, home.x, home.z);
        actor.face(0);
        await beat(clock, 1.5, 3);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// New Mexico: a flying saucer takes one of the family for a little spin.

function newMexicoScene(): Scene {
  let ship: ReturnType<typeof P.ufo>;
  let taken: Actor | null = null;
  return {
    slots: 5,
    build(kit) {
      ship = P.ufo();
      kit.place(ship.object, 0, -0.3, { y: 2.5, scale: 0.85 });
      kit.place(P.saguaro(), -1.95, -0.7, { scale: 1.0 });
      kit.place(P.saguaro("#4aa865"), 2.0, -0.4, { scale: 0.85, yaw: 2 });
      void kit.prop("rock_A", { w: 0.5 }).then((c) => kit.place(c, 1.6, 1.0));
      kit.place(P.tufts(12, 2.1, ["#c9a46a", "#b8955a"]), 0, 0.4);
    },
    spot: (i, n) => {
      const s = row(i, n, 0.9, 0.55);
      return { ...s, z: s.z - Math.abs(s.x) * 0.2 };
    },
    async role(actor, _slot, kit, clock) {
      actor.lookAt(ship.object.position.clone().applyMatrix4(kit.floor.matrixWorld));
      for (;;) {
        await beat(clock, 0.5, 1.5);
        if (taken === actor) continue;
        if (taken) {
          // Panic: run a little loop, then point.
          if (chance(0.5)) {
            const p = actor.root.position.clone();
            await actor.walkTo(clock, p.x + rand(-0.6, 0.6), p.z + rand(-0.3, 0.3), { run: true });
            await actor.walkTo(clock, p.x, p.z, { run: true });
            actor.faceToward(taken.root.position.x, taken.root.position.z);
          } else {
            actor.bounce(0.5);
          }
        } else if (chance(0.3)) {
          actor.bounce(0.3);
        }
      }
    },
    async ambient(kit, clock) {
      for (;;) {
        await beat(clock, 2.5, 4);
        const who = pick(onStage(kit));
        if (!who) continue;
        // Glide over them.
        const from = ship.object.position.clone();
        const over = new THREE.Vector3(who.root.position.x, 2.4, who.root.position.z);
        for (let t = 0; t <= 1; t += 1 / 40) {
          await clock.wait(1 / 30);
          ship.object.position.lerpVectors(from, over, t * t * (3 - 2 * t));
        }
        taken = who;
        // Beam on; up they go, spinning.
        for (let t = 0; t <= 1; t += 1 / 15) {
          await clock.wait(1 / 30);
          ship.setBeam(2.4 * t, 0.45 * t);
        }
        who.play("Jump_Idle", { fade: 0.2 });
        const ground = who.root.position.clone();
        for (let t = 0; t <= 1; t += 1 / 60) {
          await clock.wait(1 / 30);
          who.root.position.y = ground.y + 1.4 * t * t;
          who.root.rotation.y += 0.25;
          if (chance(0.3)) kit.fx.sparkle(who.root.position.clone().setY(who.root.position.y + 0.5), "#c8ffb0", 0.5);
        }
        await clock.wait(0.8);
        // Not what they were looking for. Back down.
        for (let t = 0; t <= 1; t += 1 / 30) {
          await clock.wait(1 / 30);
          who.root.position.y = ground.y + 1.4 * (1 - t);
        }
        who.root.position.copy(ground);
        ship.setBeam(0, 0);
        kit.fx.dust(ground, "#c9a46a");
        await who.once(clock, "Hit_A", "Idle");
        who.face(0);
        taken = null;
        await waveOfJoy(kit, clock);
        // Wander off for a bit.
        const away = new THREE.Vector3(rand(-1.4, 1.4), 2.5, rand(-1, -0.4));
        const start = ship.object.position.clone();
        for (let t = 0; t <= 1; t += 1 / 50) {
          await clock.wait(1 / 30);
          ship.object.position.lerpVectors(start, away, t * t * (3 - 2 * t));
        }
      }
    },
    tick(_dt, t) {
      if (!ship) return;
      ship.blink(t);
      ship.object.position.y += Math.sin(t * 2) * 0.002;
    },
  };
}

// ---------------------------------------------------------------------------
// Idaho: digging up potatoes and baking them in the coals.

function idahoScene(): Scene {
  let fire: ReturnType<typeof P.campfire>;
  const baked: THREE.Object3D[] = [];
  return {
    slots: 5,
    build(kit) {
      const field = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.04, 24), P.mat("#7a4e30"));
      field.scale.set(1, 1, 0.6);
      field.position.set(-0.3, 0.02, -0.4);
      field.receiveShadow = true;
      kit.floor.add(field);
      // Rows of potato plants in hilled dirt.
      for (let r = 0; r < 2; r++) {
        for (let i = 0; i < 4; i++) {
          const x = -1.45 + i * 0.6;
          const z = -0.95 + r * 0.55;
          kit.place(P.dirtMound(), x, z, { scale: 0.32 });
          for (let k = 0; k < 3; k++) {
            const leaf = P.ball(0.07, k % 2 ? "#4caf50" : "#5cbf5c", { detail: 0 });
            kit.place(leaf, x + (k - 1) * 0.07, z + (k % 2) * 0.05, { y: 0.16 + (k % 2) * 0.05 });
          }
        }
      }
      fire = P.campfire();
      kit.place(fire.object, 1.55, 0.2, { scale: 0.8 });
      void kit.prop("crate_potatoes", { w: 0.8 }).then((c) => kit.place(c, 1.7, -0.9, { yaw: -0.3 }));
    },
    spot: (i) => (i === 4 ? { x: 1.3, z: 0.85, yaw: -0.5 } : { x: -1.3 + i * 0.75, z: 0.25 + (i % 2) * 0.3, yaw: 0 }),
    async role(actor, slot, kit, clock) {
      if (slot === 4) {
        // The cook: sits by the fire handing out baked potatoes.
        await actor.once(clock, "Sit_Floor_Down", "Sit_Floor_Idle");
        actor.lookAt(kit.toWorld(1.55, 0.3, 0.2));
        for (;;) {
          await beat(clock, 2, 4);
          actor.bounce(0.4);
          kit.fx.smoke({ x: 1.55, y: 0.5, z: 0.2 }, { color: "#f2efe9", size: 0.12, rise: 0.7 });
        }
      }
      const spade = P.shovel();
      spade.rotation.x = -Math.PI / 2;
      actor.hold(spade);
      for (;;) {
        await beat(clock, 0.3, 1.2);
        // Dig, dig, dig.
        for (let i = 0; i < 3; i++) {
          await actor.once(clock, "1H_Melee_Attack_Chop", "Idle", { speed: 1.3 });
          const p = actor.root.position;
          for (let k = 0; k < 6; k++) {
            kit.fx.emit({
              at: { x: p.x, y: 0.1, z: p.z + 0.35 },
              vel: { x: rand(-0.6, 0.6), y: rand(0.8, 1.6), z: rand(0, 0.6) },
              life: 0.7,
              size: 0.1,
              color: "#7a4e30",
              solid: true,
              gravity: -4,
            });
          }
        }
        // Up pops a potato! Hold it high, then toss it in the coals.
        const spud = await kit.prop("food_ingredient_potato", { w: 0.2 });
        actor.drop(spade);
        actor.hold(spud);
        actor.bounce(1);
        kit.fx.sparkle(actor.root.position.clone().setY(1.2), "#ffe58a", 0.5);
        await actor.gesture(clock, "Cheer", "armR", { hold: 0.6 });
        actor.faceToward(1.55, 0.2);
        await clock.wait(0.3);
        actor.drop(spud);
        const start = actor.root.position.clone().setY(1.0);
        kit.place(spud, start.x, start.z, { y: start.y });
        await actor.once(clock, "Throw", "Idle", { speed: 1.3 });
        for (let t = 0; t <= 1; t += 1 / 24) {
          await clock.wait(1 / 30);
          spud.position.set(
            THREE.MathUtils.lerp(start.x, 1.55, t),
            THREE.MathUtils.lerp(start.y, 0.2, t) + Math.sin(t * Math.PI) * 0.9,
            THREE.MathUtils.lerp(start.z, 0.2, t),
          );
        }
        spud.removeFromParent();
        // ...and out comes a baked one, steaming.
        const done = P.bakedPotato();
        baked.push(kit.place(done, 1.55 + rand(-0.3, 0.3), 0.75 + rand(-0.1, 0.1), { scale: 1.2 }));
        if (baked.length > 4) baked.shift()?.removeFromParent();
        kit.fx.smoke({ x: done.position.x, y: 0.2, z: done.position.z }, { color: "#ffffff", size: 0.1, rise: 0.8 });
        actor.face(0);
        actor.hold(spade);
      }
    },
    tick: (_dt, t) => fire?.flicker(t),
  };
}

// ---------------------------------------------------------------------------
// Texas: the pitmaster at the smoker, everyone else at the table, hats on.

function texasScene(): Scene {
  let pit: ReturnType<typeof P.smoker>;
  const plate = new THREE.Vector3(0.95, TABLE.h, -0.15);
  const seats = around(plate.x, plate.z, 0.88, [-1.25, 1.25, Math.PI]);
  return {
    slots: 5,
    async build(kit) {
      pit = P.smoker();
      kit.place(pit.object, -1.15, -0.85, { yaw: 0.3 });
      kit.block(-1.15, -0.85, 0.75);
      const table = await kit.prop("table_round_A", TABLE);
      kit.place(table, plate.x, plate.z);
      kit.block(plate.x, plate.z, TABLE.w / 2);
      for (const s of seats) {
        const chair = await kit.prop("chair_A", CHAIR);
        kit.place(chair, s.x - Math.sin(s.yaw!) * 0.12, s.z - Math.cos(s.yaw!) * 0.12, { yaw: s.yaw! });
      }
      for (let i = 0; i < 3; i++) {
        const a = Math.PI + (i - 1) * 1.25;
        const at = { x: plate.x + Math.sin(a) * 0.36, z: plate.z + Math.cos(a) * 0.36 };
        const dish = await kit.prop("plate", { w: 0.32 });
        kit.place(dish, at.x, at.z, { y: plate.y });
        const meat = await kit.prop("food_ingredient_steak", { w: 0.24 });
        kit.place(meat, at.x, at.z, { y: plate.y + 0.02 });
      }
      kit.place(P.saguaro(), -2.0, 0.55, { scale: 0.8 });
      kit.place(P.tufts(12, 2.1, ["#c9a46a", "#a8b25a"]), 0, 0.6);
    },
    spot(i) {
      if (i === 0) return { x: -0.55, z: -0.6, yaw: -Math.PI * 0.6 };
      if (i === 4) return { x: -0.4, z: 0.75, yaw: 0.3 };
      return seats[i - 1];
    },
    async role(actor, slot, kit, clock) {
      wear(actor, cowboyHat(pick(["#8a5a33", "#d9b77e", "#3a2416", "#f2ece0"])), 0.66);
      if (slot === 0) {
        // The pitmaster: check the meat, big puff of smoke, proud nod.
        for (;;) {
          await beat(clock, 1.5, 3);
          await actor.once(clock, "Interact", "Idle");
          for (let i = 0; i < 6; i++) kit.fx.smoke({ x: -1.15, y: 1.1, z: -0.85 }, { color: "#cfcac4", size: 0.3, rise: 0.8 });
          actor.bounce(0.5);
          if (chance(0.35)) await waveOfJoy(kit, clock);
        }
      }
      if (slot === 4) {
        // Hungry: hovering, rocking on their heels, waiting for the next plate.
        actor.lookAt(kit.toWorld(-1.15, 0.8, -0.85));
        for (;;) {
          await beat(clock, 1.5, 3);
          actor.bounce(0.4);
        }
      }
      await beat(clock, 0.1, 0.4);
      await actor.once(clock, "Sit_Chair_Down", "Sit_Chair_Idle");
      const rib = await kit.prop("food_ingredient_steak", { w: 0.22 });
      actor.hold(rib);
      for (;;) {
        await beat(clock, 1.8, 3.5);
        await actor.gesture(clock, "Spellcast_Raise", "armR", { hold: 0.5 });
        actor.bounce(0.5);
      }
    },
    async ambient(kit, clock) {
      for (;;) {
        await beat(clock, 0.25, 0.5);
        kit.fx.smoke(pit.chimneyTop.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.3).add(new THREE.Vector3(-1.15, 0, -0.85)), {
          color: "#d6d1cb",
          size: 0.22,
        });
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Florida: tank tops, palm trees, and a very determined officer.

function floridaScene(): Scene {
  let cop: Actor | null = null;
  const lights: THREE.PointLight[] = [];
  const C = new THREE.Vector3(0, 0, -0.1);
  const R = 1.15;
  const lapAt = (phase: number) => ({ x: C.x + Math.sin(phase) * R * 1.25, z: C.z + Math.cos(phase) * R * 0.8 });
  let t0 = 0;
  return {
    slots: 4,
    async build(kit) {
      const sand = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.05, 28), P.mat("#f2d49b"));
      sand.scale.set(1, 1, 0.75);
      sand.position.set(0, 0.025, -0.05);
      sand.receiveShadow = true;
      kit.floor.add(sand);
      kit.place(P.palmTree(), 0, -0.15, { scale: 0.8 });
      kit.place(P.palmTree(), -2.0, -1.0, { scale: 0.6, yaw: 1 });
      kit.place(P.palmTree(), 2.05, 0.7, { scale: 0.55, yaw: 2 });
      const car = await kit.prop("car_police", { d: 1.6 });
      kit.place(car, 1.6, -1.25, { yaw: -0.6 });
      for (const [c, x] of [["#ff2a2a", -0.12], ["#2a6bff", 0.12]] as const) {
        const l = new THREE.PointLight(c, 0, 2.5, 1.4);
        l.position.set(1.6 + x, 0.9, -1.25);
        kit.floor.add(l);
        lights.push(l);
      }
      cop = await kit.guest({ ...GUEST, hairStyle: "buzz", facialHair: "mustache", body: "knight", legs: "knight", skin: "#c98f68", hair: "#2b211c", outfit: "#1f2d4d" }, "Officer");
      wear(cop, policeCap(), 0.66);
      cop.root.position.set(lapAt(-1).x, 0, lapAt(-1).z);
      cop.root.visible = false;
    },
    spot: (i, n) => {
      const p = lapAt((i / Math.max(1, n)) * Math.PI * 2 * 0.6);
      return { x: p.x, z: p.z, yaw: 0 };
    },
    async role(actor, slot, _kit, clock) {
      await beat(clock, 0.3, 0.6);
      actor.play("Running_A", { speed: 1.05 });
      for (;;) {
        await clock.wait(1 / 30);
        const ph = t0 * 1.05 + slot * 0.75;
        const p = lapAt(ph);
        const ahead = lapAt(ph + 0.1);
        actor.root.position.set(p.x, 0, p.z);
        actor.faceToward(ahead.x, ahead.z);
        // Every so often someone looks back and nearly gets caught.
        if (chance(0.004)) {
          actor.bounce(0.8);
          actor.play("Dodge_Left", { fade: 0.1 });
          await clock.wait(0.5);
          actor.play("Running_A", { fade: 0.15 });
        }
      }
    },
    async ambient(kit, clock) {
      await clock.wait(1.2);
      if (!cop) return;
      cop.root.visible = true;
      cop.play("Running_B");
      kit.fx.dust(cop.root.position);
      for (;;) {
        await clock.wait(1 / 30);
        const ph = t0 * 1.05 - 0.9;
        const p = lapAt(ph);
        const ahead = lapAt(ph + 0.1);
        cop.root.position.set(p.x, 0, p.z);
        cop.faceToward(ahead.x, ahead.z);
        if (chance(0.006)) {
          // Out of breath. Hands on knees for a moment.
          cop.play("Idle", { fade: 0.2 });
          cop.bounce(0.3);
          await clock.wait(1.0);
          cop.play("Running_B", { fade: 0.2 });
        }
      }
    },
    tick(dt, t) {
      t0 += dt;
      lights.forEach((l, i) => (l.intensity = Math.floor(t * 6 + i) % 2 ? 3 : 0));
    },
  };
}

// ---------------------------------------------------------------------------
// New York: folded slices on the sidewalk, a taxi, some pigeons.

function newYorkScene(): Scene {
  const pigeons: THREE.Group[] = [];
  return {
    slots: 5,
    async build(kit) {
      const walk = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.04, 1.6), P.mat("#c9cdd0"));
      walk.position.set(0, 0.02, 0.35);
      walk.receiveShadow = true;
      kit.floor.add(walk);
      const building = await kit.prop("building_B", { w: 1.5 });
      kit.place(building, -1.45, -2.0);
      const taxi = await kit.prop("car_taxi", { d: 1.6 });
      kit.place(taxi, 1.45, -1.8, { yaw: Math.PI / 2 });
      kit.place(P.streetLamp(), 2.05, -0.3);
      const table = await kit.prop("table_round_A", { w: 1.15, h: TABLE.h });
      kit.place(table, 0, -0.35);
      kit.block(0, -0.35, 0.58);
      kit.place(P.pizza(), 0, -0.35, { y: TABLE.h, scale: 0.85 });
      for (let i = 0; i < 3; i++) {
        const bird = new THREE.Group();
        const body = P.ball(0.1, "#8b97a3");
        body.scale.set(1, 0.85, 1.4);
        const head = P.ball(0.06, "#6b7783");
        head.position.set(0, 0.08, 0.12);
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 4), P.mat("#f5a524"));
        beak.rotation.x = Math.PI / 2;
        beak.position.set(0, 0.08, 0.19);
        bird.add(body, head, beak);
        bird.position.set(-1.6 + i * 0.35, 0.1, 1.0 + (i % 2) * 0.15);
        bird.rotation.y = rand(0, 6);
        kit.floor.add(bird);
        pigeons.push(bird);
      }
    },
    spot: (i) => {
      // Round the front and sides of the table; nobody hidden behind it.
      const s = around(0, -0.35, 0.98, [0, -1.0, 1.0, -1.85, 1.85])[i % 5];
      return { ...s, yaw: s.yaw! * 0.5 };
    },
    async role(actor, slot, kit, clock) {
      await beat(clock, 0.1, 0.5);
      actor.faceToward(0, -0.35);
      await actor.once(clock, "PickUp", "Idle", { speed: 1.2 });
      const slice = P.pizzaSlice();
      actor.hold(slice);
      actor.face(slot % 2 ? 0.5 : -0.5);
      for (;;) {
        await beat(clock, 1.6, 3);
        // Fold, bite, mmm.
        await actor.gesture(clock, "Spellcast_Raise", "armR", { hold: 0.5 });
        actor.bounce(0.5);
        if (chance(0.25)) kit.fx.sparkle(actor.root.position.clone().setY(1.2), "#ffd86b", 0.4);
      }
    },
    tick(_dt, t) {
      pigeons.forEach((b, i) => {
        // Peck, peck, hop.
        b.children[1].position.y = 0.08 - Math.max(0, Math.sin(t * 6 + i * 2)) * 0.06;
        b.position.y = 0.1 + Math.max(0, Math.sin(t * 2.3 + i)) * 0.08;
        b.position.x += Math.sin(t * 0.7 + i * 3) * 0.003;
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Tennessee: a big-haired country singer on a little stage; the family sways.

function tennesseeScene(): Scene {
  let singer: Actor | null = null;
  let spot: THREE.SpotLight | null = null;
  return {
    slots: 5,
    async build(kit) {
      kit.place(P.countryStage(), -0.75, -1.25, { yaw: 0.45 });
      kit.place(P.micStand(), -0.55, -0.95, { y: 0.32 });
      singer = await kit.guest({ ...GUEST, gender: "female", hairStyle: "long", extra: "hoops", body: "rogue", skin: "#f6c6a4", hair: "#f6e2a2", outfit: "#ff5fa2", pants: "#ff5fa2" }, "Singer");
      singer.root.position.set(-0.85, 0.32, -1.15);
      singer.face(0.5);
      // Big, big hair.
      const hair = new THREE.Group();
      for (const [x, y, z, r] of [[0, 0.55, -0.05, 0.42], [-0.3, 0.35, -0.05, 0.3], [0.3, 0.35, -0.05, 0.3], [0, 0.85, -0.1, 0.3]]) {
        const puff = P.ball(r, "#f6e2a2");
        puff.position.set(x, y, z);
        hair.add(puff);
      }
      wear(singer, hair, 0.05);
      wear(singer, cowboyHat("#fbf7f0"), 0.98);
      const g = P.guitar("#e9b52a");
      g.rotation.set(0, 0, -0.9);
      singer.hold(g, "left");
      spot = new THREE.SpotLight("#fff1c8", 8, 5, 0.35, 0.6, 1);
      spot.position.set(0, 3.5, 0.5);
      spot.target.position.set(-0.85, 0.3, -1.15);
      kit.floor.add(spot, spot.target);
    },
    spot: (i) => {
      // A loose crowd to the right, turned toward the stage.
      const x = [0.65, 1.45, 0.25, 1.05, 1.85][i % 5];
      const z = [-0.15, -0.35, 0.65, 0.5, 0.35][i % 5];
      return { x, z, yaw: Math.atan2(-0.85 - x, -1.15 - z) * 0.7 };
    },
    async role(actor, _slot, kit, clock) {
      actor.lookAt(kit.toWorld(-0.85, 1.4, -1.15));
      const lighter = new THREE.Group();
      lighter.add(P.box(0.05, 0.1, 0.03, "#c9312c"));
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 5), P.mat("#ffb02e", { emissive: "#ff9a10" }));
      flame.position.y = 0.14;
      lighter.add(flame);
      for (;;) {
        await beat(clock, 1.5, 3);
        if (chance(0.4)) {
          // Lighter up for the slow one.
          actor.hold(lighter);
          await actor.gesture(clock, "Spellcast_Raise", "armR", { hold: rand(1.5, 2.5) });
          actor.drop(lighter);
        } else {
          actor.bounce(0.5);
          await actor.gesture(clock, "Cheer", "arms", { hold: 0.3 });
        }
      }
    },
    async ambient(kit, clock) {
      for (let n = 0; ; n++) {
        await clock.wait(0.55);
        if (!singer) continue;
        // Strum and sway; notes float out over the crowd.
        singer.bounce(0.25);
        const note = P.note(pick(["#e2364a", "#1d1d22", "#2f6fde", "#e9b52a"]));
        note.scale.setScalar(1.3);
        kit.place(note, -0.7 + rand(-0.3, 0.3), -0.9, { y: 1.5 });
        void (async () => {
          for (let t = 0; t < 1; t += 1 / 50) {
            await clock.wait(1 / 30);
            note.position.y += 0.025;
            note.position.z += 0.02;
            note.position.x += Math.sin(t * 9) * 0.01;
            note.scale.setScalar(1.3 * (1 - t * 0.6));
          }
          note.removeFromParent();
        })().catch(() => note.removeFromParent());
        if (n % 16 === 15) {
          // End of a song: a bow, sparkles, and the crowd goes wild.
          await singer.once(clock, "Cheer", "Idle");
          kit.fx.confetti({ x: -0.8, y: 1.6, z: -1.0 }, ["#ffd34a", "#ff5fa2", "#ffffff"], 40);
          await waveOfJoy(kit, clock);
        }
      }
    },
    tick(_dt, t) {
      if (singer) singer.yawTarget = 0.5 + Math.sin(t * 1.6) * 0.3;
    },
  };
}

// ---------------------------------------------------------------------------
// Wisconsin: cheesehead hats, green and gold, a game of catch by the goalposts.

function wisconsinScene(): Scene {
  let ball: THREE.Object3D;
  let holder = 0;
  return {
    slots: 5,
    build(kit) {
      const field = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.03, 3.4), P.mat("#3f9a4a"));
      field.position.set(0, 0.015, -0.1);
      field.receiveShadow = true;
      kit.floor.add(field);
      for (let i = 0; i < 5; i++) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.035, 0.05), P.mat("#ffffff"));
        line.position.set(0, 0.02, -1.5 + i * 0.75);
        kit.floor.add(line);
      }
      kit.place(P.goalPost(), 0, -1.75, { scale: 1.1 });
      ball = P.football();
      kit.floor.add(ball);
    },
    spot: (i, n) => ring(i, n, 1.2, 0, 0),
    async role(actor, slot, kit, clock) {
      const hat = cheeseHat();
      hat.scale.setScalar(1.1);
      wear(actor, hat, 0.62);
      // Green and gold scarf.
      const scarf = new THREE.Group();
      scarf.add(P.box(0.5, 0.08, 0.1, slot % 2 ? "#1f5135" : "#ffb81c"));
      wear(actor, scarf, -0.05);
      for (;;) {
        await clock.wait(0.2);
        const cast = onStage(kit);
        if (cast[holder % cast.length] !== actor) {
          if (chance(0.01)) actor.bounce(0.5);
          continue;
        }
        // My turn: wind up, throw to someone else.
        const others = cast.filter((a) => a !== actor);
        if (!others.length) {
          await actor.once(clock, "Cheer", "Idle");
          continue;
        }
        const to = pick(others);
        actor.faceToward(to.root.position.x, to.root.position.z);
        to.faceToward(actor.root.position.x, actor.root.position.z);
        await beat(clock, 0.4, 0.8);
        void actor.once(clock, "Throw", "Idle", { speed: 1.2 }).catch(() => {});
        await clock.wait(0.45);
        const a = actor.root.position.clone().setY(1.1);
        const b = to.root.position.clone().setY(1.0);
        ball.visible = true;
        for (let t = 0; t <= 1; t += 1 / 26) {
          await clock.wait(1 / 30);
          ball.position.lerpVectors(a, b, t);
          ball.position.y += Math.sin(t * Math.PI) * 1.1;
          ball.rotation.z += 0.5;
          ball.lookAt(kit.floor.localToWorld(b.clone()));
        }
        // Caught it! Sometimes that calls for a touchdown dance.
        to.bounce(0.8);
        holder = cast.indexOf(to);
        if (chance(0.3)) {
          kit.fx.confetti(to.root.position.clone().setY(1.2), ["#1f5135", "#ffb81c", "#ffffff"], 30);
          void to.once(clock, "Cheer", "Idle").catch(() => {});
        }
      }
    },
    tick() {
      if (!ball) return;
      ball.scale.setScalar(1.2);
    },
  };
}

// ---------------------------------------------------------------------------
// Michigan: everybody piles in the back of the pickup for a lap around.

function michiganScene(): Scene {
  let truck: ReturnType<typeof P.pickup>;
  const seats: [number, number][] = [[-0.24, -0.3], [0.24, -0.62], [-0.24, -0.95], [0.24, -0.05]];
  const riders = new Map<Actor, number>();
  let lap = 0;
  return {
    slots: 4,
    build(kit) {
      const road = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.42, 4, 36), P.mat("#5a6066"));
      road.rotation.x = Math.PI / 2;
      road.scale.set(1.15, 0.85, 0.06);
      road.position.y = 0.01;
      road.receiveShadow = true;
      kit.floor.add(road);
      kit.place(P.tree("pine", "#2f8a4c"), 0, -0.1, { scale: 1.1 });
      kit.place(P.tree("pine", "#358a49"), -0.4, 0.2, { scale: 0.8 });
      kit.place(P.tree("round", "#58b05c"), 0.45, 0.15, { scale: 0.6 });
      kit.place(P.tree("pine", "#2b7d45"), -2.1, -1.2, { scale: 0.9 });
      truck = P.pickup("#2f5fae");
      truck.object.scale.setScalar(1.45);
      kit.floor.add(truck.object);
    },
    spot: (i) => ({ x: seats[i % seats.length][0], z: seats[i % seats.length][1], yaw: 0 }),
    async role(actor, slot, _kit, clock) {
      riders.set(actor, slot);
      try {
        actor.play("Idle");
        for (;;) {
          await beat(clock, 1.2, 2.6);
          if (chance(0.5)) {
            actor.bounce(0.5);
            await actor.gesture(clock, "Cheer", chance(0.5) ? "arms" : "armR", { hold: 0.5 });
          } else {
            actor.bounce(0.25);
          }
        }
      } finally {
        riders.delete(actor);
      }
    },
    async ambient(kit, clock) {
      for (;;) {
        await clock.wait(0.08);
        const back = truck.object.localToWorld(new THREE.Vector3(0, 0.2, -1.3));
        kit.fx.smoke(kit.floor.worldToLocal(back), { color: "#cfc6b8", size: 0.14, rise: 0.25 });
      }
    },
    tick(dt) {
      if (!truck) return;
      lap += dt * 0.42;
      const rx = 1.55;
      const rz = 1.15;
      const x = Math.sin(lap) * rx;
      const z = Math.cos(lap) * rz;
      const nx = Math.sin(lap + 0.05) * rx;
      const nz = Math.cos(lap + 0.05) * rz;
      truck.object.position.set(x, Math.abs(Math.sin(lap * 9)) * 0.03, z);
      truck.object.rotation.y = Math.atan2(nx - x, nz - z);
      truck.wheels.forEach((w) => (w.rotation.x += dt * 8));
      truck.object.updateMatrix();
      for (const [actor, seat] of riders) {
        const local = new THREE.Vector3(seats[seat % seats.length][0], truck.bedTop, seats[seat % seats.length][1]).applyMatrix4(truck.object.matrix);
        actor.root.position.copy(local);
        actor.root.rotation.y = truck.object.rotation.y + (seat % 2 ? 0.6 : -0.6);
        actor.yawTarget = null;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Louisiana: a jazz duo under the street lamp, everyone else dancing.

function louisianaScene(): Scene {
  return {
    slots: 5,
    build(kit) {
      kit.place(P.streetLamp(), -1.9, -0.9);
      kit.place(P.streetLamp(), 1.95, -0.8);
      const balcony = new THREE.Group();
      balcony.add(P.box(3.4, 1.5, 0.3, "#e9c46a"));
      const rail = P.box(3.0, 0.06, 0.06, "#1d1d22");
      rail.position.set(0, 1.0, 0.22);
      balcony.add(rail);
      for (let i = 0; i < 13; i++) {
        const bar = P.box(0.03, 0.3, 0.03, "#1d1d22");
        bar.position.set(-1.45 + i * 0.24, 0.7, 0.22);
        balcony.add(bar);
      }
      for (const x of [-1.1, 0, 1.1]) {
        const door = P.box(0.4, 0.75, 0.02, "#2f6f5e");
        door.position.set(x, 0, 0.16);
        balcony.add(door);
      }
      kit.place(balcony, 0, -1.85);
    },
    spot: (i, n) => {
      if (i === 0) return { x: -0.7, z: -0.9, yaw: 0.25 };
      if (i === 1) return { x: 0.7, z: -0.9, yaw: -0.25 };
      const s = row(i - 2, Math.max(1, n - 2), 0.9, 0.55);
      return s;
    },
    async role(actor, slot, kit, clock) {
      if (slot < 2) {
        const horn = slot === 0 ? P.trumpet() : P.saxophone();
        horn.rotation.set(0, slot === 0 ? Math.PI / 2 : 0, 0);
        actor.hold(horn);
        for (;;) {
          // Up to the lips, blow, notes fly.
          void actor.gesture(clock, "Spellcast_Raise", "armR", { hold: 1.6 }).catch(() => {});
          for (let i = 0; i < 5; i++) {
            await clock.wait(0.35);
            actor.bounce(0.2);
            const n = P.note(pick(["#f5c542", "#9b59d0", "#2fb59a"]));
            n.scale.setScalar(1.2);
            kit.place(n, actor.root.position.x + rand(-0.2, 0.2), actor.root.position.z + 0.2, { y: 1.3 });
            void (async () => {
              for (let t = 0; t < 1; t += 1 / 45) {
                await clock.wait(1 / 30);
                n.position.y += 0.025;
                n.position.x += Math.sin(t * 8) * 0.012;
              }
              n.removeFromParent();
            })().catch(() => n.removeFromParent());
          }
          await beat(clock, 0.4, 1);
        }
      }
      const moves: Clip[] = ["Cheer", "Jump_Full_Short", "Dodge_Left", "Dodge_Right", "Spellcasting"];
      for (;;) {
        const move = pick(moves);
        await actor.once(clock, move, "Idle", { speed: 1.15 });
        actor.bounce(0.4);
        if (chance(0.2)) kit.fx.confetti(actor.root.position.clone().setY(1.4), ["#7b2cbf", "#f5c542", "#2fb59a"], 16);
        await beat(clock, 0.1, 0.5);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Georgia: picking peaches off the trees into the crate.

function georgiaScene(): Scene {
  const trees: ReturnType<typeof P.peachTree>[] = [];
  const crate = new THREE.Vector3(0, 0, -0.45);
  const pile = new THREE.Group();
  return {
    slots: 5,
    async build(kit) {
      for (const [x, z, s] of [[-1.25, -1.15, 1.05], [1.25, -1.25, 1.0], [0, -1.75, 0.85]] as const) {
        const t = P.peachTree();
        kit.place(t.object, x, z, { scale: s });
        trees.push(t);
      }
      const box = await kit.prop("crate", { w: 0.9 });
      kit.place(box, crate.x, crate.z);
      kit.block(crate.x, crate.z, 0.5);
      for (const [x, z] of [[-1.25, -1.15], [1.25, -1.25], [0, -1.75]]) kit.block(x, z, 0.2);
      pile.position.set(crate.x, 0.34, crate.z);
      kit.floor.add(pile);
      kit.place(P.tufts(22, 2.2), 0, 0.3);
    },
    spot: (i, n) => row(i, n, 0.9, 0.55),
    async role(actor, slot, kit, clock) {
      await beat(clock, slot * 0.4, slot * 0.4 + 0.5);
      for (;;) {
        const tree = trees[slot % trees.length];
        const ripe = tree.peaches.filter((p) => p.visible);
        if (!ripe.length) {
          await clock.wait(1);
          continue;
        }
        const peach = pick(ripe);
        const target = kit.floor.worldToLocal(peach.getWorldPosition(new THREE.Vector3()));
        await walkAround(actor, kit, clock, target.x * 0.8, target.z + 0.55);
        actor.faceToward(target.x, target.z);
        await actor.gesture(clock, "Spellcast_Raise", "armR", { hold: 0.2, speed: 1.4 });
        peach.visible = false;
        const mine = P.peach();
        actor.hold(mine);
        actor.bounce(0.6);
        if (chance(0.3)) {
          // One for the crate, and one for me.
          await actor.gesture(clock, "Spellcast_Raise", "armR", { hold: 0.6 });
          actor.drop(mine);
          kit.fx.sparkle(actor.root.position.clone().setY(1.3), "#ffad6b", 0.4);
          actor.face(0);
          await clock.wait(0.6);
          continue;
        }
        await walkAround(actor, kit, clock, crate.x + (slot - 2) * 0.28, crate.z + 0.72);
        actor.faceToward(crate.x, crate.z);
        await actor.gesture(clock, "Interact", "armR", { hold: 0.1, speed: 1.3 });
        actor.drop(mine);
        const p = P.peach();
        p.position.set(rand(-0.28, 0.28), Math.min(0.2, pile.children.length * 0.01), rand(-0.28, 0.28));
        pile.add(p);
        if (pile.children.length > 18) pile.children[0].removeFromParent();
        actor.bounce(0.5);
        // The tree grows another.
        setTimeoutish(clock, 4, () => (peach.visible = true));
      }
    },
  };
}

/** Run something later on the scene's clock (and not at all if the scene closes first). */
function setTimeoutish(clock: Clock, seconds: number, fn: () => void) {
  void clock.wait(seconds).then(fn, () => {});
}

// ---------------------------------------------------------------------------

/** Development only: each person loops one clip, holding a cup and wearing ears, for tuning. */
function labScene(): Scene {
  // ?clips=Cheer,Throw,... on the dev gallery's URL.
  const clips = (new URLSearchParams(window.location.search).get("clips")?.split(",") ?? ["Idle"]) as Clip[];
  return {
    slots: 5,
    build(kit) {
      kit.place(P.lawnChair(), -1.9, 1.2);
    },
    spot: (i, n) => row(i, n, 1.0, 0.4),
    async role(actor, slot, _kit, clock) {
      actor.hold(P.bigCup(), slot === 4 ? "left" : "right");
      if (slot === 0) {
        const ears = P.mouseEars();
        ears.scale.setScalar(1.35);
        wear(actor, ears, 0.62);
      }
      for (;;) {
        actor.play(clips[slot % clips.length], { fade: 0.2 });
        await clock.wait(4);
      }
    },
  };
}

const SCENES: Record<string, (() => Scene)[]> = {
  UT: [utahScene],
  CA: [fireworksScene, surfScene],
  OR: [oregonScene],
  NV: [nevadaScene],
  AZ: [arizonaScene],
  NM: [newMexicoScene],
  ID: [idahoScene],
  TX: [texasScene],
  FL: [floridaScene],
  NY: [newYorkScene],
  TN: [tennesseeScene],
  WI: [wisconsinScene],
  MI: [michiganScene],
  LA: [louisianaScene],
  GA: [georgiaScene],
  LAB: [labScene],
};

export function sceneFor(code: string, turn: number): Scene {
  const list = SCENES[code];
  if (!list) return campfireScene();
  return list[((turn % list.length) + list.length) % list.length]();
}

/** Every state with its own scene (and how many takes it has). */
export const SCENE_CODES = Object.keys(SCENES).filter((c) => c !== "LAB");
export const sceneCount = (code: string) => SCENES[code]?.length ?? 1;
