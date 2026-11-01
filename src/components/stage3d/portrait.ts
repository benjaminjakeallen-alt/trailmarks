import * as THREE from "three";
import { makeActor } from "@/components/stage3d/cast";
import { tone, type Look } from "@/lib/look";
import type { Member } from "@/lib/types";

const SIZE = 512;

/**
 * A head-and-shoulders snapshot of someone's character on a soft disc in their
 * outfit color: their avatar everywhere in the app. Rendered in the browser.
 */
export async function renderPortrait(member: Member, look: Look): Promise<Blob> {
  const actor = await makeActor(member, look);
  const gl = document.createElement("canvas");
  gl.width = gl.height = SIZE;
  const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true, alpha: true, preserveDrawingBuffer: true });
  try {
    renderer.setSize(SIZE, SIZE, false);
    renderer.toneMapping = THREE.NeutralToneMapping;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb9c8cc, 2.1));
    const sun = new THREE.DirectionalLight(0xfff3e2, 2.2);
    sun.position.set(-1.5, 3, 4);
    scene.add(sun);

    actor.unitScale = 1.7 / actor.height;
    actor.root.scale.setScalar(actor.unitScale);
    scene.add(actor.root);
    // Settle into a friendly idle pose.
    actor.play("Idle", { fade: 0 });
    actor.update(0.6);
    actor.root.updateMatrixWorld(true);

    const head = actor.head?.getWorldPosition(new THREE.Vector3()) ?? new THREE.Vector3(0, 1.1, 0);
    const center = head.clone().add(new THREE.Vector3(0, 0.27, 0));
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
    camera.position.set(center.x + 0.35, center.y + 0.12, center.z + 2.5);
    camera.lookAt(center.x, center.y - 0.05, center.z);
    actor.root.rotation.y = 0.18;
    actor.root.updateMatrixWorld(true);
    renderer.render(scene, camera);

    // Their character over a soft disc of their outfit color.
    const out = document.createElement("canvas");
    out.width = out.height = SIZE;
    const ctx = out.getContext("2d")!;
    const tint = new THREE.Color(tone(look.outfit)).lerp(new THREE.Color("#ffffff"), 0.72);
    const deep = new THREE.Color(tone(look.outfit)).lerp(new THREE.Color("#ffffff"), 0.45);
    const g = ctx.createRadialGradient(SIZE / 2, SIZE * 0.42, SIZE * 0.05, SIZE / 2, SIZE / 2, SIZE * 0.72);
    g.addColorStop(0, `#${tint.getHexString()}`);
    g.addColorStop(1, `#${deep.getHexString()}`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.drawImage(gl, 0, 0);
    return await new Promise<Blob>((resolve, reject) =>
      out.toBlob((b) => (b ? resolve(b) : reject(new Error("No portrait"))), "image/png"),
    );
  } finally {
    actor.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }
}
