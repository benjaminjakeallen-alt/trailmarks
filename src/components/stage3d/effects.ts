import * as THREE from "three";
import { tone } from "@/lib/look";

/**
 * Soft round particles for fireworks, smoke, steam, sparkles and confetti —
 * one Points object, a few hundred slots reused round-robin. Positions are in
 * stage units (the floor's space), so effects scale with the characters.
 */

const MAX = 600;

interface Particle {
  life: number;
  age: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  gravity: number;
  drag: number;
  size0: number;
  size1: number;
  color: THREE.Color;
  /** 0 = additive glow (sparks), 1 = soft solid (smoke, confetti). */
  solid: number;
  wobble: number;
}

const VERT = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  attribute float aSolid;
  varying float vAlpha;
  varying vec3 vColor;
  varying float vSolid;
  uniform float uScale;
  void main() {
    vAlpha = aAlpha;
    vColor = aColor;
    vSolid = aSolid;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;
  varying float vSolid;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p);
    if (d > 0.5) discard;
    float glow = smoothstep(0.5, 0.0, d);
    float disc = smoothstep(0.5, 0.38, d);
    float a = mix(glow * glow, disc, vSolid) * vAlpha;
    vec3 c = mix(vColor * (0.6 + glow), vColor, vSolid);
    gl_FragColor = vec4(c, a);
    #include <colorspace_fragment>
  }
