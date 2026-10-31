import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import type { Member } from "@/lib/types";
import { SIZE_SCALE } from "@/lib/look";
import { glasses, headwear } from "@/components/stage3d/accessories";

/**
 * The family's 3D characters: KayKit's CC0 adventurers (built into public/3d by
 * scripts/build-cast.mjs), each recolored to look like its person — skin, hair
 * and outfit — and driven by one shared set of animation clips.
 */

export { BODIES, BODY_LABELS, HAIR_COLORS, SKIN_TONES, defaultLook, parseLook, type Body, type Look } from "@/lib/look";
import type { Body, Look } from "@/lib/look";

/**
 * The atlas is an 8×4 grid of gradient swatches; these are the cells (column, row)
 * each body uses for its skin, hair and main outfit.
 */
type Cell = [number, number];
const CELLS: Record<Body, { skin: Cell[]; hair: Cell[]; outfit: Cell[]; pants: Cell[] }> = {
  rogue: { skin: [[0, 0]], hair: [[1, 0]], outfit: [[0, 1], [1, 1]], pants: [[3, 2]] },
  barbarian: { skin: [[0, 0]], hair: [[1, 0]], outfit: [[0, 1], [1, 1]], pants: [[3, 2]] },
  knight: { skin: [[0, 0]], hair: [[1, 0]], outfit: [[0, 1], [2, 2]], pants: [] },
  mage: { skin: [[0, 0]], hair: [[1, 0]], outfit: [[0, 1], [1, 1]], pants: [[3, 2]] },
};

const HATS = /_(Hat|Helmet)$/;

// ---------------------------------------------------------------------------
// Loading

let loader: GLTFLoader | null = null;
const files = new Map<string, Promise<GLTF>>();

function load(url: string) {
  loader ??= new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  let p = files.get(url);
  if (!p) {
    p = loader.loadAsync(url);
    p.catch(() => files.delete(url));
    files.set(url, p);
  }
  return p;
}

export const loadBody = (body: Body) => load(`/3d/body-${body}.glb`);
export const loadMoves = () => load("/3d/moves.glb");
export const loadProps = () => load("/3d/props.glb");

/** Start fetching early (on first tap) so the double-tap opens with everyone ready. */
export function warmCast(bodies: Body[] = ["rogue", "barbarian"]) {
  void loadMoves().catch(() => {});
  void loadProps().catch(() => {});
  for (const b of bodies) void loadBody(b).catch(() => {});
}

/** A copy of a prop from props.glb, ready to place. */
export async function prop(name: string): Promise<THREE.Object3D> {
  const gltf = await loadProps();
  const src = gltf.scene.getObjectByName(name);
  if (!src) throw new Error(`No prop ${name}`);
  const copy = src.clone(true);
  copy.position.set(0, 0, 0);
  copy.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return copy;
}

// ---------------------------------------------------------------------------
// Recoloring

const textures = new Map<string, THREE.Texture>();

function recolor(img: CanvasImageSource & { width: number; height: number }, body: Body, look: Look) {
  const key = `${body}|${look.skin}|${look.hair}|${look.outfit}|${look.pants}`;
  const cached = textures.get(key);
  if (cached) return cached;

  // The swatches are smooth gradients, so a quarter-size atlas keeps every detail.
  const W = 256;
  const H = 256;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, W, H);
  const cw = W / 8;
  const ch = H / 4;
  const paint = (cells: [number, number][], hex: string) => {
    const t = new THREE.Color(hex);
    for (const [cx, cy] of cells) {
      const data = ctx.getImageData(cx * cw, cy * ch, cw, ch);
      const px = data.data;
      // Keep the swatch's own light-to-dark gradient; swap its hue and brightness for the target's.
      let mean = 0;
      for (let i = 0; i < px.length; i += 4) mean += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      mean /= px.length / 4 || 1;
      for (let i = 0; i < px.length; i += 4) {
        const l = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
        const k = mean > 1 ? l / mean : 1;
        px[i] = Math.min(255, t.r * 255 * k);
        px[i + 1] = Math.min(255, t.g * 255 * k);
        px[i + 2] = Math.min(255, t.b * 255 * k);
      }
      ctx.putImageData(data, cx * cw, cy * ch);
    }
  };
  const cells = CELLS[body];
  paint(cells.skin, look.skin);
  paint(cells.hair, look.hair);
  paint(cells.outfit, look.outfit);
  paint(cells.pants, look.pants);

  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  textures.set(key, tex);
  return tex;
}

