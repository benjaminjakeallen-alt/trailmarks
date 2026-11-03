import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import type { Member } from "@/lib/types";
import { BUILD_WIDTH, SIZE_SCALE, tone } from "@/lib/look";
import { gear, glasses, headwear } from "@/components/stage3d/accessories";
import { dress, torsoOf } from "@/components/stage3d/wardrobe";
import { HAT_BAND, HEAD_FORMS, faceMarks, fitHat, fitHead, pointsOf, jawOf, shapeHead, skullFor, type FaceMarks, type HeadFit } from "@/components/stage3d/fit";
import { SCULPTED, builtFacialHair, builtHair, extraPieces, fullSkull, lashes, skull, skullColor, splitHead, transplant, type HeadShape } from "@/components/stage3d/hair";

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

/** A character's height (feet to the top of the head) per unit of neck height, in the shared skeleton's rest pose. */
const MODEL_PER_NECK = 1.8;

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

/**
 * Tone props.glb's own colors down once (it's shared): its texture sheets lose
 * some saturation, plain colors are calmed like the procedural props.
 */
function calmProps(gltf: GLTF) {
  if (gltf.userData.calmed) return;
  gltf.userData.calmed = true;
  const sheets = new Map<THREE.Texture, THREE.Texture>();
  gltf.scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const m of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.MeshStandardMaterial[]) {
      if (!m.isMeshStandardMaterial || m.userData.calmed) continue;
      m.userData.calmed = true;
      m.color.set(tone(`#${m.color.getHexString()}`, { maxS: 0.4, minL: 0.06, maxL: 0.95 }));
      const img = m.map?.image as (CanvasImageSource & { width: number; height: number }) | undefined;
      if (!m.map || !img?.width) continue;
      let calm = sheets.get(m.map);
      if (!calm) {
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(512, img.width);
        canvas.height = Math.min(512, img.height);
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const px = data.data;
        for (let i = 0; i < px.length; i += 4) {
          const l = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
          for (let c = 0; c < 3; c++) px[i + c] = l + (px[i + c] - l) * PROP_SATURATION;
        }
        ctx.putImageData(data, 0, 0);
        calm = new THREE.CanvasTexture(canvas);
        calm.flipY = m.map.flipY;
        calm.colorSpace = m.map.colorSpace;
        calm.wrapS = m.map.wrapS;
        calm.wrapT = m.map.wrapT;
        sheets.set(m.map, calm);
      }
      m.map = calm;
      m.needsUpdate = true;
    }
  });
}

/** How much of props.glb's texture saturation stays. */
const PROP_SATURATION = 0.55;

