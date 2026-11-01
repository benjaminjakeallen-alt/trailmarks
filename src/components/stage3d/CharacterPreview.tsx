"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { makeActor, type Actor } from "@/components/stage3d/cast";
import type { Look } from "@/lib/look";
import type { Member } from "@/lib/types";

/**
 * One character on a little round plinth, turning slowly. Every change of look
 * swaps the model in place and gets a cheer, so you can see it's you now.
 */
export default function CharacterPreview({
  member,
  look,
  size = 240,
  facing = 0,
}: {
  member: Member;
  look: Look;
  size?: number;
  /** Starting turn, in radians (π shows their back). */
  facing?: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<{ scene: THREE.Scene; stand: THREE.Group; actor: Actor | null; dispose: () => void } | null>(null);

  useEffect(() => {
    if (!canvas.current) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas.current, antialias: true, alpha: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size, false);
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.NeutralToneMapping;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 1.45, 4.6);
    camera.lookAt(0, 0.8, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb9c8cc, 1.9));
    const sun = new THREE.DirectionalLight(0xfff3e2, 2.4);
    sun.position.set(-2, 4, 3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(512, 512);
    scene.add(sun);
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.0, 0.16, 40),
      new THREE.MeshStandardMaterial({ color: "#8fb0ad", roughness: 0.9 }),
    );
    plinth.position.y = -0.08;
    plinth.receiveShadow = true;
    scene.add(plinth);
    const stand = new THREE.Group();
    scene.add(stand);

    // Drag to spin; let go and it drifts back to a gentle sway.
    let spin = facing;
    let dragging = false;
    let lastX = 0;
    const el = canvas.current;
    const down = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      spin += (e.clientX - lastX) * 0.012;
      lastX = e.clientX;
    };
    const up = () => (dragging = false);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);

    let last = 0;
    renderer.setAnimationLoop((now) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      if (!dragging) spin = facing + (spin - facing) * Math.max(0, 1 - dt * 1.5);
      stand.rotation.y = Math.sin(now / 2600) * 0.6 + spin;
      world.current?.actor?.update(dt);
      renderer.render(scene, camera);
    });
    world.current = {
      scene,
      stand,
      actor: null,
      dispose: () => {
        el.removeEventListener("pointerdown", down);
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", up);
        el.removeEventListener("pointercancel", up);
        renderer.setAnimationLoop(null);
        world.current?.actor?.dispose();
        plinth.geometry.dispose();
        (plinth.material as THREE.Material).dispose();
        renderer.dispose();
      },
    };
    return () => {
      world.current?.dispose();
      world.current = null;
    };
  }, [size, facing]);

  // A new look: build it, swap it in, cheer.
  useEffect(() => {
    let cancelled = false;
    const clock = { alive: true, wait: (s: number) => new Promise<void>((r) => setTimeout(r, s * 1000)) };
    void makeActor(member, look)
      .then((actor) => {
        const w = world.current;
        if (cancelled || !w) return actor.dispose();
        w.actor?.dispose();
        actor.unitScale = (1.7 * actor.sizeScale) / actor.height;
        actor.root.scale.setScalar(actor.unitScale);
        w.stand.add(actor.root);
        w.actor = actor;
        actor.play("Idle", { fade: 0 });
        actor.bounce(1);
        void actor.once(clock, "Cheer", "Idle");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      clock.alive = false;
    };
  }, [member, look]);

  return (
    <canvas
      ref={canvas}
      width={size}
      height={size}
      className="cursor-grab touch-pan-y active:cursor-grabbing"
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}