// ---------------------------------------------------------------------------
// Actors

export type Clip =
  | "Idle" | "Unarmed_Idle" | "Walking_A" | "Walking_B" | "Walking_C" | "Walking_Backwards" | "Running_A" | "Running_B"
  | "Cheer" | "Jump_Full_Short" | "Jump_Full_Long" | "Jump_Idle"
  | "Sit_Chair_Down" | "Sit_Chair_Idle" | "Sit_Chair_StandUp" | "Sit_Floor_Down" | "Sit_Floor_Idle" | "Sit_Floor_StandUp"
  | "Lie_Down" | "Lie_Idle" | "Lie_StandUp" | "PickUp" | "Interact" | "Use_Item" | "Throw"
  | "Hit_A" | "Dodge_Left" | "Dodge_Right" | "Spellcasting" | "Spellcast_Raise" | "Spellcast_Shoot" | "Block"
  | "1H_Melee_Attack_Chop" | "2H_Melee_Idle" | "Unarmed_Melee_Attack_Punch_A" | "Death_A";

/** Bones in each body part (GLTFLoader's names: dots stripped). */
const PARTS = {
  armR: ["upperarmr", "lowerarmr", "wristr", "handr", "handslotr"],
  armL: ["upperarml", "lowerarml", "wristl", "handl", "handslotl"],
  arms: ["upperarmr", "lowerarmr", "wristr", "handr", "handslotr", "upperarml", "lowerarml", "wristl", "handl", "handslotl"],
  upper: ["spine", "chest", "head", "upperarmr", "lowerarmr", "wristr", "handr", "handslotr", "upperarml", "lowerarml", "wristl", "handl", "handslotl"],
} as const;
export type Part = keyof typeof PARTS;

export interface PlayOptions {
  fade?: number;
  speed?: number;
  /** Play once and hold the last frame (sitting down, lying down). */
  hold?: boolean;
}

/** Waits that end early when the scene closes. */
export interface Clock {
  wait(seconds: number): Promise<void>;
  readonly alive: boolean;
}

export class Actor {
  readonly root = new THREE.Group();
  readonly model: THREE.Object3D;
  readonly mixer: THREE.AnimationMixer;
  readonly handR: THREE.Object3D;
  readonly handL: THREE.Object3D;
  readonly head: THREE.Object3D | undefined;
  /** Model height in its own units, for scaling to the stage. */
  readonly height: number;
  private current: THREE.AnimationAction | null = null;
  private clips: THREE.AnimationClip[];
  private held: THREE.Object3D[] = [];
  private lookTarget: THREE.Vector3 | null = null;
  private lookWeight = 0;
  private hop = { t: 0, dur: 0, h: 0 };
  /** Squash and stretch on top of the clip, for pops and landings. */
  private squash = { y: 1, v: 0 };

  constructor(
    model: THREE.Object3D,
    clips: THREE.AnimationClip[],
    public readonly member: Member,
    public readonly look: Look,
  ) {
    this.model = model;
    this.clips = clips;
    this.root.add(model);
    this.mixer = new THREE.AnimationMixer(model);
    // GLTFLoader strips dots from node names ("handslot.r" arrives as "handslotr").
    this.handR = model.getObjectByName("handslotr") ?? model.getObjectByName("handslot.r") ?? model;
    this.handL = model.getObjectByName("handslotl") ?? model.getObjectByName("handslot.l") ?? model;
    this.head = model.getObjectByName("head");
    const box = new THREE.Box3().setFromObject(model);
    this.height = Math.max(1, box.max.y - Math.max(0, box.min.y));
  }

  play(name: Clip, { fade = 0.25, speed = 1, hold = false }: PlayOptions = {}) {
    const clip = THREE.AnimationClip.findByName(this.clips, name);
    if (!clip) return null;
    const next = this.mixer.clipAction(clip);
    if (next === this.current && !hold) return next;
    next.reset();
    next.timeScale = speed;
    next.setLoop(hold ? THREE.LoopOnce : THREE.LoopRepeat, hold ? 1 : Infinity);
    next.clampWhenFinished = hold;
    next.enabled = true;
    next.setEffectiveWeight(1);
    if (this.current && this.current !== next) {
      next.play();
      this.current.crossFadeTo(next, fade, false);
    } else {
      next.fadeIn(fade).play();
    }
    this.current = next;
    return next;
  }

  private gestures = new Map<string, THREE.AnimationAction>();