/** A copy of a prop from props.glb, ready to place. */
export async function prop(name: string): Promise<THREE.Object3D> {
  const gltf = await loadProps();
  calmProps(gltf);
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
/** How much of the texture's color saturation stays (the app's look is calm, not candy). */
const SHEET_SATURATION = 0.82;

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
  let skinOut = "";
  paint(cells.skin, look.skin);
  paint(cells.hair, look.hair);
  // The painted skin, as it actually comes out: the bald scalp is matched to it.
  {
    const [cx, cy] = cells.skin[0];
    const d = ctx.getImageData(cx * cw + cw * 0.2, cy * ch + ch * 0.55, cw * 0.5, ch * 0.35).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) {
      r += d[i];
      g += d[i + 1];
      b += d[i + 2];
    }
    const n = d.length / 4 || 1;
    skinOut = new THREE.Color().setRGB(r / n / 255, g / n / 255, b / n / 255, THREE.SRGBColorSpace).getHexString();
  }
  paint(cells.outfit, tone(look.outfit));
  paint(cells.pants, tone(look.pants));
  // KayKit's own trims (belts, buckles, straps) are toy-bright: calm the whole sheet a touch.
  {
    const data = ctx.getImageData(0, 0, W, H);
    const px = data.data;
    for (let i = 0; i < px.length; i += 4) {
      const l = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      for (let c = 0; c < 3; c++) px[i + c] = l + (px[i + c] - l) * SHEET_SATURATION;
    }
    ctx.putImageData(data, 0, 0);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.skin = `#${skinOut}`;
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
  /** Model height in its own units, for scaling to the stage (the same for everyone: see below). */
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
    // Everyone is measured by the one skeleton they share, never by their hair,
    // hat or costume: so the same person is the same size whatever they wear.
    model.updateMatrixWorld(true);
    const neck = this.head?.getWorldPosition(new THREE.Vector3()).y ?? 0;
    if (neck > 0.1) {
      this.height = neck * MODEL_PER_NECK;
    } else {
      const box = new THREE.Box3().setFromObject(model);
      this.height = Math.max(1, box.max.y - Math.max(0, box.min.y));
    }
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

  /** This head as measured (set by makeActor): where the eyes, hair and hat band are. */
  fit: HeadFit | null = null;

  /**
   * Put something on their head, in the same units as their own hats (so it's
   * sized to them, kid or grown-up): `hat` fits it like a hat whose opening has
   * that radius, `top` sets it on top of the head or hair, `y` places it as is.
   */
  wear(object: THREE.Object3D, how: { hat: number; lift?: number } | { top: number } | { y: number }) {
    if (!this.head) return object;
    this.showHeadwear(false);
    const holder = new THREE.Group();
    holder.scale.setScalar(this.height / 1.55);
    const fit = this.fit;
    if ("hat" in how && fit) {
      object.position.y += HAT_BAND + (how.lift ?? 0);
      object.userData.fit = { r: how.hat };
      holder.add(fitHat(object, fit)!);
    } else if ("top" in how && fit) {
      object.position.y += fit.top + how.top;
      object.position.z += fit.bandZ;
      holder.add(object);
    } else {
      object.position.y += "y" in how ? how.y : 0.62;
      holder.add(object);
    }
    this.head.add(holder);
    this.held.push(holder);
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

  /** Moving parts on hats (a propeller), found once and turned every frame. */
  private spinners: THREE.Object3D[] | null = null;

  update(dt: number) {
    this.mixer.update(dt);
    if (!this.spinners) {
      this.spinners = [];
      this.model.traverse((o) => {
        if (o.userData.spin) this.spinners!.push(o);
      });
    }
    for (const o of this.spinners) o.rotation.y += dt * o.userData.spin;

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

    // Head turns toward whatever they're watching, on top of the clip's pose.
    // Some clips (Idle) never move the head, so the mixer doesn't reset it:
    // without this, each frame's turn would add to the last and the head would
    // spin. When the head is still exactly as we left it, start from the pose
    // it had before our turn.
    if (this.head) {
      if (this.turned && this.head.quaternion.equals(this.turned)) this.head.quaternion.copy(this.unturned);
      this.unturned.copy(this.head.quaternion);
      this.turned = null;
    }
    this.lookWeight = THREE.MathUtils.damp(this.lookWeight, this.lookTarget ? 1 : 0, 5, dt);
    if (this.lookTarget) this.lastLook = this.lookTarget;
    const target = this.lookTarget ?? this.lastLook;
    if (this.head && target && this.lookWeight > 0.01) {
      const headPos = this.head.getWorldPosition(new THREE.Vector3());
      const local = this.root.worldToLocal(target.clone());
      const localHead = this.root.worldToLocal(headPos);
      const dir = local.sub(localHead);
      const yaw = THREE.MathUtils.clamp(Math.atan2(dir.x, dir.z), -1.1, 1.1);
      const pitch = THREE.MathUtils.clamp(Math.atan2(dir.y, Math.hypot(dir.x, dir.z)), -0.5, 0.7);
      this.head.rotation.y += yaw * this.lookWeight * 0.8;
      this.head.rotation.x -= pitch * this.lookWeight * 0.6;
      this.turned = this.head.quaternion.clone();
    }
  }

  /** The head's pose before this frame's turn, and after it (to tell if the clip has reset it since). */
  private unturned = new THREE.Quaternion();
  /** What they last watched, so the head eases back from it instead of snapping. */
  private lastLook: THREE.Vector3 | null = null;
  private turned: THREE.Quaternion | null = null;

  dispose() {
    // Reshaped bodies own their geometry copies.
    this.model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && mesh.userData.reshaped) mesh.geometry.dispose();
    });
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
    for (const o of this.held) o.parent?.remove(o);
    this.root.removeFromParent();
  }
}

/**
 * Where the head is and how big, in the head bone's space and stage units: from
 * the bald head's rest-pose box, carried into the bone's frame by its inverse
 * bind matrix. Built hair and the skull are placed from this.
 */