`;

export class Effects {
  readonly points: THREE.Points;
  private parts: Particle[] = [];
  private next = 0;
  private geo: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;

  constructor() {
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX * 3), 3));
    this.geo.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(MAX), 1));
    this.geo.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(MAX), 1));
    this.geo.setAttribute("aColor", new THREE.BufferAttribute(new Float32Array(MAX * 3), 3));
    this.geo.setAttribute("aSolid", new THREE.BufferAttribute(new Float32Array(MAX), 1));
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uScale: { value: 300 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    this.points = new THREE.Points(this.geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    for (let i = 0; i < MAX; i++) {
      this.parts.push({
        life: 0, age: 1, pos: new THREE.Vector3(), vel: new THREE.Vector3(), gravity: 0, drag: 0,
        size0: 0, size1: 0, color: new THREE.Color(), solid: 0, wobble: 0,
      });
    }
  }

  /** Pixel size per stage unit at distance 1; the stage sets this from its scale. */
  setScale(pxPerUnitAtDepth: number) {
    this.material.uniforms.uScale.value = pxPerUnitAtDepth;
  }

  emit(p: {
    at: THREE.Vector3Like;
    vel?: THREE.Vector3Like;
    life: number;
    size: number;
    endSize?: number;
    color: THREE.ColorRepresentation;
    gravity?: number;
    drag?: number;
    solid?: boolean;
    wobble?: number;
  }) {
    const q = this.parts[this.next];
    this.next = (this.next + 1) % MAX;
    q.life = p.life;
    q.age = 0;
    q.pos.set(p.at.x, p.at.y, p.at.z);
    q.vel.set(p.vel?.x ?? 0, p.vel?.y ?? 0, p.vel?.z ?? 0);
    q.gravity = p.gravity ?? 0;
    q.drag = p.drag ?? 0;
    q.size0 = p.size;
    q.size1 = p.endSize ?? p.size;
    // Bright but not neon, like everything else on stage.
    q.color.set(tone(`#${new THREE.Color(p.color).getHexString()}`, { maxS: 0.62, minL: 0.2, maxL: 0.95 }));
    q.solid = p.solid ? 1 : 0;
    q.wobble = p.wobble ?? 0;
  }

  /** A firework: a rising streak that bursts into a sphere of sparks. */
  firework(at: THREE.Vector3Like, color: THREE.ColorRepresentation, scale = 1) {
    const c = new THREE.Color(color);
    const n = 46;
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const speed = (1.6 + Math.random() * 0.5) * scale;
      this.emit({
        at,
        vel: { x: r * Math.cos(t) * speed, y: u * speed + 0.4, z: r * Math.sin(t) * speed },
        life: 1.1 + Math.random() * 0.5,
        size: 0.22 * scale,
        endSize: 0.05,
        color: i % 7 === 0 ? "#fff6d8" : c,
        gravity: -1.1,
        drag: 1.6,
      });
    }
    this.emit({ at, life: 0.35, size: 1.6 * scale, endSize: 0.2, color: "#fff2c8" });
  }

  /** The streak that carries a firework up. */
  rocket(from: THREE.Vector3Like, height: number, color: THREE.ColorRepresentation) {
    for (let i = 0; i < 10; i++) {
      this.emit({
        at: { x: from.x, y: from.y + (height * i) / 10, z: from.z },
        vel: { x: 0, y: 0.3, z: 0 },
        life: 0.2 + i * 0.04,
        size: 0.12,
        endSize: 0.02,
        color,
      });
    }
  }

  smoke(at: THREE.Vector3Like, { color = "#d8d4cf", size = 0.35, rise = 0.55 }: { color?: string; size?: number; rise?: number } = {}) {
    this.emit({
      at: { x: at.x + (Math.random() - 0.5) * 0.08, y: at.y, z: at.z + (Math.random() - 0.5) * 0.08 },
      vel: { x: (Math.random() - 0.5) * 0.12, y: rise, z: (Math.random() - 0.5) * 0.12 },
      life: 1.8 + Math.random() * 0.6,
      size,
      endSize: size * 2.6,
      color,
      solid: true,
      drag: 0.4,
      wobble: 0.25,
    });
  }

  sparkle(at: THREE.Vector3Like, color: THREE.ColorRepresentation = "#ffe58a", spread = 0.6) {
    for (let i = 0; i < 8; i++) {
      this.emit({
        at: { x: at.x + (Math.random() - 0.5) * spread, y: at.y + Math.random() * spread, z: at.z + (Math.random() - 0.5) * spread },
        vel: { x: 0, y: 0.25 + Math.random() * 0.3, z: 0 },
        life: 0.7 + Math.random() * 0.5,
        size: 0.22,
        endSize: 0,
        color,
      });
    }
  }

  confetti(at: THREE.Vector3Like, colors: string[], n = 30) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 0.8 + Math.random() * 1.2;
      this.emit({
        at,
        vel: { x: Math.cos(a) * s, y: 2.2 + Math.random() * 1.5, z: Math.sin(a) * s },
        life: 1.6 + Math.random(),
        size: 0.12,
        color: colors[i % colors.length],
        gravity: -3.2,
        drag: 1.2,
        solid: true,
        wobble: 0.6,
      });
    }
  }

  /** A puff of dust where someone lands or pops in. */
  dust(at: THREE.Vector3Like, color = "#efe9df") {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      this.emit({
        at: { x: at.x, y: at.y + 0.05, z: at.z },
        vel: { x: Math.cos(a) * 0.9, y: 0.25, z: Math.sin(a) * 0.9 },
        life: 0.55,
        size: 0.24,
        endSize: 0.05,
        color,
        solid: true,
        drag: 4,
      });
    }
  }

  update(dt: number, time: number) {
    const pos = this.geo.getAttribute("position") as THREE.BufferAttribute;
    const size = this.geo.getAttribute("aSize") as THREE.BufferAttribute;
    const alpha = this.geo.getAttribute("aAlpha") as THREE.BufferAttribute;
    const col = this.geo.getAttribute("aColor") as THREE.BufferAttribute;
    const solid = this.geo.getAttribute("aSolid") as THREE.BufferAttribute;
    for (let i = 0; i < MAX; i++) {
      const q = this.parts[i];
      if (q.age >= q.life) {
        alpha.setX(i, 0);
        continue;
      }
      q.age += dt;
      const k = Math.min(1, q.age / q.life);
      q.vel.y += q.gravity * dt;
      q.vel.multiplyScalar(Math.max(0, 1 - q.drag * dt));
      q.pos.addScaledVector(q.vel, dt);
      const wob = q.wobble ? Math.sin(time * 5 + i) * q.wobble * dt : 0;
      pos.setXYZ(i, q.pos.x + wob, q.pos.y, q.pos.z);
      size.setX(i, q.size0 + (q.size1 - q.size0) * k);
      alpha.setX(i, k < 0.1 ? k / 0.1 : 1 - Math.max(0, (k - 0.55) / 0.45));
      col.setXYZ(i, q.color.r, q.color.g, q.color.b);
      solid.setX(i, q.solid);
    }
    pos.needsUpdate = size.needsUpdate = alpha.needsUpdate = col.needsUpdate = solid.needsUpdate = true;
  }

  dispose() {
    this.geo.dispose();
    this.material.dispose();
  }
}