  /**
   * Layer just part of a clip on top of whatever the body is doing — a sip
   * while sitting, a wave while riding. Plays the clip's motion relative to its
   * first frame, so it adds to the current pose instead of replacing it.
   */
  async gesture(clock: Clock, name: Clip, part: Part = "armR", { hold = 0.6, speed = 1, upTo = 0.55 }: { hold?: number; speed?: number; upTo?: number } = {}) {
    const key = `${name}|${part}`;
    let action = this.gestures.get(key);
    if (!action) {
      const src = THREE.AnimationClip.findByName(this.clips, name);
      if (!src) return;
      const bones = PARTS[part];
      const clip = src.clone();
      clip.tracks = clip.tracks.filter((t) => (bones as readonly string[]).includes(t.name.split(".")[0]));
      clip.name = `${name}~${part}`;
      THREE.AnimationUtils.makeClipAdditive(clip);
      action = this.mixer.clipAction(clip);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      this.gestures.set(key, action);
    }
    const len = action.getClip().duration * upTo;
    action.reset();
    action.timeScale = speed;
    action.setEffectiveWeight(1);
    action.fadeIn(0.2).play();
    // Rise to the gesture's peak, hold it there, then let it go.
    await clock.wait(len / speed);
    action.paused = true;
    await clock.wait(hold);
    action.paused = false;
    action.fadeOut(0.35);
    await clock.wait(0.35);
    action.stop();
  }

  /** Play a clip through once, then settle into `then`. Resolves when it ends. */
  async once(clock: Clock, name: Clip, then: Clip = "Idle", { speed = 1, fade = 0.2 }: PlayOptions = {}) {
    const action = this.play(name, { fade, speed, hold: true });
    if (!action) return;
    await clock.wait(Math.max(0.1, action.getClip().duration / speed - fade));
    this.play(then, { fade });
  }

  /** Walk (or run) to a spot on the stage floor, turning to face the way. */
  async walkTo(clock: Clock, x: number, z: number, { run = false, then = "Idle" as Clip, speed }: { run?: boolean; then?: Clip; speed?: number } = {}) {
    const from = this.root.position.clone();
    const to = new THREE.Vector3(x, from.y, z);
    const dist = from.distanceTo(to);
    if (dist < 0.05) return;
    const v = speed ?? (run ? 3.2 : 1.35);
    this.play(run ? "Running_A" : "Walking_A", { fade: 0.2, speed: run ? 1 : 1.05 });
    this.faceToward(x, z);
    const steps = Math.ceil((dist / v) * 30);
    for (let i = 1; i <= steps && clock.alive; i++) {
      await clock.wait(1 / 30);
      this.root.position.lerpVectors(from, to, i / steps);
    }
    this.play(then, { fade: 0.25 });
  }

  /** Turn smoothly toward a point (handled each frame in update). */
  faceToward(x: number, z: number) {
    const dx = x - this.root.position.x;
    const dz = z - this.root.position.z;
    if (Math.abs(dx) + Math.abs(dz) < 1e-4) return;
    this.yawTarget = Math.atan2(dx, dz);
  }

  face(yaw: number) {
    this.yawTarget = yaw;
  }

  yawTarget: number | null = null;

  /** Glance at something (a firework, the singer); null to stop. Rides on top of the clip. */
  lookAt(target: THREE.Vector3 | null) {
    this.lookTarget = target;
  }

  /** Stage units per model unit (set when the stage sizes the actor). */
  unitScale = 1;

  /**
   * Put a prop in a hand (or on the head); returns it so the scene can animate it.
   * Props are sized in stage units, so undo the actor's own scale.
   */
  hold(object: THREE.Object3D, hand: "right" | "left" | "head" = "right") {
    const bone = hand === "right" ? this.handR : hand === "left" ? this.handL : (this.head ?? this.model);
    // A scene's hat (cowboy hat, cheesehead, mouse ears) replaces their own.
    if (hand === "head") this.showHeadwear(false);
    // The hand slots run along the fingers; a quarter turn stands a held thing upright in the fist.
    const grip = new THREE.Group();
    if (hand === "right") grip.rotation.z = Math.PI / 2;
    if (hand === "left") grip.rotation.z = -Math.PI / 2;
    grip.scale.setScalar(1 / this.unitScale);
    grip.add(object);
    bone.add(grip);
    this.held.push(grip);
    return object;
  }

  /** Drop everything they're holding or wearing. */
  emptyHands() {
    for (const o of this.held) o.removeFromParent();
    this.held = [];
    this.showHeadwear(true);
  }