function headShape(mesh: THREE.SkinnedMesh | null, k: number, geometry: THREE.BufferGeometry | null = null): HeadShape | null {
  if (!mesh) return null;
  const geo = geometry ?? mesh.geometry;
  const i = mesh.skeleton.bones.findIndex((b) => b.name === "head");
  if (i < 0) return null;
  const pos = geo.getAttribute("position");
  const index = geo.getIndex();
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  const n = index ? index.count : pos.count;
  for (let t = 0; t < n; t++) box.expandByPoint(v.fromBufferAttribute(pos, index ? index.getX(t) : t));
  const size = box.getSize(new THREE.Vector3());
  // The skull's rim sits at the brows and its top reaches the top of the head.
  const brow = Math.min(splitHead(geo).browTop, box.max.y - size.y * 0.25);
  const brow0 = Number.isFinite(brow) ? brow : box.max.y - size.y * 0.35;
  const r = Math.min(Math.min(size.x, size.z) * 0.48, box.max.y - brow0);
  const center = new THREE.Vector3((box.min.x + box.max.x) / 2, brow0, (box.min.z + box.max.z) / 2 - size.z * 0.03);
  const toBone = mesh.bindMatrix.clone().premultiply(mesh.skeleton.boneInverses[i]);
  center.applyMatrix4(toBone);
  const scale = new THREE.Vector3().setFromMatrixScale(toBone).x;
  // The whole head, ears and nose aside: a little narrower than the box.
  const mid = box.getCenter(new THREE.Vector3()).applyMatrix4(toBone);
  const u = scale / k;
  return {
    x: center.x / k,
    y: center.y / k,
    z: center.z / k,
    r: r * u,
    cy: mid.y / k,
    rx: size.x * 0.4 * u,
    ry: size.y * 0.47 * u,
    rz: size.z * 0.42 * u,
  };
}

/**
 * The face's skin color as painted: the average of the texture under the
 * face's own skin, so a bald scalp matches it exactly.
 */
function faceSkin(face: THREE.SkinnedMesh | null, geo: THREE.BufferGeometry | null): string | null {
  const map = (face?.material as THREE.MeshStandardMaterial | undefined)?.map;
  const img = map?.image as HTMLCanvasElement | undefined;
  if (!face || !map || !geo || !(img instanceof HTMLCanvasElement)) return (map?.userData.skin as string | undefined) ?? null;
  const cached = (map.userData.faceSkin as string | undefined) ?? null;
  if (cached) return cached;
  const px = img.getContext("2d")!.getImageData(0, 0, img.width, img.height).data;
  const uv = geo.getAttribute("uv");
  const index = geo.getIndex();
  let r = 0, g = 0, b = 0, n = 0;
  for (let t = 0; t < (index ? index.count : uv.count); t++) {
    const i = index ? index.getX(t) : t;
    const u = uv.getX(i);
    const v = uv.getY(i);
    if (Math.floor(u * 8) !== 0 || Math.floor(v * 4) !== 0) continue;
    const o = (Math.min(img.height - 1, Math.floor(v * img.height)) * img.width + Math.min(img.width - 1, Math.floor(u * img.width))) * 4;
    r += px[o];
    g += px[o + 1];
    b += px[o + 2];
    n++;
  }
  if (!n) return null;
  // Canvas pixels are sRGB already.
  const hex = `#${new THREE.Color().setRGB(r / n / 255, g / n / 255, b / n / 255, THREE.SRGBColorSpace).getHexString()}`;
  map.userData.faceSkin = hex;
  return hex;
}

const calmed = new WeakMap<THREE.Material, THREE.Material>();

/**
 * A plain-colored material (a hat, a backpack) toned down like the clothes;
 * textured ones (the body, already calmed) pass through. Shared per material.
 */
function calm(material: THREE.Material): THREE.Material {
  const m = material as THREE.MeshStandardMaterial;
  if (!m.isMeshStandardMaterial || m.map) return material;
  let out = calmed.get(material);
  if (!out) {
    const c = m.clone();
    c.color.set(tone(`#${m.color.getHexString()}`, { maxS: 0.5, minL: 0.1, maxL: 0.92 }));
    calmed.set(material, c);
    out = c;
  }
  return out;
}

