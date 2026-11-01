import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { Actor, makeActor, prop, type Clock, type Look } from "@/components/stage3d/cast";
import { Effects } from "@/components/stage3d/effects";
import type { Member } from "@/lib/types";

/**
 * One lifted state: the outline extruded into a solid slab in the map's color,
 * rising out of the map and tipping back, with the family acting out the
 * state's activity on top. World units are CSS pixels of the map box, so the
 * slab starts exactly where the state sits on the map.
 */

export const TILT = THREE.MathUtils.degToRad(52);
/** Characters stand this many stage units tall. */
const ACTOR_HEIGHT = 1.55;
/** The stage floor reaches this far from its center, in stage units. */
export const STAGE_RADIUS = 2.4;

export class Cancelled extends Error {}

interface Wait {
  until: number;
  resolve: () => void;
  reject: (e: Error) => void;
  owner: ClockImpl;
}

class ClockImpl implements Clock {
  alive = true;
  constructor(private stage: Stage) {}
  wait(seconds: number) {
    if (!this.alive) return Promise.reject(new Cancelled());
    return new Promise<void>((resolve, reject) =>
      this.stage.waits.push({ until: this.stage.time + seconds, resolve, reject, owner: this }),
    );
  }
  kill() {
    this.alive = false;
    for (const w of this.stage.waits) if (w.owner === this) w.reject(new Cancelled());
    this.stage.waits = this.stage.waits.filter((w) => w.owner !== this);
  }
}

/** Where someone stands on the stage floor (stage units; +z is toward the viewer). */
export interface Spot {
  x: number;
  z: number;
  /** Facing; 0 = toward the viewer. */
  yaw?: number;
}

/** What a scene gets to work with. */
export interface StageKit {
  floor: THREE.Group;
  fx: Effects;
  clock: Clock;
  /** The family on stage right now, by slot. */
  cast: (Actor | null)[];
  /** World-space position of a point on the floor (for glances). */
  toWorld(x: number, y: number, z: number): THREE.Vector3;
  place(object: THREE.Object3D, x: number, z: number, opts?: { yaw?: number; scale?: number; y?: number }): THREE.Object3D;
  /** A character who isn't family (a singer, a police officer), placed and updated with the rest. */
  guest(look: Look, name: string): Promise<Actor>;
  /**
   * Copy of a KayKit prop by name, sized to real dimensions in stage units (a
   * person is 1.55 tall): `w` across, `d` deep, `h` tall. One of them scales it
   * evenly; `w` with `h` sets the footprint and the height separately.
   */
  prop(name: string, fit: { w?: number; d?: number; h?: number }): Promise<THREE.Object3D>;
  /** Things people walk around (circles on the floor). */
  obstacles: { x: number; z: number; r: number }[];
  block(x: number, z: number, r: number): void;
}

export interface Scene {
  /** How many people act at once (the rest rotate in). */
  slots: number;
  /** Props and scenery; runs once before anyone appears. */
  build(kit: StageKit): Promise<void> | void;
  spot(slot: number, filled: number): Spot;
  /** What one person does while they're on stage. Loops until the clock dies. */
  role(actor: Actor, slot: number, kit: StageKit, clock: Clock): Promise<void>;
  /** Scenery that keeps going on its own (fireworks, smoke). */
  ambient?(kit: StageKit, clock: Clock): Promise<void>;
  /** Called every frame, for props that move. */
  tick?(dt: number, time: number): void;
}

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const springOut = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);

export interface StageOptions {
  canvas: HTMLCanvasElement;
  size: { w: number; h: number };
  /** The state's outline (SVG path in map units) and its box. */
  d: string;
  bounds: [[number, number], [number, number]];
  /** Map units → CSS px on the map. */
  ppu: number;
  gold: boolean;
  dark: boolean;
  people: { member: Member; look: Look }[];
  scene: Scene;
  reducedMotion: boolean;
}

export class Stage {
  time = 0;
  waits: Wait[] = [];
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private slab = new THREE.Group();
  private floor = new THREE.Group();
  private fx = new Effects();
  private actors: Actor[] = [];
  private guests: Actor[] = [];
  private slotClocks: (ClockImpl | null)[] = [];
  private onStage: (Actor | null)[] = [];
  private queue: Actor[] = [];
  private master: ClockImpl;
  private intro = { t: 0, from: new THREE.Vector3(), fromScale: 1 };
  private goal = new THREE.Vector3();
  private disposed = false;
  private last = 0;
  private sun: THREE.DirectionalLight;
  private unit = 1;
  private kit: StageKit;
  private ready = false;
  private outro: { t: number; done: () => void } | null = null;

