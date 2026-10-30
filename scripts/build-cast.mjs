/**
 * Builds the 3D cast for the lifted-state scenes from KayKit's CC0 packs
 * (Kay Lousberg, kaylousberg.com):
 *
 *   public/3d/body-{rogue,barbarian,knight,mage}.glb  rigged bodies, no animations
 *   public/3d/moves.glb                               the shared animation set
 *   public/3d/props.glb                               props, one named node each
 *
 * Every body shares one skeleton, so one clip set drives them all.
 *
 *   git clone --depth 1 https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0 $KAYKIT/Adventurers
 *   (and City-Builder-Bits, Restaurant-Bits, Furniture-Bits, Space-Base-Bits, each -1.0, the same way)
 *   KAYKIT=/path/to/clones node scripts/build-cast.mjs
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, mergeDocuments, meshopt, prune, resample, unpartition } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

const ROOT = process.env.KAYKIT;
if (!ROOT) throw new Error("Set KAYKIT to the folder holding the cloned KayKit packs.");
const OUT = path.resolve("public/3d");
mkdirSync(OUT, { recursive: true });

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

const CHARS = `${ROOT}/Adventurers/addons/kaykit_character_pack_adventures/Characters/gltf`;
const pack = (name, dir) => `${ROOT}/${name}/addons/${dir}/Assets/gltf`;

/** Only what the scenes use; the pack has 76. */
const CLIPS = [
  "Idle", "Unarmed_Idle", "Walking_A", "Walking_B", "Walking_C", "Walking_Backwards", "Running_A", "Running_B",
  "Cheer", "Jump_Full_Short", "Jump_Full_Long", "Jump_Idle",
  "Sit_Chair_Down", "Sit_Chair_Idle", "Sit_Chair_StandUp", "Sit_Floor_Down", "Sit_Floor_Idle", "Sit_Floor_StandUp",
  "Lie_Down", "Lie_Idle", "Lie_StandUp", "PickUp", "Interact", "Use_Item", "Throw",
  "Hit_A", "Dodge_Left", "Dodge_Right", "Spellcasting", "Spellcast_Raise", "Spellcast_Shoot", "Block",
  "1H_Melee_Attack_Chop", "2H_Melee_Idle", "Unarmed_Melee_Attack_Punch_A", "Death_A",
];

/** Hand props the bodies ship with; scenes bring their own. */
const KEEP_BODY_PARTS = /_(Head|Body|ArmLeft|ArmRight|LegLeft|LegRight|Hat|Helmet|Cape)$|^Mug$/;

/**
 * Disposing an animation leaves its samplers holding their keyframe data; drop those too.
 * (Clips share time accessors, so prune() decides which accessors are really unused.)
 */
const dropAnimation = (anim) => {
  for (const channel of anim.listChannels()) channel.dispose();
  for (const sampler of anim.listSamplers()) sampler.dispose();
  anim.dispose();
};

/** One buffer per file: merged packs arrive with one each. */
const oneBuffer = (doc) => {
  const [keep, ...rest] = doc.getRoot().listBuffers();
  for (const acc of doc.getRoot().listAccessors()) acc.setBuffer(keep);
  for (const b of rest) b.dispose();
};

const finish = async (doc, file) => {
  oneBuffer(doc);
  await doc.transform(prune({ keepLeaves: true }), dedup(), resample(), unpartition(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
  await io.write(path.join(OUT, file), doc);
  console.log("wrote", file);
};

// Bodies: the mesh and skeleton, nothing that moves on its own.
for (const body of ["Rogue", "Barbarian", "Knight", "Mage"]) {
  const doc = await io.read(`${CHARS}/${body}.glb`);
  const root = doc.getRoot();
  for (const anim of root.listAnimations()) dropAnimation(anim);
  for (const node of root.listNodes()) {
    if (node.getMesh() && !KEEP_BODY_PARTS.test(node.getName())) node.dispose();
  }
  await finish(doc, `body-${body.toLowerCase()}.glb`);
}

// Moves: the skeleton and the clips that drive it.
{
  const doc = await io.read(`${CHARS}/Rogue.glb`);
  const root = doc.getRoot();
  for (const anim of root.listAnimations()) if (!CLIPS.includes(anim.getName())) dropAnimation(anim);
  for (const node of root.listNodes()) if (node.getMesh()) node.setMesh(null);
  for (const skin of root.listSkins()) skin.dispose();
  for (const mesh of root.listMeshes()) mesh.dispose();
  // IK targets and foot-roll controls are baked into the deform bones already; their own tracks only cost bytes.
  for (const anim of root.listAnimations()) {
    for (const channel of anim.listChannels()) {
      const name = channel.getTargetNode()?.getName() ?? "";
      if (/IK|control-|^root$/.test(name) || channel.getTargetPath() === "scale") {
        const sampler = channel.getSampler();
        channel.dispose();
        if (sampler && !anim.listChannels().some((c) => c.getSampler() === sampler)) sampler.dispose();
      }
    }
  }
  const missing = CLIPS.filter((c) => !root.listAnimations().some((a) => a.getName() === c));
  if (missing.length) throw new Error(`Missing clips: ${missing.join(", ")}`);
  await finish(doc, "moves.glb");
}

// Props: one node per prop, named after it, at the scene root.
{
  const PROPS = {
    [pack("Restaurant-Bits", "kaykit_restaurant_bits")]: [
      "chair_A", "table_round_A", "crate", "crate_potatoes", "food_ingredient_potato", "food_ingredient_steak",
      "plate", "pot_A", "food_burger",
    ],
    [pack("City-Builder-Bits", "kaykit_city_builder_bits")]: [
      "bench", "car_police", "car_taxi", "streetlight", "bush", "building_B", "firehydrant",
    ],
    [pack("Furniture-Bits", "kaykit_furniture_bits")]: [
      "cactus_medium_A", "cactus_medium_B", "cactus_small_A", "armchair", "chair_stool_wood",
    ],
    [pack("Space-Base-Bits", "kaykit_space_base_bits")]: ["rock_A", "rock_B", "rocks_A", "terrain_tall", "terrain_low"],
  };
  const doc = new Document();
  const scene = doc.createScene("props");
  for (const [dir, names] of Object.entries(PROPS)) {
    for (const name of names) {
      const src = await io.read(`${dir}/${name}.gltf`);
      const map = mergeDocuments(doc, src);
      const holder = doc.createNode(name);
      for (const s of src.getRoot().listScenes()) {
        for (const child of s.listChildren()) holder.addChild(map.get(child));
      }
      scene.addChild(holder);
    }
  }
  for (const s of doc.getRoot().listScenes()) if (s !== scene) s.dispose();
  doc.getRoot().setDefaultScene(scene);
  // The mug the barbarian carries makes a good root beer / soda stand-in.
  {
    const src = await io.read(`${CHARS}/Barbarian.glb`);
    for (const anim of src.getRoot().listAnimations()) dropAnimation(anim);
    const map = mergeDocuments(doc, src);
    const mug = src.getRoot().listNodes().find((n) => n.getName() === "Mug");
    const copy = map.get(mug);
    copy.setTranslation([0, 0, 0]).setRotation([0, 0, 0, 1]).setScale([1, 1, 1]);
    for (const p of doc.getRoot().listNodes()) if (p.listChildren().includes(copy)) p.removeChild(copy);
    copy.setSkin(null);
    scene.addChild(copy);
    for (const s of doc.getRoot().listScenes()) if (s !== scene) s.dispose();
  }
  await finish(doc, "props.glb");
}