/** The first mesh in a model whose name matches. */
function meshIn(gltf: GLTF | null, name: RegExp): THREE.SkinnedMesh | null {
  let found: THREE.SkinnedMesh | null = null;
  gltf?.scene.traverse((o) => {
    if (!found && (o as THREE.Mesh).isMesh && name.test(o.name)) found = o as THREE.SkinnedMesh;
  });
  return found;
}

/** A body's palette, recolored for this person (cached by body and colors). */
function paletteFor(gltf: GLTF, body: Body, look: Look) {
  const src = meshIn(gltf, /_(Body|Head)$/)?.material as THREE.MeshStandardMaterial | undefined;
  const img = src?.map?.image as (CanvasImageSource & { width: number; height: number }) | undefined;
  return new THREE.MeshStandardMaterial({ map: img ? recolor(img, body, look) : src?.map ?? null, roughness: 0.85, metalness: 0 });
}

/** Build one person's character. */
export async function makeActor(member: Member, look: Look): Promise<Actor> {
  // Everyone wears one clean face (the explorer's for women, the knight's for men),
  // with sculpted hair or the woodsman's beard from whichever body has them, on
  // a body dressed from the wardrobe. All the bodies share one skeleton, so any
  // part fits; the explorer's model supplies it.
  const faceFrom: Body = look.gender === "female" ? "rogue" : "knight";
  const hairFrom = SCULPTED[look.hairStyle];
  const [body, moves, faceSrc, hairSrc, beardSrc] = await Promise.all([
    loadBody("rogue"),
    loadMoves(),
    loadBody(faceFrom),
    hairFrom ? loadBody(hairFrom) : null,
    look.facialHair === "beard" ? loadBody("barbarian") : null,
  ]);
  const model = SkeletonUtils.clone(body.scene);
  const faceMaterial = paletteFor(faceSrc, faceFrom, look);
  let ownHead: THREE.SkinnedMesh | null = null;
  let ownBody: THREE.SkinnedMesh | null = null;
  model.traverse((o) => {
    const mesh = o as THREE.SkinnedMesh;
    if (!mesh.isMesh) return;
    // The costume itself isn't worn; its meshes stay only for their skeleton binding.
    mesh.visible = false;
    if (/_Head$/.test(mesh.name)) ownHead = mesh;
    if (/_Body$/.test(mesh.name)) ownBody = mesh;
  });

  // The face, then hair and beard on it.
  let head: THREE.SkinnedMesh | null = null;
  const hairMeshes: THREE.SkinnedMesh[] = [];
  let skullFrom: THREE.BufferGeometry | null = null;
  let faceSource: THREE.SkinnedMesh | null = null;
  let faceMarksOf: FaceMarks | null = null;
  const own = ownHead as THREE.SkinnedMesh | null;
  const faceMesh = meshIn(faceSrc, /_Head$/);
  if (own?.parent && faceMesh) {
    // Shaped for their head shape (and with the crown rounded off).
    const bald = splitHead(faceMesh.geometry).bald;
    const marks = faceMarks(bald, faceMesh);
    head = transplant(shapeHead(bald, faceMesh, marks, look.headShape, !hairFrom), faceMesh, own);
    skullFrom = bald;
    faceSource = faceMesh;
    faceMarksOf = marks;
    head.material = faceMaterial;
    head.name = "Face";
    own.parent.add(head);
    for (const piece of [meshIn(hairSrc, /_Head$/), meshIn(beardSrc, /_Head$/)]) {
      if (!piece) continue;
      const parts = splitHead(piece.geometry);
      const isBeard = piece === meshIn(beardSrc, /_Head$/);
      // A beard follows the jaw's shape.
      const m = transplant(isBeard ? shapeHead(parts.beard, piece, marks, look.headShape) : parts.hair, piece, own);
      m.material = faceMaterial;
      m.userData.hair = true;
      own.parent.add(m);
      hairMeshes.push(m);
    }
  }
  // The body, dressed: skin to match the face.
  const torso = ownBody as THREE.SkinnedMesh | null;
  if (torso?.parent) torso.parent.add(dress(torso, look, faceSkin(head, skullFrom) ?? look.skin));
  const actor = new Actor(model, moves.animations, member, look);
  // The head's overall proportions: the head bone carries the face, hair and
  // everything worn on it (the clips never animate scale, so this stays).
  actor.head?.scale.set(...HEAD_FORMS[look.headShape].scale);
  // Everything worn rides on a bone, in a holder sized to this model.
  const k = actor.height / 1.55;
  const onBone = (boneName: string, object: THREE.Object3D | null | undefined, tag?: string) => {
    const bone = model.getObjectByName(boneName);
    if (!bone || !object) return null;
    const holder = new THREE.Group();
    holder.scale.setScalar(k);
    if (tag) holder.userData[tag] = true;
    holder.add(object);
    object.traverse((o) => (o.castShadow = true));
    bone.add(holder);
    return holder;
  };

  // The head: a skull under the face, then hair. Measure the result so
  // everything worn on it fits this head and this hair.
  // The skull is measured on the face as sculpted (before rounding it into that skull).
  const shape = headShape(head, k, skullFrom);
  const cover: THREE.Object3D[] = [...hairMeshes];
  if (shape) {
    // The back and top of the head, fitted to the face's openings and painted
    // with the face's own skin, so the two meet in size and color.
    const fill = head && faceSource && faceMarksOf ? skullFor(head.geometry, faceSource, k, faceMarksOf) : null;
    if (fill && head) {
      // Everything built on the skull (a buzz cut, spikes, an afro) uses this one.
      const e = faceMarksOf!.skull;
      Object.assign(shape, { cy: e.y / k, rx: e.rx / k, ry: e.ry / k, rz: e.rz / k, sz: e.z / k, fill });
      const back = new THREE.Mesh(fill, head.material);
      back.name = "Skull";
      back.userData.exact = true;
      cover.push(onBone("head", back)!);
    } else {
      cover.push(onBone("head", fullSkull(shape, faceSkin(head, skullFrom) ?? look.skin))!);
    }
    if (look.hairStyle !== "bald" && look.hairStyle !== "mohawk" && look.hairStyle !== "rugged") cover.push(onBone("head", skull(shape, skullColor(look.hairStyle, look.hair, look.skin), !hairFrom))!);
    const hair = onBone("head", builtHair(look.hairStyle, look.hair, shape), "hair");
    if (hair) cover.push(hair);
  }
  let fit: HeadFit | null = null;
  if (head && actor.head) {
    const face = pointsOf([head], actor.head, k);
    fit = fitHead(face, [...face, ...pointsOf(cover.filter(Boolean), actor.head, k)]);
    actor.fit = fit;
  }
  if (fit) {
    // Stubble is the face's own jaw in a shadowy shade, so it follows the face exactly.
    const jaw = look.facialHair === "stubble" && head && faceSource && faceMarksOf ? jawOf(head.geometry, faceSource, faceMarksOf) : null;
    if (jaw && head?.parent && own) {
      const shade = new THREE.Color(faceSkin(head, skullFrom) ?? look.skin).lerp(new THREE.Color(look.hair), 0.45).multiplyScalar(0.85);
      const stubble = transplant(jaw, faceSource!, own);
      stubble.material = new THREE.MeshStandardMaterial({ color: shade, roughness: 1, metalness: 0 });
      stubble.userData.reshaped = true;
      head.parent.add(stubble);
    } else {
      onBone("head", builtFacialHair(look.facialHair, look.hair, look.skin, fit, shape!));
    }
    if (look.gender === "female") onBone("head", lashes(fit));
    onBone("head", glasses(look.glasses, fit));
    const hat = onBone("head", fitHat(headwear(look.headwear, look.outfit), fit), "headwear");
    hat?.traverse((o) => (o.castShadow = true));
  }
  const width = BUILD_WIDTH[look.build].torso;
  const extras = extraPieces(look.extra, look.outfit, width, fit);
  onBone("head", extras.head);
  onBone("chest", extras.chest);
  onBone("lowerarml", extras.arm);
  // Gear goes against the dressed torso, measured in the chest bone's space.
  const t = torsoOf(look);
  const chestY = model.getObjectByName("chest")?.getWorldPosition(new THREE.Vector3()).y ?? 0.97;
  const kit = gear(look.gear, look.outfit, { front: t.front / k, back: t.back / k, side: t.side / k, hip: t.hip / k, shoulder: (t.shoulderY - chestY) / k });
  if (kit) onBone(kit.bone, kit.object);
  // Hats, gear, jewelry and built hair in the same calm palette as the clothes.
  model.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && !mesh.userData.exact) mesh.material = calm(mesh.material as THREE.Material);
  });
  return actor;
}