  private showHeadwear(on: boolean) {
    this.model.traverse((o) => {
      if (o.userData.headwear) o.visible = on && (o.type === "Group" || this.look.hat);
    });
  }

  /** Kid, teen or grown-up, relative to the stage's standard height. */
  get sizeScale() {
    return SIZE_SCALE[this.look.size] ?? 1;
  }

  drop(object: THREE.Object3D) {
    const grip = object.parent;
    object.removeFromParent();
    if (grip && this.held.includes(grip)) {
      grip.removeFromParent();
      this.held = this.held.filter((o) => o !== grip);
    }
  }

  /** A little bounce, as if delighted. */
  bounce(strength = 1) {
    this.squash.v -= 3.5 * strength;
    this.hop = { t: 0, dur: 0.42, h: 0.3 * strength };
  }

  update(dt: number) {
    this.mixer.update(dt);

    if (this.yawTarget !== null) {
      let d = this.yawTarget - this.root.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.root.rotation.y += d * Math.min(1, dt * 9);
    }

    // Squash-and-stretch spring and a hop, layered on the clip.
    const s = this.squash;
    s.v += (-(s.y - 1) * 170 - s.v * 11) * dt;
    s.y += s.v * dt;
    this.model.scale.set(1 / Math.sqrt(Math.max(0.5, s.y)), s.y, 1 / Math.sqrt(Math.max(0.5, s.y)));
    const hop = this.hop;
    if (hop.t < hop.dur) {
      hop.t = Math.min(hop.dur, hop.t + dt);
      this.model.position.y = Math.sin((hop.t / hop.dur) * Math.PI) * hop.h;
    } else {
      this.model.position.y = 0;
    }

    // Head turns toward whatever they're watching, after the clip has set its pose.
    this.lookWeight = THREE.MathUtils.damp(this.lookWeight, this.lookTarget ? 1 : 0, 5, dt);
    if (this.head && this.lookTarget && this.lookWeight > 0.01) {
      const headPos = this.head.getWorldPosition(new THREE.Vector3());
      const local = this.root.worldToLocal(this.lookTarget.clone());
      const localHead = this.root.worldToLocal(headPos);
      const dir = local.sub(localHead);
      const yaw = THREE.MathUtils.clamp(Math.atan2(dir.x, dir.z), -1.1, 1.1);
      const pitch = THREE.MathUtils.clamp(Math.atan2(dir.y, Math.hypot(dir.x, dir.z)), -0.5, 0.7);
      this.head.rotation.y += yaw * this.lookWeight * 0.8;
      this.head.rotation.x -= pitch * this.lookWeight * 0.6;
    }
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
    for (const o of this.held) o.parent?.remove(o);
    this.root.removeFromParent();
  }
}

/** Build one person's character. */
export async function makeActor(member: Member, look: Look): Promise<Actor> {
  const [body, moves] = await Promise.all([loadBody(look.body), loadMoves()]);
  const model = SkeletonUtils.clone(body.scene);
  let material: THREE.MeshStandardMaterial | null = null;
  model.traverse((o) => {
    const mesh = o as THREE.SkinnedMesh;
    if (!mesh.isMesh) return;
    if (HATS.test(mesh.name) || HATS.test(mesh.parent?.name ?? "")) {
      mesh.visible = look.hat;
      mesh.userData.headwear = true;
    }
    if (/Mug/.test(mesh.name) || /Mug/.test(mesh.parent?.name ?? "")) mesh.visible = false;
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    if (!material) {
      const src = mesh.material as THREE.MeshStandardMaterial;
      const img = src.map?.image as (CanvasImageSource & { width: number; height: number }) | undefined;
      material = new THREE.MeshStandardMaterial({
        map: img ? recolor(img, look.body, look) : src.map,
        roughness: 0.85,
        metalness: 0,
      });
    }
    mesh.material = material;
  });
  const actor = new Actor(model, moves.animations, member, look);
  // Their glasses and headwear ride on the head bone, sized to this model.
  if (actor.head) {
    const k = actor.height / 1.55;
    for (const [extra, isHat] of [
      [glasses(look.glasses), false],
      [headwear(look.headwear, look.outfit), true],
    ] as const) {
      if (!extra) continue;
      const holder = new THREE.Group();
      holder.scale.setScalar(k);
      holder.add(extra);
      holder.userData.headwear = isHat;
      extra.traverse((o) => (o.castShadow = true));
      actor.head.add(holder);
    }
  }
  return actor;
}
