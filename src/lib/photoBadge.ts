/**
 * The no-AI adventurer: turns a square selfie crop into a comic-style badge
 * in the browser (posterized color + inked edges), wearing an explorer hat
 * in the person's color. Always available, instant, and nothing leaves the
 * device until they save it.
 */

export const BADGE_SIZE = 512;
const LEVELS = 6;

/** Explorer hat, drawn in a 512 box: crown, band, brim. Also used as the crop guide. */
export const HAT = {
  crown: "M150 150 C158 70 204 36 256 36 C308 36 354 70 362 150 Z",
  band: "M146 132 C200 146 312 146 366 132 L370 160 C312 176 200 176 142 160 Z",
  brim: "M40 176 C70 140 170 150 256 150 C342 150 442 140 472 176 C444 204 356 196 256 196 C156 196 68 204 40 176 Z",
  dent: "M214 64 C236 84 276 84 298 64",
};

function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amount * 255)));
  return `rgb(${c((n >> 16) & 255)} ${c((n >> 8) & 255)} ${c(n & 255)})`;
}

function toon(source: CanvasImageSource, size: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.filter = "blur(1.2px) saturate(1.35) contrast(1.12) brightness(1.04)";
  ctx.drawImage(source, 0, 0, size, size);
  ctx.filter = "none";

  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const lum = new Float32Array(size * size);
  for (let i = 0; i < lum.length; i++) lum[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];

  const step = 255 / (LEVELS - 1);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      // Sobel edge strength on luminance: strong edges become ink.
      let edge = 0;
      if (x > 0 && y > 0 && x < size - 1 && y < size - 1) {
        const l = (dx: number, dy: number) => lum[(y + dy) * size + (x + dx)];
        const gx = -l(-1, -1) - 2 * l(-1, 0) - l(-1, 1) + l(1, -1) + 2 * l(1, 0) + l(1, 1);
        const gy = -l(-1, -1) - 2 * l(0, -1) - l(1, -1) + l(-1, 1) + 2 * l(0, 1) + l(1, 1);
        edge = Math.hypot(gx, gy);
      }
      const ink = edge > 150 ? 0.3 : edge > 95 ? 0.62 : 1;
      for (let c = 0; c < 3; c++) {
        const v = Math.round(d[i * 4 + c] / step) * step;
        d[i * 4 + c] = v * ink;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

export async function makePhotoBadge(crop: HTMLCanvasElement, color: string): Promise<Blob> {
  const S = BADGE_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext("2d")!;
  const r = S / 2;

  // Color disc, white ring, then the toon photo inside.
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(r, r, r - 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(r, r, r - 28, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(toon(crop, S), 0, 0, S, S);
  ctx.restore();

  // The hat, in the person's color with a darker band, and an ink outline.
  ctx.lineJoin = "round";
  ctx.lineWidth = 10;
  ctx.strokeStyle = "#10262a";
  const draw = (d: string, fill: string, stroke = true) => {
    const p = new Path2D(d);
    if (stroke) ctx.stroke(p);
    ctx.fillStyle = fill;
    ctx.fill(p);
  };
  draw(HAT.crown, "#d9b77e");
  draw(HAT.band, shade(color, -0.12));
  draw(HAT.brim, "#c9a266");
  ctx.lineWidth = 7;
  ctx.strokeStyle = "rgb(16 38 42 / 0.45)";
  ctx.stroke(new Path2D(HAT.dent));

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't draw the badge"))), "image/png"),
  );
}