  constructor(private o: StageOptions) {
    const { canvas, size } = o;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(size.w, size.h, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    // A camera that sees the map plane (z = 0) at 1 world unit per CSS pixel.
    const fov = 30;
    this.camera = new THREE.PerspectiveCamera(fov, size.w / size.h, 1, 20000);
    const dist = size.h / 2 / Math.tan(THREE.MathUtils.degToRad(fov / 2));
    this.camera.position.set(size.w / 2, -size.h / 2, dist);
    this.camera.lookAt(size.w / 2, -size.h / 2, 0);

    this.scene.add(new THREE.HemisphereLight(0xffffff, o.dark ? 0x2a3a40 : 0xb9c8cc, o.dark ? 1.5 : 1.9));
    this.sun = new THREE.DirectionalLight(0xfff3e2, o.dark ? 2.2 : 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.02;
    this.sun.shadow.radius = 4;
    this.scene.add(this.sun, this.sun.target);

    this.scene.add(this.slab);
    this.buildSlab();
    this.master = new ClockImpl(this);
    this.kit = this.makeKit();
    this.renderer.setAnimationLoop((t) => this.frame(t));
  }

  private buildSlab() {
    const { d, ppu, gold, size } = this.o;
    const svg = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`);
    const shapes = svg.paths.flatMap((p) => p.toShapes());

    // Every state plays on the same size of stage: grow the slab until its roomiest
    // spot holds a full stage (Florida's peninsula zooms in; Colorado barely grows),
    // and put that spot in the middle of the view.
    const pole = poleOfInaccessibility(shapes);
    const stagePx = Math.min(165, 0.235 * Math.min(size.w, size.h * 1.45));
    const [[x0, y0], [x1, y1]] = this.o.bounds;
    const fitK = Math.min((size.w * 0.7) / ((x1 - x0) * ppu), (size.h * 1.05) / ((y1 - y0) * ppu));
    const needK = stagePx / (pole.r * ppu * 0.92);
    const k = THREE.MathUtils.clamp(Math.max(fitK, needK), 1, 60);
    const s = ppu * k;
    this.unit = stagePx / STAGE_RADIUS;

    const thick = Math.max(12, Math.min(26, stagePx * 0.12)) / s;
    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth: thick,
      bevelEnabled: true,
      bevelThickness: thick * 0.22,
      bevelSize: thick * 0.22,
      bevelSegments: 2,
      curveSegments: 4,
    });
    // Centered on the stage spot. SVG is y-down: the mesh's negative y scale flips it
    // (three.js flips the face winding for mirrored objects, so the slab stays solid).
    geo.translate(-pole.x, -pole.y, 0);

    const top = new THREE.MeshStandardMaterial({ color: gold ? "#f0b52a" : "#1aa898", roughness: 0.82 });
    const side = new THREE.MeshStandardMaterial({ color: gold ? "#b07a0a" : "#0c6168", roughness: 0.9 });
    const mesh = new THREE.Mesh(geo, [top, side]);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    mesh.scale.set(s, -s, s);
    this.slab.add(mesh);

    // The stage floor sits on the top face, right over the slab's origin.
    this.floor.position.set(0, 0, thick * 1.22 * s);
    this.floor.rotation.x = Math.PI / 2;
    this.floor.scale.setScalar(this.unit);
    this.slab.add(this.floor);
    this.floor.add(this.fx.points);

    // Start exactly on the map, flat and map-sized; the intro lifts it into place.
    this.intro.from.set(pole.x * ppu, -pole.y * ppu, 0);
    this.intro.fromScale = 1 / k;
    this.goal.set(size.w / 2, -size.h * 0.64, 40);
    this.slab.position.copy(this.intro.from);
    this.slab.scale.setScalar(this.intro.fromScale);

    // Sun from the upper left; the shadow map only needs to cover the stage.
    const span = stagePx * 1.7;
    const cam = this.sun.shadow.camera;
    cam.left = cam.bottom = -span;
    cam.right = cam.top = span;
    cam.near = 1;
    cam.far = span * 10;
    cam.updateProjectionMatrix();
  }

  private makeKit(): StageKit {
    const floor = this.floor;
    const obstacles: StageKit["obstacles"] = [];
    return {
      floor,
      fx: this.fx,
      clock: this.master,
      cast: this.onStage,
      toWorld: (x, y, z) => floor.localToWorld(new THREE.Vector3(x, y, z)),
      place: (object, x, z, { yaw = 0, scale = 1, y = 0 } = {}) => {
        object.position.set(x, y, z);
        object.rotation.y = yaw;
        object.scale.multiplyScalar(scale);
        floor.add(object);
        return object;
      },
      guest: async (look, name) => {
        const actor = await makeActor({ userId: `guest-${name}`, displayName: name, color: look.outfit, avatarUrl: null }, look);
        this.fit(actor);
        actor.play("Idle", { fade: 0 });
        floor.add(actor.root);
        this.guests.push(actor);
        if (this.disposed) actor.dispose();
        return actor;
      },
      prop: async (name, fit) => {
        const object = await prop(name);
        const size = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
        const even = fit.w ? fit.w / size.x : fit.d ? fit.d / size.z : fit.h ? fit.h / size.y : 1;
        const tall = fit.h && (fit.w || fit.d) ? fit.h / size.y : even;
        object.scale.set(even, tall, even);
        return object;
      },
      obstacles,
      block: (x, z, r) => void obstacles.push({ x, z, r }),
    };
  }

  /** Load everyone, build the scenery, then bring the cast on. */
  async start() {
    const { scene, people } = this.o;
    const built = Promise.resolve(scene.build(this.kit));
    const actors = await Promise.all(
      people.map(async ({ member, look }) => {
        try {
          return await makeActor(member, look);
        } catch {
          return null;
        }
      }),
    );
    await built;
    if (this.disposed) {
      for (const a of actors) a?.dispose();
      return;
    }
    this.actors = actors.filter((a): a is Actor => Boolean(a));
    for (const a of this.actors) {
      this.fit(a);
      a.root.visible = false;
      this.floor.add(a.root);
    }
    this.ready = true;

    const n = Math.min(scene.slots, this.actors.length);
    this.onStage.length = n;
    this.slotClocks = new Array(n).fill(null);
    this.queue = this.actors.slice(n);
    // Wait for the slab to settle, then pop everyone in one after another.
    await this.master.wait(this.o.reducedMotion ? 0 : 0.75).catch(() => {});
    if (this.disposed) return;
    if (scene.ambient) scene.ambient(this.kit, this.master).catch(swallow);
    for (let i = 0; i < n; i++) {
      this.enter(this.actors[i], i, n);
      await this.master.wait(0.16).catch(() => {});
      if (this.disposed) return;
    }
    if (this.queue.length) this.rotate().catch(swallow);
  }

  private fit(actor: Actor) {
    actor.unitScale = (ACTOR_HEIGHT * actor.sizeScale) / actor.height;
    actor.root.scale.setScalar(actor.unitScale);
  }

  private enter(actor: Actor, slot: number, filled: number) {
    const spot = this.o.scene.spot(slot, filled);
    actor.root.position.set(spot.x, 0, spot.z);
    actor.root.rotation.y = spot.yaw ?? 0;
    actor.yawTarget = spot.yaw ?? 0;
    actor.root.visible = true;
    actor.play("Idle", { fade: 0 });
    actor.bounce(1.1);
    this.popIn(actor);
    this.fx.dust({ x: spot.x, y: 0, z: spot.z });
    this.onStage[slot] = actor;
    const clock = new ClockImpl(this);
    this.slotClocks[slot] = clock;
    this.o.scene.role(actor, slot, this.kit, clock).catch(swallow);
  }

  private popIn(actor: Actor) {
    const base = actor.root.scale.x;
    const start = this.time;
    const tick = () => {
      const k = Math.min(1, (this.time - start) / 0.45);
      actor.root.scale.setScalar(base * Math.max(0.01, springOut(k)));
      if (k < 1 && !this.disposed) this.afterFrame.push(tick);
    };
    actor.root.scale.setScalar(base * 0.01);
    this.afterFrame.push(tick);
  }

  private afterFrame: (() => void)[] = [];

  /** With more family than spots, someone waves goodbye and the next person pops in. */
  private async rotate() {
    let slot = 0;
    while (!this.disposed) {
      await this.master.wait(8.5);
      const leaving = this.onStage[slot];
      const next = this.queue.shift();
      if (!leaving || !next) continue;
      this.slotClocks[slot]?.kill();
      leaving.play("Cheer", { fade: 0.2 });
      leaving.bounce(0.8);
      await this.master.wait(0.9);
      // Shrink away.
      const base = leaving.root.scale.x;
      for (let i = 1; i <= 8; i++) {
        await this.master.wait(1 / 30);
        leaving.root.scale.setScalar(base * (1 - i / 8));
      }
      leaving.root.visible = false;
      leaving.root.scale.setScalar(base);
      this.fx.sparkle(leaving.root.position, "#ffffff", 0.5);
      this.queue.push(leaving);
      leaving.emptyHands();
      this.enter(next, slot, this.onStage.length);
      slot = (slot + 1) % this.onStage.length;
    }
  }

  /** Play the drop back onto the map, then resolve. */
  close() {
    return new Promise<void>((done) => {
      if (this.o.reducedMotion || this.disposed) return done();
      this.outro = { t: 0, done };
    });
  }

  private frame(now: number) {
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 1 / 60;
    this.last = now;
    this.time += dt;

    // Resolve waits that are due (in order; one may queue more).
    if (this.waits.length) {
      const due = this.waits.filter((w) => w.until <= this.time);
      if (due.length) {
        this.waits = this.waits.filter((w) => w.until > this.time);
        for (const w of due) w.resolve();
      }
    }

    // Intro: up off the map, bigger, tipped back.
    const { size } = this.o;
    const goal = this.goal;
    if (this.outro) {
      this.outro.t = Math.min(1, this.outro.t + dt / 0.35);
      const k = ease(this.outro.t);
      this.slab.position.lerpVectors(goal, this.intro.from, k);
      this.slab.scale.setScalar(THREE.MathUtils.lerp(1, this.intro.fromScale, k));
      this.slab.rotation.x = -TILT * (1 - k);
      if (this.outro.t >= 1) {
        const done = this.outro.done;
        this.outro = null;
        done();
      }
    } else if (this.intro.t < 1) {
      this.intro.t = this.o.reducedMotion ? 1 : Math.min(1, this.intro.t + dt / 0.85);
      const k = springOut(this.intro.t);
      const kp = ease(this.intro.t);
      this.slab.position.lerpVectors(this.intro.from, goal, kp);
      this.slab.scale.setScalar(THREE.MathUtils.lerp(this.intro.fromScale, 1, kp));
      this.slab.rotation.x = -TILT * Math.min(1.08, k);
    }

    // Keep the sun up and to the left of the slab, wherever it is.
    const c = this.slab.position;
    const reach = this.unit * STAGE_RADIUS;
    this.sun.position.set(c.x - reach * 1.6, c.y + reach * 2.6, c.z + reach * 4.5);
    this.sun.target.position.copy(c);
    void size;

    this.fx.setScale(this.unit * this.camera.position.z * 1.1);
    for (const a of this.onStage) a?.update(dt);
    for (const g of this.guests) g.update(dt);
    this.o.scene.tick?.(dt, this.time);
    this.fx.update(dt, this.time);
    const after = this.afterFrame;
    this.afterFrame = [];
    for (const f of after) f();

    this.renderer.render(this.scene, this.camera);
  }

  resize(size: { w: number; h: number }) {
    this.o.size = size;
    this.renderer.setSize(size.w, size.h, false);
  }

  get isReady() {
    return this.ready;
  }

  dispose() {
    this.disposed = true;
    this.master.kill();
    for (const c of this.slotClocks) c?.kill();
    this.renderer.setAnimationLoop(null);
    for (const a of [...this.actors, ...this.guests]) a.dispose();
    this.fx.dispose();
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        // Recolored character textures are cached across scenes; only dispose what's ours.
        for (const m of mats) if (!(m as THREE.MeshStandardMaterial).map) m.dispose();
      }
    });
    this.renderer.dispose();
  }
}

function swallow(e: unknown) {
  if (!(e instanceof Cancelled)) console.error(e);
}

/**
 * The spot deepest inside the outline (in map units) and how far it is from the
 * nearest edge: where the family can stand without falling off.
 */
function poleOfInaccessibility(shapes: THREE.Shape[]) {
  // Biggest piece of land only (Michigan's lower peninsula, Hawaii's big island).
  let best = shapes[0];
  let bestArea = 0;
  for (const s of shapes) {
    const a = Math.abs(THREE.ShapeUtils.area(s.getPoints()));
    if (a > bestArea) {
      bestArea = a;
      best = s;
    }
  }
  const ring = best.getPoints(6);
  const holes = best.holes.map((h) => h.getPoints(6));
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of ring) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const inside = (x: number, y: number, pts: THREE.Vector2[]) => {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i], b = pts[j];
      if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c;
    }
    return c;
  };
  const edgeDist = (x: number, y: number) => {
    let d = Infinity;
    for (const pts of [ring, ...holes]) {
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const a = pts[j], b = pts[i];
        const dx = b.x - a.x, dy = b.y - a.y;
        const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)));
        d = Math.min(d, Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy)));
      }
    }
    return d;
  };
  let out = { x: (minX + maxX) / 2, y: (minY + maxY) / 2, r: 0 };
  const N = 28;
  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= N; j++) {
      const x = minX + ((maxX - minX) * i) / N;
      const y = minY + ((maxY - minY) * j) / N;
      if (!inside(x, y, ring) || holes.some((h) => inside(x, y, h))) continue;
      const r = edgeDist(x, y);
      if (r > out.r) out = { x, y, r };
    }
  }
  return out;
}
